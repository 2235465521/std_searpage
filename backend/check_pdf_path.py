"""
用法（在 backend 目录、已激活 venv）:
  python check_pdf_path.py "ISO 9001:2015"
  python check_pdf_path.py "GB/T 1.1-2020"
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from standard_app.file_storage import get_standard_file_path
from django.conf import settings

if __name__ == '__main__':
    std_id = sys.argv[1] if len(sys.argv) > 1 else 'ISO 9001:2015'
    root = settings.SHARED_DISK_DIR
    print(f'SHARED_DISK_DIR = {root}')
    print(f'目录可访问: {os.path.isdir(root)}')
    path = get_standard_file_path(std_id)
    print(f'标准号: {std_id}')
    print(f'解析结果: {path or "(未找到)"}')
