import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from standard_app.models import CustomUser

with connection.schema_editor() as schema_editor:
    try:
        schema_editor.create_model(CustomUser.groups.through)
        print("Created CustomUser.groups.through")
    except Exception as e:
        print("Groups table error:", e)
        
    try:
        schema_editor.create_model(CustomUser.user_permissions.through)
        print("Created CustomUser.user_permissions.through")
    except Exception as e:
        print("Permissions table error:", e)
