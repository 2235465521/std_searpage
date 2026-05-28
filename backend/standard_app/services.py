import json
import os
import re
import requests
from elasticsearch import Elasticsearch
from django.conf import settings
from .crud import (
    get_view_std_full_by_id, search_standards_in_db,
    get_standard_base_by_std_id, get_standard_detail,
    get_pedigree_list, get_replace_history,
    INTL_STD_TYPES, SEARCH_LIST_FIELDS,
)
from .serializers import (
    StdBaseSerializer, StdGbDetailSerializer, StdHbDetailSerializer,
    StdDbDetailSerializer, StdTbDetailSerializer, 
    StdPedigreeSerializer, StdReplaceSerializer, StdPedChainSerializer
)

from .models import StdPedChain, StdBase, StdReplace
from django.core.cache import cache as redis_cache
from . import es_circuit
from .std_type_util import normalize_std_type_code

_STD_SEARCH_CACHE_TTL = 300

# Elasticsearch 连接配置
ES_HOST = getattr(settings, 'ES_HOST', 'http://127.0.0.1:9200')
ES_INDEX = getattr(settings, 'ES_INDEX', 'standards')
ES_REQUEST_TIMEOUT = getattr(settings, 'ES_REQUEST_TIMEOUT', 2)
es_client = Elasticsearch(ES_HOST, request_timeout=ES_REQUEST_TIMEOUT)

_DRAFTER_SPLIT_RE = re.compile(
    r'[，,；;、/\|]+|(?:\s+和\s+)|(?:\s+与\s+)|[\r\n]+',
)
_DRAFTER_PREFIX_RE = re.compile(r'^(本标准)?(主要)?起草单位[：:]\s*')
# 2～4 个汉字且无机构特征时视为人名（如 梁小明、张学曼）
_PERSON_NAME_RE = re.compile(r'^[\u4e00-\u9fa5·]{2,4}$')
_ORG_NAME_KEYWORDS = (
    '公司', '集团', '股份', '有限', '企业', '研究院', '研究所', '研究室', '实验室',
    '大学', '学院', '医院', '中心', '协会', '学会', '委员会', '技术委员会',
    '局', '厅', '部', '委', '所', '站', '厂', '院', '馆', '司', '总厂', '分院',
    '分局', '科学院', '工程院', '质监局', '检测院', '检验所',
)


def _split_drafter_text(text):
    cleaned = _DRAFTER_PREFIX_RE.sub('', str(text).strip())
    return [part.strip() for part in _DRAFTER_SPLIT_RE.split(cleaned) if part.strip()]


def extract_drafter_names(*raw_sources, limit=None):
    """从扩展表/子表文本中解析全部起草单位名称；limit 为 None 时不截断。"""
    seen = set()
    result = []

    for raw in raw_sources:
        if not raw:
            continue
        text = str(raw).strip()
        if not text:
            continue

        candidates = []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                candidates = [str(item).strip() for item in parsed if str(item).strip()]
        except (json.JSONDecodeError, TypeError, ValueError):
            candidates = _split_drafter_text(text)
        else:
            if not candidates:
                candidates = _split_drafter_text(text)

        for name in candidates:
            if name not in seen:
                seen.add(name)
                result.append(name)
                if limit is not None and len(result) >= limit:
                    return result

    return result


def _is_organization_name(name):
    """判断是否为机构/单位名称（排除典型个人姓名）。"""
    text = (name or '').strip()
    if not text:
        return False
    if any(kw in text for kw in _ORG_NAME_KEYWORDS):
        return True
    if _PERSON_NAME_RE.match(text):
        return False
    # 较长且含常见单位结构（如 XX市XX公司 的「市」单独不够，靠长度兜底）
    return len(text) >= 6


def extract_organization_drafters(*raw_sources, limit=3):
    """解析起草单位文本，仅保留机构名称；不足 limit 时不补人名。"""
    seen = set()
    result = []
    for name in extract_drafter_names(*raw_sources, limit=None):
        if not _is_organization_name(name):
            continue
        if name in seen:
            continue
        seen.add(name)
        result.append(name)
        if limit is not None and len(result) >= limit:
            break
    return result


def extract_top_drafters(*raw_sources, limit=3):
    """从扩展表/子表文本中解析起草单位，最多返回 limit 个（仅机构）。"""
    return extract_organization_drafters(*raw_sources, limit=limit)


def _resolve_internal_status(base_obj):
    """将 ex_state 转为内部执行状态文案。"""
    ex_state = base_obj.ex_state
    if ex_state == 1:
        return '现行'
    if ex_state == 2:
        return '即将实施'
    if ex_state in (0, 3):
        return '废止'
    if base_obj.abolish_date:
        return '废止'
    return '未知'


