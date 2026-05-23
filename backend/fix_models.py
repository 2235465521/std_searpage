import re

with open('standard_app/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    table_name = match.group(1)
    if table_name in ('users', 'view_std_full'):
        return match.group(0) # 保持原样
    return f"managed = False\n        db_table = '{table_name}'"

new_content = re.sub(r"db_table\s*=\s*'([^']+)'", replacer, content)

with open('standard_app/models.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("models.py updated successfully.")
