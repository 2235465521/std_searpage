import os
import re
import glob
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

from django.conf import settings

# 标准类别 -> 共享盘子目录（相对于 SHARED_DISK_DIR）
DEFAULT_TYPE_FOLDERS = {
    'GB': ['word的国标', '待处理'],
    'DB': ['word的地标'],
    'HB': ['word的行标'],
    'TB': ['word的行标', '食品安全标准word版'],
    'ISO': ['待处理', 'word的国标'],
    'IEC': ['待处理', 'word的国标'],
    'IEEE': ['待处理', 'word的国标'],
}

PDF_EXTENSIONS = ('.pdf',)
WORD_EXTENSIONS = ('.docx', '.doc')
FILE_EXTENSIONS = PDF_EXTENSIONS + WORD_EXTENSIONS


def _normalize_std_id(std_id_str):
    return (std_id_str or '').strip()


def _infer_std_type(std_id_str):
    """从标准号推断类别（用于选择子文件夹）。"""
    raw = _normalize_std_id(std_id_str).upper()
    if not raw:
        return None
    for prefix in ('ISO', 'IEC', 'IEEE'):
        if raw.startswith(prefix):
            return prefix
    if raw.startswith('DB'):
        return 'DB'
    if raw.startswith('GB'):
        return 'GB'
    # 行标常见代号：DL/T、JB/T、HG/T 等
    if re.match(r'^[A-Z]{1,4}(/[A-Z])?\s', raw) or re.match(r'^[A-Z]{2,4}\d', raw.replace(' ', '')):
        return 'HB'
    return None


def _category_folders(std_id_str):
    """返回应搜索的分类子目录名列表。"""
    custom_map = getattr(settings, 'SHARED_DISK_TYPE_FOLDERS', None) or DEFAULT_TYPE_FOLDERS
    std_type = _infer_std_type(std_id_str)
    if std_type and std_type in custom_map:
        return custom_map[std_type]
    # 未知类型：搜索所有已配置目录
    seen = []
    for folders in custom_map.values():
        for f in folders:
            if f not in seen:
                seen.append(f)
    return seen


def _filename_prefixes(std_id_str):
    """生成与磁盘文件名匹配的前缀（文件多为「标准号_F_标题」或「分类号_GBT ...」）。"""
    raw = _normalize_std_id(std_id_str)
    if not raw:
        return []

    variants = [
        raw.replace('/', ' '),           # GB/T 1.1 -> GB T 1.1（磁盘常见）
        raw.replace('/', ''),            # GBT1.1
        re.sub(r'[\s/]+', ' ', raw).strip(),  # 规整空格
        raw.replace('/', '').replace(' ', ''),  # GBT11
        raw.replace(' ', '_'),
        re.sub(r'[\s/]+', '_', raw),
        raw,
    ]
    # 国标文件常无斜杠：GBT 1.1-2020
    if '/' in raw:
        no_slash = raw.replace('/', '').replace('  ', ' ')
        variants.append(no_slash)
        if ' ' in no_slash:
            variants.append(no_slash.replace(' ', '', 1) if no_slash.startswith('GB') else no_slash)

    prefixes = []
    seen = set()
    for v in variants:
        v = v.strip()
        if len(v) >= 3 and v not in seen:
            seen.add(v)
            prefixes.append(v)
    return prefixes


def _glob_prefixes_for_path(prefix):
    """glob 路径中不能含 /，否则会被当成子目录（GB/T 会去找 GB 文件夹）。"""
    candidates = {prefix, prefix.replace('/', ' '), prefix.replace('/', '')}
    return [p for p in candidates if p and '/' not in p and len(p) >= 3]


def _glob_find_in_dir(search_dir, prefixes, allow_contains_match=False, extensions=FILE_EXTENSIONS):
    """在指定目录下递归匹配指定扩展名的文件。"""
    if not os.path.isdir(search_dir):
        return None

    for prefix in prefixes:
        for glob_prefix in _glob_prefixes_for_path(prefix):
            safe = re.sub(r'([\[\]*?])', r'[\1]', glob_prefix)
            for ext in extensions:
                patterns = [os.path.join(search_dir, '**', f'{safe}*{ext}')]
                # 待处理等目录：01.020_GBT 13725-2019_F_... 需中间匹配
                if allow_contains_match:
                    patterns.append(os.path.join(search_dir, '**', f'*{safe}*{ext}'))

                for pattern in patterns:
                    try:
                        matches = glob.glob(pattern, recursive=True)
                    except OSError:
                        continue
                    if matches:
                        return matches[0]
    return None


def check_standard_file_available(std_id_str, timeout_sec=3.0):
    """
    检测共享盘是否有源文件（带超时，避免详情接口长时间阻塞）。
    返回 True=有文件, False=无文件, None=检测超时（可尝试下载）。
    """
    if not std_id_str:
        return False

    def _lookup():
        path = get_standard_file_path(std_id_str)
        return bool(path and os.path.isfile(path))

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_lookup).result(timeout=timeout_sec)
    except FuturesTimeoutError:
        return None


def get_standard_file_path(std_id_str):
    """
    在 Z:\\磁盘阵列\\标准文件处理 及其分类子目录中定位标准源文件。
    """
    root_dir = getattr(
        settings,
        'SHARED_DISK_DIR',
        r'Z:\磁盘阵列\标准文件处理',
    )
    if not root_dir:
        return None

    root_dir = os.path.normpath(root_dir)
    os.makedirs(root_dir, exist_ok=True)

    prefixes = _filename_prefixes(std_id_str)
    if not prefixes:
        return None

    folders = _category_folders(std_id_str)
    for folder_name in folders:
        os.makedirs(os.path.join(root_dir, folder_name), exist_ok=True)

    # 1. 先找 PDF，再找 Word（有 pdf 优先下 pdf）
    for extensions in (PDF_EXTENSIONS, WORD_EXTENSIONS):
        for folder_name in folders:
            search_dir = os.path.join(root_dir, folder_name)
            allow_contains = folder_name == '待处理'
            found = _glob_find_in_dir(
                search_dir, prefixes,
                allow_contains_match=allow_contains,
                extensions=extensions,
            )
            if found:
                return found

    # 2. 在整个根目录下兜底查找（深度受限的 walk）
    if getattr(settings, 'SHARED_DISK_DEEP_SEARCH', False):
        found = _deep_search_file(root_dir, std_id_str, extensions=PDF_EXTENSIONS)
        if found:
            return found
        return _deep_search_file(root_dir, std_id_str, extensions=WORD_EXTENSIONS)

    return None


def _deep_search_file(root_dir, std_id_str, max_walk_files=80000, extensions=FILE_EXTENSIONS):
    """递归兜底（目录极大时慎用）。"""
    prefixes = [p.upper() for p in _filename_prefixes(std_id_str)]
    checked = 0
    for dirpath, _, files in os.walk(root_dir):
        for name in files:
            checked += 1
            if checked > max_walk_files:
                return None
            lower = name.lower()
            if not lower.endswith(extensions):
                continue
            upper_name = name.upper()
            for prefix in prefixes:
                if upper_name.startswith(prefix):
                    return os.path.join(dirpath, name)
    return None