def _search_via_elasticsearch(query_body, offset, size):
    res = es_client.search(index=ES_INDEX, query=query_body, from_=offset, size=size)
    total = res['hits']['total']['value']
    items = [hit['_source'] for hit in res['hits']['hits']]
    return total, items

def _build_es_std_type_clause(std_type):
    """构建 ES 中 std_type 筛选子句。"""
    if std_type == 'IEEE':
        return {
            "bool": {
                "should": [
                    {"term": {"std_type.keyword": "IEEE"}},
                    {"prefix": {"std_id": "IEEE"}},
                    {"wildcard": {"std_id": "*IEEE*"}},
                ],
                "minimum_should_match": 1,
            }
        }
    return {"term": {"std_type.keyword": std_type}}


def search_standards(keyword=None, std_type=None, ex_state=None, page=1, size=20, need_total=True):
    """
    统一的搜索服务入口：优先尝试 Elasticsearch 检索。
    如果 ES 连接失败或引发异常，则优雅降级为 MySQL 纯 DB 查询。
    ISO / IEC / IEEE 固定走 DB（std_base），确保能查到国际标准数据。
    """
    ck = f'std_search:v1:{keyword or ""}:{std_type or ""}:{ex_state}:{page}:{size}:{int(need_total)}'
    cached = redis_cache.get(ck)
    if cached is not None:
        return cached

    offset = (page - 1) * size

    if std_type in INTL_STD_TYPES:
        total, qs = search_standards_in_db(
            keyword, std_type, ex_state, size, offset, need_total=need_total,
        )
        items = list(qs.values(*SEARCH_LIST_FIELDS))
        result = (total, items)
        redis_cache.set(ck, result, _STD_SEARCH_CACHE_TTL)
        return result

    query_body = {"bool": {"must": []}}

    if keyword:
        query_body["bool"]["must"].append({
            "multi_match": {
                "query": keyword,
                "fields": ["std_id^3", "std_chinesename^2", "std_englishname"],
            }
        })

    if std_type:
        query_body["bool"]["must"].append(_build_es_std_type_clause(std_type))

    if ex_state is not None and ex_state != '':
        query_body["bool"]["must"].append({"term": {"ex_state": ex_state}})

    if not query_body["bool"]["must"]:
        query_body = {"match_all": {}}

    es_result = es_circuit.try_elasticsearch(
        lambda: _search_via_elasticsearch(query_body, offset, size),
    )
    if es_result is not None:
        redis_cache.set(ck, es_result, _STD_SEARCH_CACHE_TTL)
        return es_result

    total, qs = search_standards_in_db(
        keyword, std_type, ex_state, size, offset, need_total=need_total,
    )
    items = list(qs.values(*SEARCH_LIST_FIELDS))
    result = (total, items)
    redis_cache.set(ck, result, _STD_SEARCH_CACHE_TTL)
    return result

def _normalize_replace_type_code(replace_type):
    """统一 replace_type（库中多为字符串 '0'/'1'/'2'）。"""
    if replace_type is None:
        return None
    raw = str(replace_type).strip()
    if not raw:
        return None
    if raw in ('0', '0.0'):
        return '0'
    if raw in ('1', '1.0'):
        return '1'
    if raw in ('2', '2.0'):
        return '2'
    return raw


def _map_replace_type_meta(replace_type):
    """替代类型 -> 连线颜色与说明（与 std_replace.replace_type 约定一致）。"""
    code = _normalize_replace_type_code(replace_type)
    if code is None:
        return {'label': '未知', 'color': '#94a3b8'}
    if code == '1' or '完全' in code:
        return {'label': '完全代替', 'color': '#1d4ed8'}
    if code == '0' or ('部分' in code and '代完' not in code):
        return {'label': '部分代替', 'color': '#dc2626'}
    if code == '2' or '部分代完' in code or ('代完' in code and '部分' not in code):
        return {'label': '部分代完', 'color': '#16a34a'}
    return {'label': '未知', 'color': '#94a3b8'}


def _lookup_replace_type(base_id, target_name, replace_by_base):
    """根据新标准 base_id 与被替代标准号精确匹配 replace_type。"""
    target = (target_name or '').strip()
    if not base_id or not target:
        return None
    entries = replace_by_base.get(base_id) or []
    for name, rtype in entries:
        n = (name or '').strip()
        if not n:
            continue
        if n == target:
            return rtype
    return None


