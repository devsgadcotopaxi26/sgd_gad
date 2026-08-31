"""
Renombra el código del rol ARCHIVO a ASISTENTE_ARCHIVO, conservando la misma
fila de usr_rol (mismo id) y por tanto sus UsuarioRol existentes — no se crea
un rol duplicado ni se requiere reasignar usuarios manualmente.

No afecta a GESTOR_DOCUMENTAL, RESPONSABLE_ARCHIVO, ADMIN_GENERAL ni USUARIO.
"""
from django.db import migrations


def renombrar(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')
    rol = Rol.objects.filter(codigo='ARCHIVO').first()
    if rol:
        rol.codigo = 'ASISTENTE_ARCHIVO'
        rol.nombre = 'Asistente de Archivo'
        rol.save(update_fields=['codigo', 'nombre'])


def revertir(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')
    rol = Rol.objects.filter(codigo='ASISTENTE_ARCHIVO').first()
    if rol:
        rol.codigo = 'ARCHIVO'
        rol.save(update_fields=['codigo'])


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_actualizar_catalogo_roles'),
    ]

    operations = [
        migrations.RunPython(renombrar, revertir),
    ]
