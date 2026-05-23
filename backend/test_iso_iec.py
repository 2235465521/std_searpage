import os
import django
import sys

sys.path.append(r'e:\std_searpage_latest\std_searpage\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from standard_app.models import StdBase, StdGbDetail, StdHbDetail, StdDbDetail, StdTbDetail

print("Checking details for ISO/IEC:")
for type_no in ['04', '05']:
    bases = StdBase.objects.filter(std_type_no=type_no)
    count = bases.count()
    print(f"type_no: {type_no}, count: {count}")
    if count > 0:
        base_ids = list(bases.values_list('id', flat=True)[:100])
        gb = StdGbDetail.objects.filter(base_id__in=base_ids).count()
        hb = StdHbDetail.objects.filter(base_id__in=base_ids).count()
        db = StdDbDetail.objects.filter(base_id__in=base_ids).count()
        tb = StdTbDetail.objects.filter(base_id__in=base_ids).count()
        print(f"  Among first 100 base standards: GB={gb}, HB={hb}, DB={db}, TB={tb}")