def _enrich_ped_chain_replace_types(ped_chain_data):
    """为谱系边补充替代类型（来源 std_replace）及展示文案。"""
    if not ped_chain_data or not isinstance(ped_chain_data, dict):
        return ped_chain_data
    edges = ped_chain_data.get('edges') or []
    if not edges:
        return ped_chain_data

    nodes = ped_chain_data.get('nodes') or []
    std_to_base = dict(
        StdBase.objects.filter(std_id__in=nodes).values_list('std_id', 'id')
    )
    base_ids = list(std_to_base.values())
    replace_by_base = {}
    if base_ids:
        for row in StdReplace.objects.filter(base_id__in=base_ids).values(
            'base_id', 'replace_std_name', 'replace_type'
        ):
            replace_by_base.setdefault(row['base_id'], []).append(
                (row['replace_std_name'], row['replace_type'])
            )

    enriched_edges = []
    for edge in edges:
        source = (edge.get('source') or '').strip()
        target = (edge.get('target') or '').strip()
        base_id = std_to_base.get(source)
        rtype = _normalize_replace_type_code(edge.get('replace_type'))
        if rtype is None and base_id:
            rtype = _normalize_replace_type_code(
                _lookup_replace_type(base_id, target, replace_by_base)
            )
        meta = _map_replace_type_meta(rtype)
        enriched_edges.append({
            **edge,
            'source': source,
            'target': target,
            'replace_type': rtype,
            'replace_label': meta['label'],
            'replace_color': meta['color'],
        })

    out = dict(ped_chain_data)
    out['edges'] = enriched_edges
    return out


def _enrich_ped_chain_resolvability(ped_chain_data):
    """标注演进树各节点是否能在 std_base 中打开详情。"""
    if not ped_chain_data or not isinstance(ped_chain_data, dict):
        return ped_chain_data
    nodes = ped_chain_data.get('nodes') or []
    if not nodes:
        return ped_chain_data
    existing = set(
        StdBase.objects.filter(std_id__in=nodes).values_list('std_id', flat=True)
    )
    enriched = dict(ped_chain_data)
    enriched['resolvable'] = {node_id: node_id in existing for node_id in nodes}
    return enriched


def _build_ped_chain_from_replace_history(std_id_str, replace_qs):
    """
    无 std_ped_chain 时，用 std_replace 生成简易演进树（当前标准为根，被替代标准为子节点）。
    与 _enrich_ped_chain_replace_types 的边方向一致：source=新标准，target=被替代标准号。
    """
    std_id = (std_id_str or '').strip()
    if not std_id:
        return None

    nodes = [std_id]
    edges = []
    seen_edges = set()

    for row in replace_qs:
        old_name = (row.replace_std_name or '').strip()
        if not old_name:
            continue
        if old_name not in nodes:
            nodes.append(old_name)
        key = (std_id, old_name)
        if key in seen_edges:
            continue
        seen_edges.add(key)
        edges.append({
            'source': std_id,
            'target': old_name,
            'replace_type': row.replace_type,
        })

    if len(nodes) < 2 or not edges:
        return None
    return {'nodes': nodes, 'edges': edges}


def _text_or_none(value):
    text = (value or '').strip() if isinstance(value, str) else value
    if text is None:
        return None
    if isinstance(text, str) and not text:
        return None
    return text


def _detail_payload_from_view(view_obj):
    if not view_obj:
        return {}
    return {
        key: value
        for key, value in {
            'ics': _text_or_none(view_obj.ics),
            'ccs': _text_or_none(view_obj.ccs),
            'drafter': view_obj.drafter,
            'report_unit': view_obj.report_unit,
            'sub_report_unit': view_obj.sub_report_unit,
            'industry_type': view_obj.industry_type,
            'std_indu_type': view_obj.std_indu_type,
            'record_no': view_obj.record_no,
            'record_date': view_obj.record_date,
            'rev_type': view_obj.rev_type,
            'tech_committee': view_obj.tech_committee,
            'approve_dept': view_obj.approve_dept,
        }.items()
        if value not in (None, '')
    }


def _merge_classification_fields(base_obj, detail_data=None):
    payload = dict(detail_data or {})
    view_obj = get_view_std_full_by_id(base_obj.std_id)
    view_payload = _detail_payload_from_view(view_obj)

    for key in ('ics', 'ccs'):
        if not _text_or_none(payload.get(key)) and view_payload.get(key):
            payload[key] = view_payload[key]

    if not payload and view_payload:
        payload.update(view_payload)
    return payload


def _serialize_detail_obj(base_obj, detail_obj):
    if not detail_obj:
        return None
    code = normalize_std_type_code(base_obj.std_type, base_obj.std_type_no)
    serializer_map = {
        'GB': StdGbDetailSerializer,
        'HB': StdHbDetailSerializer,
        'DB': StdDbDetailSerializer,
        'TB': StdTbDetailSerializer,
    }
    serializer_cls = serializer_map.get(code)
    if not serializer_cls:
        return None
    return serializer_cls(detail_obj).data


