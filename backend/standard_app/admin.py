from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'age', 'status', 'is_staff', 'is_superuser', 'gmt_create')
    
    # 在 Django Admin 的详情页中增加我们在模型里自定义的字段
    fieldsets = UserAdmin.fieldsets + (
        ('额外信息 (扩展)', {'fields': ('age', 'status')}),
    )
    
    # 添加用户时的表单字段
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('额外信息 (扩展)', {'fields': ('age', 'status')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)
