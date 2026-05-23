from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    age = models.IntegerField(null=True, blank=True, verbose_name="年龄")
    status = models.IntegerField(default=1, verbose_name="状态")
    gmt_create = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    gmt_modified = models.DateTimeField(auto_now=True, verbose_name="修改时间")

    class Meta:
        db_table = 'users'
        verbose_name = '用户'
        verbose_name_plural = verbose_name

class StdBase(models.Model):
    id = models.BigAutoField(primary_key=True)
    std_id = models.CharField(max_length=255, null=True, blank=True)
    std_type = models.CharField(max_length=50, null=True, blank=True)
    std_type_no = models.CharField(max_length=50, null=True, blank=True)
    std_chinesename = models.CharField(max_length=1000, null=True, blank=True)
    std_englishname = models.CharField(max_length=1000, null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)
    implement_date = models.DateField(null=True, blank=True)
    abolish_date = models.DateField(null=True, blank=True)
    std_status = models.CharField(max_length=50, null=True, blank=True)
    ex_state = models.IntegerField(null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        managed = False
        db_table = 'std_base'

class StdGbDetail(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    ccs = models.CharField(max_length=255, null=True, blank=True)
    ics = models.CharField(max_length=255, null=True, blank=True)
    drafter = models.TextField(null=True, blank=True)
    report_unit = models.CharField(max_length=255, null=True, blank=True)
    sub_report_unit = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_gb_detail'

class StdHbDetail(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    ccs = models.CharField(max_length=255, null=True, blank=True)
    ics = models.CharField(max_length=255, null=True, blank=True)
    drafter = models.TextField(null=True, blank=True)
    report_unit = models.CharField(max_length=255, null=True, blank=True)
    sub_report_unit = models.CharField(max_length=255, null=True, blank=True)
    industry_type = models.CharField(max_length=255, null=True, blank=True)
    std_indu_type = models.CharField(max_length=255, null=True, blank=True)
    record_no = models.CharField(max_length=255, null=True, blank=True)
    record_date = models.DateField(null=True, blank=True)
    rev_type = models.CharField(max_length=255, null=True, blank=True)
    tech_committee = models.CharField(max_length=255, null=True, blank=True)
    approve_dept = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_hb_detail'

class StdDbDetail(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    ccs = models.CharField(max_length=255, null=True, blank=True)
    ics = models.CharField(max_length=255, null=True, blank=True)
    industry_type = models.CharField(max_length=255, null=True, blank=True)
    std_indu_type = models.CharField(max_length=255, null=True, blank=True)
    record_no = models.CharField(max_length=255, null=True, blank=True)
    record_date = models.DateField(null=True, blank=True)
    rev_type = models.CharField(max_length=255, null=True, blank=True)
    tech_committee = models.CharField(max_length=255, null=True, blank=True)
    approve_dept = models.CharField(max_length=255, null=True, blank=True)
    suggest_dept = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_db_detail'

class StdTbDetail(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    ccs = models.CharField(max_length=255, null=True, blank=True)
    ics = models.CharField(max_length=255, null=True, blank=True)
    gbc = models.CharField(max_length=255, null=True, blank=True)
    drafter = models.TextField(null=True, blank=True)
    scope = models.TextField(null=True, blank=True)
    main_tech_cont = models.TextField(null=True, blank=True)
    is_patent = models.IntegerField(null=True, blank=True)
    std_text = models.IntegerField(null=True, blank=True)
    tb_asso = models.CharField(max_length=255, null=True, blank=True)
    regi_no = models.CharField(max_length=255, null=True, blank=True)
    issu_auth = models.CharField(max_length=255, null=True, blank=True)
    buss_scope = models.TextField(null=True, blank=True)
    charge_person = models.CharField(max_length=255, null=True, blank=True)
    unit_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_tb_detail'

class StdReplace(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id', related_name='replaces')
    replace_id = models.BigIntegerField(null=True, blank=True)
    replace_std_name = models.CharField(max_length=1024, null=True, blank=True)
    replace_type = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_replace'

class StdPedigree(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    std_id_latest = models.CharField(max_length=255, null=True, blank=True)
    ped_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_pedigree'

class StdPedChain(models.Model):
    id = models.BigAutoField(primary_key=True)
    ped_id = models.CharField(max_length=255, null=True, blank=True)
    ped_chain = models.CharField(max_length=1000, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_ped_chain'

class StdCcsDict(models.Model):
    id = models.BigAutoField(primary_key=True)
    ccs_code = models.CharField(max_length=50, null=True, blank=True)
    category_name = models.CharField(max_length=255, null=True, blank=True)
    parent_code = models.CharField(max_length=50, null=True, blank=True)
    level = models.IntegerField(null=True, blank=True)
    sort_code = models.CharField(max_length=50, null=True, blank=True)
    name_level_1 = models.CharField(max_length=255, null=True, blank=True)
    name_level_2 = models.CharField(max_length=255, null=True, blank=True)
    name_level_3 = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True, null=True)
    update_time = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = False
        db_table = 'std_ccs_dict'

class StdIcsDict(models.Model):
    id = models.BigAutoField(primary_key=True)
    ics_code = models.CharField(max_length=50, null=True, blank=True)
    ics_code_u = models.CharField(max_length=50, null=True, blank=True)
    parent_code = models.CharField(max_length=50, null=True, blank=True)
    level = models.IntegerField(null=True, blank=True)
    category_name = models.CharField(max_length=255, null=True, blank=True)
    name_level_1 = models.CharField(max_length=255, null=True, blank=True)
    name_level_2 = models.CharField(max_length=255, null=True, blank=True)
    name_level_3 = models.CharField(max_length=255, null=True, blank=True)
    extend_category = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    extend_notes = models.TextField(null=True, blank=True)
    sort_order = models.IntegerField(null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True, null=True)
    update_time = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = False
        db_table = 'std_ics_dict'

class Std4754Tree(models.Model):
    id = models.BigAutoField(primary_key=True)
    code = models.CharField(max_length=50, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    level = models.IntegerField(null=True, blank=True)
    parent_code = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_4754_tree'

class Std4757Search(models.Model):
    id = models.BigAutoField(primary_key=True)
    target_code = models.CharField(max_length=50, null=True, blank=True)
    target_name = models.CharField(max_length=255, null=True, blank=True)
    level_1_name = models.CharField(max_length=255, null=True, blank=True)
    level_2_name = models.CharField(max_length=255, null=True, blank=True)
    level_3_name = models.CharField(max_length=255, null=True, blank=True)
    full_description = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_4757_search'

class StdIndex(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    index_name = models.CharField(max_length=255, null=True, blank=True)
    index_type = models.IntegerField(null=True, blank=True)
    index_context = models.JSONField(null=True, blank=True)
    status = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_index'

class UnitDict(models.Model):
    unit_id = models.BigAutoField(primary_key=True)
    unit_name = models.CharField(max_length=255, null=True, blank=True)
    area_code = models.CharField(max_length=50, null=True, blank=True)
    credit_code = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = False
        db_table = 'unit_dict'

class StdUnitRelation(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    unit = models.ForeignKey(UnitDict, on_delete=models.CASCADE, db_column='unit_id')
    role_type = models.IntegerField(null=True, blank=True)
    rank_order = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_unit_relation'

class AreaDict(models.Model):
    area_code = models.CharField(max_length=50, primary_key=True)
    province_name = models.CharField(max_length=100, null=True, blank=True)
    city_name = models.CharField(max_length=100, null=True, blank=True)
    county_name = models.CharField(max_length=100, null=True, blank=True)
    level = models.IntegerField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'area_dict'

class StdExtendH(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    std_type = models.CharField(max_length=50, null=True, blank=True)
    draft_unit = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_extend_h'

class StdExtendS(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    std_type = models.CharField(max_length=50, null=True, blank=True)
    draft_unit = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'std_extend_s'

class StdStatistical(models.Model):
    id = models.BigAutoField(primary_key=True)
    base = models.ForeignKey(StdBase, on_delete=models.CASCADE, db_column='base_id')
    refer_num = models.IntegerField(null=True, blank=True)
    last_update = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        managed = False
        db_table = 'std_statistical'

class QbMapping(models.Model):
    id = models.BigAutoField(primary_key=True)
    enterprise_bz_id = models.CharField(max_length=255, null=True, blank=True)
    refer_bz_id = models.CharField(max_length=255, null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        managed = False
        db_table = 'qb_mapping'

class ViewStdFull(models.Model):
    id = models.BigIntegerField(primary_key=True)
    std_id = models.CharField(max_length=255, null=True, blank=True)
    std_type = models.CharField(max_length=50, null=True, blank=True)
    std_type_no = models.CharField(max_length=50, null=True, blank=True)
    std_chinesename = models.CharField(max_length=1000, null=True, blank=True)
    std_englishname = models.CharField(max_length=1000, null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)
    implement_date = models.DateField(null=True, blank=True)
    ex_state = models.IntegerField(null=True, blank=True)
    create_time = models.DateTimeField(null=True, blank=True)
    ccs = models.CharField(max_length=255, null=True, blank=True)
    ics = models.CharField(max_length=255, null=True, blank=True)
    drafter = models.TextField(null=True, blank=True)
    report_unit = models.CharField(max_length=255, null=True, blank=True)
    sub_report_unit = models.CharField(max_length=255, null=True, blank=True)
    industry_type = models.CharField(max_length=255, null=True, blank=True)
    std_indu_type = models.CharField(max_length=255, null=True, blank=True)
    record_no = models.CharField(max_length=255, null=True, blank=True)
    record_date = models.DateField(null=True, blank=True)
    rev_type = models.CharField(max_length=255, null=True, blank=True)
    tech_committee = models.CharField(max_length=255, null=True, blank=True)
    approve_dept = models.CharField(max_length=255, null=True, blank=True)
    # gbc = models.CharField(max_length=255, null=True, blank=True)
    # scope = models.TextField(null=True, blank=True)
    # main_tech_cont = models.TextField(null=True, blank=True)
    # is_patent = models.IntegerField(null=True, blank=True)
    # std_text = models.IntegerField(null=True, blank=True)
    # tb_asso = models.CharField(max_length=255, null=True, blank=True)
    # regi_no = models.CharField(max_length=255, null=True, blank=True)
    # issu_auth = models.CharField(max_length=255, null=True, blank=True)
    # buss_scope = models.TextField(null=True, blank=True)
    # charge_person = models.CharField(max_length=255, null=True, blank=True)
    # unit_name = models.CharField(max_length=255, null=True, blank=True)
    # address = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'view_std_full'
