import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
cursor = connection.cursor()

migraciones = [
    ('organizacion', '0001_initial'),
    ('usuarios',     '0001_initial'),
]

for app, name in migraciones:
    cursor.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES (%s, %s, NOW())
        ON CONFLICT DO NOTHING
    """, [app, name])
    print(f'OK: {app} {name}')

print('Listo')