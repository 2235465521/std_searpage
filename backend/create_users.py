import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from standard_app.models import CustomUser

with connection.schema_editor() as schema_editor:
    try:
        schema_editor.create_model(CustomUser)
        print("CustomUser table (users) created successfully.")
    except Exception as e:
        print("Error:", e)
