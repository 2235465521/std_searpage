import os
import django
import sys

# 设置 Django 环境
sys.path.append(r'e:\std_searpage\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from standard_app.services import get_full_standard_detail
from standard_app.models import StdBase

std_id = "GB/T 12105-2026"

try:
    print(f"Checking for standard: {std_id}")
    base = StdBase.objects.filter(std_id=std_id).first()
    if not base:
        print(f"Standard {std_id} not found in StdBase.")
    else:
        print(f"Found standard: ID={base.id}, Type={base.std_type}")
        detail = get_full_standard_detail(std_id)
        print("Success! Detail retrieved.")
        # print(detail)
except Exception as e:
    import traceback
    print("Caught exception:")
    traceback.print_exc()
