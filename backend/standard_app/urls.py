from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, StandardSearchView, StandardDetailView,
    StandardFileStatusView, StandardDownloadView, AIParseReferenceView,
    AIComplianceEvaluationView, TaskStatusView, UserRegisterView, UserSelfRegisterView,
    AnalyticsRegionsView, AnalyticsSummaryView, AnalyticsYearCompareView, AnalyticsYearRangeView, AnalyticsExportView,
    UnitSearchView, UnitStandardsView, UnitExportView, UnitFirstLeadView, UnitFirstParticipationView,
    UnitFirstParticipationExportView,
)

urlpatterns = [
    # Auth
    path('auth/login', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register', UserRegisterView.as_view(), name='auth_register'),
    path('auth/self-register', UserSelfRegisterView.as_view(), name='auth_self_register'),
    
    # Standards
    path('standards/search', StandardSearchView.as_view(), name='std_search'),
    # 使用 path 转换器允许匹配如 GB/T 这种带斜杠的标准号
    path('standards/<path:std_id>/download', StandardDownloadView.as_view(), name='std_download'),
    path('standards/<path:std_id>/file-status', StandardFileStatusView.as_view(), name='std_file_status'),
    path('standards/<path:std_id>/', StandardDetailView.as_view(), name='std_detail'),
    
    # Analytics
    path('analytics/regions', AnalyticsRegionsView.as_view(), name='analytics_regions'),
    path('analytics/summary', AnalyticsSummaryView.as_view(), name='analytics_summary'),
    path('analytics/year-compare', AnalyticsYearCompareView.as_view(), name='analytics_year_compare'),
    path('analytics/year-range', AnalyticsYearRangeView.as_view(), name='analytics_year_range'),
    path('analytics/export', AnalyticsExportView.as_view(), name='analytics_export'),

    # Drafting units
    path('units/search', UnitSearchView.as_view(), name='unit_search'),
    path('units/export', UnitExportView.as_view(), name='unit_export'),
    path('units/first-lead', UnitFirstLeadView.as_view(), name='unit_first_lead'),
    path('units/first-participation', UnitFirstParticipationView.as_view(), name='unit_first_participation'),
    path('units/first-participation/export', UnitFirstParticipationExportView.as_view(), name='unit_first_participation_export'),
    path('units/<path:std_id>/drafters', UnitStandardsView.as_view(), name='unit_drafters'),

    # AI Tasks
    path('ai/parse-references', AIParseReferenceView.as_view(), name='ai_parse'),
    path('ai/compliance-evaluation', AIComplianceEvaluationView.as_view(), name='ai_compliance'),
    path('tasks/<str:task_id>/status', TaskStatusView.as_view(), name='task_status'),
]
