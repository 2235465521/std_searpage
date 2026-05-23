from rest_framework.permissions import BasePermission

class IsSuperAdmin(BasePermission):
    """
    只允许超级管理员访问
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
