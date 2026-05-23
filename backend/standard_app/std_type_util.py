"""标准类型展示：统一为字母代号（GB/HB/DB 等）。"""

_CODE_BY_SCOPE_NO = {
    '00': 'GB',
    '01': 'HB',
    '02': 'DB',
    '03': 'TB',
}

_CN_ALIASES = {
    '国标': 'GB',
    '国家标准': 'GB',
    '行标': 'HB',
    '行业标准': 'HB',
    '地标': 'DB',
    '地方标准': 'DB',
    '团标': 'TB',
    '团体标准': 'TB',
    '国际标准': 'ISO',
    '国际电工标准': 'IEC',
    '电气电子标准': 'IEEE',
}

_LETTER_CODES = frozenset({'GB', 'HB', 'DB', 'TB', 'ISO', 'IEC', 'IEEE'})


def normalize_std_type_code(value=None, std_type_no=None):
    """
    将库内 std_type（可能为「国标」等中文）归一为字母代号。
    std_type_no 优先（00/01/02/03）。
    """
    no = (std_type_no or '').strip()
    if no in _CODE_BY_SCOPE_NO:
        return _CODE_BY_SCOPE_NO[no]

    s = (value or '').strip()
    if not s:
        return ''

    upper = s.upper()
    if upper in _LETTER_CODES:
        return upper
    if s in _CN_ALIASES:
        return _CN_ALIASES[s]
    if upper in _CODE_BY_SCOPE_NO:
        return _CODE_BY_SCOPE_NO[upper]

    return upper