def get_full_standard_detail(std_id_str):
    """
    获取单条标准的聚合详情（涵盖基础信息、子表扩展、谱系与替代历史）
    """
    base_obj = get_standard_base_by_std_id(std_id_str)
    if not base_obj:
        return None
        
    detail_obj = get_standard_detail(base_obj)
    pedigree_qs = get_pedigree_list(base_obj.id)
    replace_qs = get_replace_history(base_obj.id)
    
    detail_data = _serialize_detail_obj(base_obj, detail_obj)
    detail_data = _merge_classification_fields(base_obj, detail_data)
            
    # 起草单位：优先 std_extend_h.draft_unit，再补子表 drafter 中的机构名（不补人名）
    from .models import StdExtendH
    extend_h = StdExtendH.objects.filter(base=base_obj).first()
    drafter_sources = []
    if extend_h and extend_h.draft_unit:
        drafter_sources.append(extend_h.draft_unit)
    if detail_data and detail_data.get('drafter'):
        drafter_sources.append(detail_data.get('drafter'))
    drafters_list = extract_organization_drafters(*drafter_sources, limit=3)

    # 状态映射（库内废止多为 ex_state=0，与检索列表、详情顶栏一致）
    internal_status = _resolve_internal_status(base_obj)

    # 获取谱系链 JSON；无 ped_chain 时用 std_replace 生成简易树
    ped_chain_data = None
    if pedigree_qs.exists():
        ped_id = pedigree_qs.first().ped_id
        chain_obj = StdPedChain.objects.filter(ped_id=ped_id).first()
        if chain_obj and chain_obj.ped_chain:
            try:
                ped_chain_data = json.loads(chain_obj.ped_chain)
            except Exception:
                ped_chain_data = chain_obj.ped_chain

    if not ped_chain_data or not (ped_chain_data.get('nodes') if isinstance(ped_chain_data, dict) else None):
        ped_chain_data = _build_ped_chain_from_replace_history(base_obj.std_id, replace_qs)

    if ped_chain_data and isinstance(ped_chain_data, dict):
        ped_chain_data = _enrich_ped_chain_resolvability(ped_chain_data)
        ped_chain_data = _enrich_ped_chain_replace_types(ped_chain_data)

    detail_payload = detail_data or {}
    governing_unit = (
        detail_payload.get('report_unit')
        or detail_payload.get('tech_committee')
        or detail_payload.get('issu_auth')
        or '-'
    )

    return {
        "base_info": {
            **StdBaseSerializer(base_obj).data,
            "internal_status": internal_status
        },
        "detail_info": {
            **detail_payload,
            "top_drafters": drafters_list,
            "governing_unit": governing_unit,
        },
        "pedigree": StdPedigreeSerializer(pedigree_qs, many=True).data,
        "ped_chain": ped_chain_data,
        "replace_history": StdReplaceSerializer(replace_qs, many=True).data
    }

def submit_dify_task_sync(std_id_str, task_type, business_description=None):
    """
    封装对 Dify API 的网络请求 (阻塞式同步代码，设计为给 Celery Worker 异步调用)
    """
    DIFY_API_URL = getattr(settings, 'DIFY_API_URL', 'http://127.0.0.1/v1/chat-messages')
    DIFY_API_KEY = getattr(settings, 'DIFY_API_KEY', 'your-dify-api-key')
    
    headers = {
        'Authorization': f'Bearer {DIFY_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    if task_type == 'compliance' and business_description:
        query_text = f"请评估标准 {std_id_str} 与以下业务的合规性：\n{business_description}"
    else:
        query_text = f"请提取并解析标准 {std_id_str} 中的规范性引用文件列表。"
        
    payload = {
        "inputs": {},
        "query": query_text,
        "response_mode": "blocking", # 请求完整结果再返回
        "user": "system_backend"
    }
    
    try:
        response = requests.post(DIFY_API_URL, json=payload, headers=headers, timeout=120)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_standard_file_path(std_id_str):
    """在共享盘（见 settings.SHARED_DISK_DIR）中查找标准 PDF。"""
    from .file_storage import get_standard_file_path as resolve_pdf_path
    return resolve_pdf_path(std_id_str)

def create_user_service(username, password, email, role='user'):
    """
    负责创建新用户的核心逻辑，执行底层数据库操作
    """
    from .models import CustomUser
    
    if CustomUser.objects.filter(username=username).exists():
        raise ValueError("用户名已存在！")
        
    user = CustomUser.objects.create_user(
        username=username,
        email=email,
        password=password
    )
    
    if role == 'superadmin':
        user.is_superuser = True
        user.is_staff = True
        user.status = 1
        user.save()
    else:
        user.status = 1
        user.save()
        
    return user

