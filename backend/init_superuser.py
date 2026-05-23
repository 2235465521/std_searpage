import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from standard_app.models import CustomUser

username = 'admin'
password = 'adminpassword'
email = 'admin@example.com'

if not CustomUser.objects.filter(username=username).exists():
    CustomUser.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' created successfully.")
else:
    user = CustomUser.objects.get(username=username)
    user.set_password(password)
    user.save()
    print(f"Password for '{username}' has been reset to '{password}'.")
