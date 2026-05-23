import os
from celery import Celery

# 设置 Django 环境为该项目默认 settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')

# 使用 CELERY_ 作为前缀，将 celery 配置放在 settings.py 中
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现所有 apps 目录下的 tasks.py
app.autodiscover_tasks()
