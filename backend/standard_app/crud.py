from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from .models import (
    StdBase, StdGbDetail, StdHbDetail, StdDbDetail, StdTbDetail,
    StdPedigree, StdReplace, ViewStdFull
)
from .std_type_util import normalize_std_type_code

# 国际标准类：数据在 std_base 中，view_std_full 宽表可能未覆盖
INTL_STD_TYPES = frozenset({'ISO', 'IEC', 'IEEE'})

_DETAIL_MODEL_BY_CODE = {
    'GB': StdGbDetail,
    'HB': StdHbDetail,
    'DB': StdDbDetail,
    'TB': StdTbDetail,
}

SEARCH_LIST_FIELDS = (
    'id', 'std_id', 'std_type', 'std_type_no', 'std_chinesename',
    'std_englishname', 'release_date', 'implement_date', 'ex_state', 'create_time',
)


def build_std_type_filter(std_type):
    """按标准类别构建查询条件（含 ISO / IEC / IEEE）。"""
    if not std_type:
        return Q()
    if std_type == 'IEEE':
        return (
            Q(std_type='IEEE')
            | Q(std_id__istartswith='IEEE')
            | Q(std_id__icontains='IEEE')
        )
    return Q(std_type=std_type)

def get_standard_base_by_std_id(std_id_str):
    """根据标准号精确获取基础信息"""
    try:
        return StdBase.objects.get(std_id=std_id_str)
    except StdBase.DoesNotExist:
        return None

def get_standard_base_by_pk(pk):
    """根据主键获取基础信息"""
    try:
        return StdBase.objects.get(id=pk)
    except StdBase.DoesNotExist:
        return None

def get_standard_detail(base_obj):
    """根据基础对象及其类型，获取对应的详细信息"""
    if not base_obj:
        return None

    code = normalize_std_type_code(base_obj.std_type, base_obj.std_type_no)
    model = _DETAIL_MODEL_BY_CODE.get(code)
    if not model:
        return None
    try:
        return model.objects.get(base=base_obj)
    except ObjectDoesNotExist:
        return None

def get_pedigree_list(base_id):
    """获取标准的谱系信息"""
    return StdPedigree.objects.filter(base_id=base_id)

def get_replace_history(base_id):
    """获取标准的替代历史"""
    return StdReplace.objects.filter(base_id=base_id)

def get_view_std_full_by_id(std_id_str):
    """从宽表中精确获取单个标准宽表视图"""
    try:
        return ViewStdFull.objects.get(std_id=std_id_str)
    except ViewStdFull.DoesNotExist:
        return None

def search_standards_in_db(keyword=None, std_type=None, ex_state=None, limit=20, offset=0, need_total=True):
    """
    纯数据库级的搜索（主要作为ES的降级备用方案）。
    ISO / IEC / IEEE 走 std_base，其余走 view_std_full。
    need_total=False 时跳过 count()，翻页可显著加速（total 返回 -1）。
    返回 (total_count, queryset_slice)
    """
    if std_type in INTL_STD_TYPES:
        qs = StdBase.objects.all()
    else:
        qs = ViewStdFull.objects.all()

    if keyword:
        qs = qs.filter(
            Q(std_id__icontains=keyword)
            | Q(std_chinesename__icontains=keyword)
            | Q(std_englishname__icontains=keyword)
        )

    if std_type:
        qs = qs.filter(build_std_type_filter(std_type))

    if ex_state is not None and ex_state != '':
        qs = qs.filter(ex_state=ex_state)

    items = qs[offset:offset + limit]
    if need_total:
        total = qs.count()
    else:
        total = -1

    return total, items
