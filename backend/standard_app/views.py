from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsSuperAdmin
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
from celery.result import AsyncResult
import os
import mimetypes
import urllib.parse
import platform

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from .services import search_standards, get_full_standard_detail, get_standard_file_path, create_user_service
from .file_storage import check_standard_file_available
from .tasks import process_dify_evaluation_task
from . import analytics as analytics_service
from . import unit_search as unit_search_service

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class StandardSearchView(APIView):
    permission_classes = [IsAuthenticated] # 强制要求带 Token 访问

    def get(self, request):
        keyword = request.query_params.get('keyword', '') or None
        std_type = request.query_params.get('std_type') or None
        status = request.query_params.get('status')
        if status is not None and status != '':
            try:
                status = int(status)
            except (TypeError, ValueError):
                status = None
        try:
            page = int(request.query_params.get('page', 1))
            size = int(request.query_params.get('size', 20))
        except ValueError:
            page, size = 1, 20

        skip_count = str(request.query_params.get('skip_count', '')).lower() in ('1', 'true', 'yes')
        need_total = not skip_count
        total, items = search_standards(
            keyword, std_type, status, page, size, need_total=need_total,
        )

        data = {
            "page": page,
            "size": size,
            "items": items,
        }
        if total is not None and total >= 0:
            data["total"] = total

        return Response({
            "code": 0,
            "message": "success",
            "data": data,
        })

class StandardDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, std_id):
        # 兼容 URL 中的特殊字符（前端需要 urlencode）
        std_id_str = urllib.parse.unquote(std_id)
        data = get_full_standard_detail(std_id_str)
        
        if not data:
            return Response({"code": 404, "message": "Standard not found"}, status=404)
            
        return Response({
            "code": 0,
            "message": "success",
            "data": data
        })

class UserRegisterView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        role = request.data.get('role', 'user')

        if not username or not password:
            return Response({"code": 400, "message": "用户名和密码不能为空"}, status=400)

        try:
            user = create_user_service(username, password, email, role)
            return Response({
                "code": 0,
                "message": "人员注册分配成功",
                "data": {"id": user.id, "username": user.username, "role": role}
            })
        except ValueError as e:
            return Response({"code": 400, "message": str(e)}, status=400)
        except Exception as e:
            return Response({"code": 500, "message": f"服务器内部错误: {str(e)}"}, status=500)


class UserSelfRegisterView(APIView):
    """登录页自助注册：仅需用户名，密码固定。"""

    permission_classes = []
    FIXED_PASSWORD = 'zkbz2026'

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({"code": 400, "message": "用户名不能为空"}, status=400)

        try:
            user = create_user_service(username, self.FIXED_PASSWORD, '', 'user')
            return Response({
                "code": 0,
                "message": "注册成功，请联系管理员获取登录密码",
                "data": {"id": user.id, "username": user.username},
            })
        except ValueError as e:
            return Response({"code": 400, "message": str(e)}, status=400)
        except Exception as e:
            return Response({"code": 500, "message": f"服务器内部错误: {str(e)}"}, status=500)

class StandardFileStatusView(APIView):
    """异步检测共享盘是否有源文件，不阻塞详情主接口。"""
    permission_classes = [IsAuthenticated]

    def get(self, request, std_id):
        std_id_str = urllib.parse.unquote(std_id)
        has_file = check_standard_file_available(std_id_str)
        return Response({
            "code": 0,
            "message": "success",
            "data": {"has_file": has_file},
        })


class StandardDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, std_id):
        std_id_str = urllib.parse.unquote(std_id)
        file_path = get_standard_file_path(std_id_str)
        
        if not file_path or not os.path.exists(file_path):
            return Response(
                {
                    "code": 404,
                    "message": "该标准暂无电子版，请联系管理员或线下查阅。",
                },
                status=404,
            )

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'
        filename = os.path.basename(file_path)
        
        if platform.system() == 'Linux':
            base_dir = settings.SHARED_DISK_DIR
            if not base_dir.endswith('/'):
                base_dir += '/'
            normalized_file_path = file_path.replace('\\', '/')
            if normalized_file_path.startswith(base_dir):
                relative_path = normalized_file_path[len(base_dir):]
                nginx_path = f"/protected-files/{relative_path}"
                response = HttpResponse(content_type=content_type)
                response['Content-Disposition'] = (
                    f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"
                )
                response['X-Accel-Redirect'] = nginx_path.encode('utf-8')
                return response

        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = (
            f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"
        )
        return response

class AIParseReferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        std_id = request.data.get('std_id')
        if not std_id:
            return Response({"code": 400, "message": "std_id is required"}, status=400)
            
        # 抛入 Celery 消息队列，不阻塞
        task = process_dify_evaluation_task.delay(std_id, 'parse_references')
        
        return Response({
            "code": 0,
            "message": "Task accepted",
            "data": {
                "task_id": task.id
            }
        }, status=202)

class AIComplianceEvaluationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        std_id = request.data.get('std_id')
        business_description = request.data.get('business_description')
        if not std_id or not business_description:
            return Response({"code": 400, "message": "std_id and business_description are required"}, status=400)
            
        task = process_dify_evaluation_task.delay(std_id, 'compliance', business_description)
        
        return Response({
            "code": 0,
            "message": "Task accepted",
            "data": {
                "task_id": task.id
            }
        }, status=202)

class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        # 调取 Celery 的结果状态
        task_result = AsyncResult(task_id)
        
        data = {
            "task_id": task_id,
            "status": task_result.status,
            "result": None
        }
        
        if task_result.ready():
            if task_result.successful():
                data["result"] = task_result.result
            else:
                data["result"] = {"error": str(task_result.result)}
                
        return Response({
            "code": 0,
            "message": "success",
            "data": data
        })


def _parse_filter_year(request):
    raw = request.query_params.get('year')
    if not raw:
        return None
    try:
        year = int(raw)
    except (TypeError, ValueError):
        return None
    return year if 1900 <= year <= 2100 else None


def _parse_include_breakdown(request):
    raw = request.query_params.get('include_breakdown')
    if raw is None:
        return True
    return str(raw).lower() not in ('0', 'false', 'no')


def _region_scope_params(request):
    raw_scope = []
    raw_scope.extend(request.query_params.getlist('std_scope'))
    comma_scope = request.query_params.get('std_scope')
    if comma_scope:
        raw_scope.extend(str(comma_scope).split(','))
    return {
        'province': request.query_params.get('province') or None,
        'city': request.query_params.get('city') or None,
        'county': request.query_params.get('county') or None,
        'std_scope': analytics_service.normalize_std_scope(raw_scope),
    }


def _region_params(request):
    year = _parse_filter_year(request)
    if year is None:
        year = analytics_service.latest_release_year()
    return {
        **_region_scope_params(request),
        'year': year,
    }


def _unit_region_params(request):
    return {
        'province': request.query_params.get('province') or None,
        'city': request.query_params.get('city') or None,
        'county': request.query_params.get('county') or None,
    }


def _parse_unit_std_scope(request):
    raw = []
    raw.extend(request.query_params.getlist('std_scope'))
    comma_raw = request.query_params.get('std_scope')
    if comma_raw:
        raw.extend(str(comma_raw).split(','))
    return unit_search_service.normalize_std_scope(raw)


def _parse_unit_year(request):
    raw = request.query_params.get('year')
    if not raw:
        return None
    try:
        year = int(raw)
    except (TypeError, ValueError):
        return None
    return year if 1900 <= year <= 2100 else None


def _parse_include_analysis(request):
    raw = request.query_params.get('include_analysis')
    if raw is None:
        return True
    return str(raw).lower() not in ('0', 'false', 'no')


class UnitSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keyword = request.query_params.get('keyword', '') or None
        try:
            page = int(request.query_params.get('page', 1))
            size = int(request.query_params.get('size', 20))
        except (TypeError, ValueError):
            page, size = 1, 20

        try:
            total, items, year, rank_filter, std_scope, analysis = unit_search_service.search_units(
                keyword=keyword,
                page=page,
                size=size,
                year=_parse_unit_year(request),
                count_tier=request.query_params.get('count_tier'),
                rank_query=request.query_params.get('rank_query'),
                std_scope=_parse_unit_std_scope(request),
                include_analysis=_parse_include_analysis(request),
                **_unit_region_params(request),
            )
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)
        return Response({
            'code': 0,
            'message': 'success',
            'data': {
                'page': page,
                'size': size,
                'total': total,
                'year': year,
                'count_tier': unit_search_service.normalize_count_tier(request.query_params.get('count_tier')),
                'rank_query': rank_filter['query'],
                'std_scope': std_scope,
                'analysis': analysis,
                'items': items,
            },
        })


class UnitExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            items, analysis, year, rank_filter, std_scope = unit_search_service.build_export_data(
                year=_parse_unit_year(request),
                count_tier=request.query_params.get('count_tier'),
                rank_query=request.query_params.get('rank_query'),
                std_scope=_parse_unit_std_scope(request),
                **_unit_region_params(request),
            )
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)

        buf = unit_search_service.build_excel_workbook(items, analysis)
        scope_tag = f"_{'-'.join(std_scope)}" if std_scope else ''
        filename = urllib.parse.quote(f"起草单位查询_{year}_{rank_filter['query']}{scope_tag}.xlsx")
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{filename}"
        return response


class UnitStandardsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, std_id):
        std_id_str = urllib.parse.unquote(std_id)
        year = _parse_unit_year(request)
        detail = unit_search_service.get_unit_detail(std_id_str, year=year)
        if not detail:
            return Response({'code': 404, 'message': '未找到该年度标准', 'data': None}, status=404)

        return Response({
            'code': 0,
            'message': 'success',
            'data': detail,
        })


class UnitFirstLeadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = unit_search_service.find_first_lead_national_standard(
            **_unit_region_params(request),
        )
        return Response({'code': 0, 'message': 'success', 'data': data})


class UnitFirstParticipationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unit_name = (request.query_params.get('unit_name') or '').strip()
        try:
            if unit_name:
                data = unit_search_service.find_unit_first_participation(
                    unit_name=unit_name,
                    std_scope=_parse_unit_std_scope(request),
                )
            else:
                data = unit_search_service.query_first_participation_page(
                    std_scope=_parse_unit_std_scope(request),
                    first_year_from=request.query_params.get('first_year_from'),
                    first_year_to=request.query_params.get('first_year_to'),
                    rank_query=request.query_params.get('rank_query'),
                    list_mode=request.query_params.get('list_mode')
                    or request.query_params.get('export_mode')
                    or 'detail',
                    page=request.query_params.get('page', 1),
                    size=request.query_params.get('size', 50),
                    **_unit_region_params(request),
                )
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)
        return Response({'code': 0, 'message': 'success', 'data': data})


class UnitFirstParticipationExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            export_items, analysis, meta = unit_search_service.build_first_participation_export_data(
                std_scope=_parse_unit_std_scope(request),
                first_year_from=request.query_params.get('first_year_from'),
                first_year_to=request.query_params.get('first_year_to'),
                rank_query=request.query_params.get('rank_query'),
                export_mode=request.query_params.get('export_mode', 'detail'),
                export_scope=request.query_params.get('export_scope', 'all'),
                page=request.query_params.get('page', 1),
                page_from=request.query_params.get('page_from'),
                page_to=request.query_params.get('page_to'),
                size=request.query_params.get('size', 50),
                **_unit_region_params(request),
            )
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)

        buf = unit_search_service.build_first_participation_excel(
            export_items,
            analysis,
            export_mode=meta.get('export_mode'),
        )
        region_tag = meta.get('region_label') or '地区'
        year_tag = meta.get('first_year_label') or '不限年份'
        filename = urllib.parse.quote(f"单位首次参与_{region_tag}_{year_tag}.xlsx")
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{filename}"
        return response


class AnalyticsRegionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        province = request.query_params.get('province')
        city = request.query_params.get('city')
        if city and province:
            data = {'counties': analytics_service.list_counties(province, city)}
        elif province:
            data = {'cities': analytics_service.list_cities(province)}
        else:
            data = {
                'provinces': analytics_service.list_provinces(),
                'latest_year': analytics_service.latest_release_year(),
            }
        return Response({'code': 0, 'message': 'success', 'data': data})


class AnalyticsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = analytics_service.regional_summary(
            **_region_params(request),
            include_breakdown=_parse_include_breakdown(request),
        )
        return Response({'code': 0, 'message': 'success', 'data': data})


class AnalyticsYearCompareView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            year_a = int(request.query_params.get('year_a', 0))
            year_b = int(request.query_params.get('year_b', 0))
        except (TypeError, ValueError):
            return Response({'code': 400, 'message': 'year_a 与 year_b 须为有效年份', 'data': None}, status=400)
        if year_a < 1900 or year_b < 1900:
            return Response({'code': 400, 'message': '年份无效', 'data': None}, status=400)
        try:
            data = analytics_service.year_compare(**_region_scope_params(request), year_a=year_a, year_b=year_b)
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)
        return Response({'code': 0, 'message': 'success', 'data': data})


class AnalyticsYearRangeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            year_from = int(request.query_params.get('year_from', 0))
            year_to = int(request.query_params.get('year_to', 0))
        except (TypeError, ValueError):
            return Response({'code': 400, 'message': 'year_from 与 year_to 须为有效年份', 'data': None}, status=400)
        if year_from < 1900 or year_to < 1900:
            return Response({'code': 400, 'message': '年份无效', 'data': None}, status=400)
        try:
            data = analytics_service.year_range_stats(
                **_region_scope_params(request),
                year_from=year_from,
                year_to=year_to,
            )
        except ValueError as exc:
            return Response({'code': 400, 'message': str(exc), 'data': None}, status=400)
        return Response({'code': 0, 'message': 'success', 'data': data})


class AnalyticsExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        region = _region_params(request)
        scope = _region_scope_params(request)
        summary = analytics_service.regional_summary(**region)
        compare = None
        year_range = None
        year_a = request.query_params.get('year_a')
        year_b = request.query_params.get('year_b')
        year_from = request.query_params.get('year_from')
        year_to = request.query_params.get('year_to')
        if year_a and year_b:
            try:
                compare = analytics_service.year_compare(
                    **scope, year_a=int(year_a), year_b=int(year_b),
                )
            except (TypeError, ValueError):
                pass
        if year_from and year_to:
            try:
                year_range = analytics_service.year_range_stats(
                    **scope, year_from=int(year_from), year_to=int(year_to),
                )
            except (TypeError, ValueError):
                pass

        buf = analytics_service.build_excel_workbook(summary, compare, year_range)
        filename = urllib.parse.quote(f"标准数据分析_{summary['region']['label']}.xlsx")
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{filename}"
        return response
