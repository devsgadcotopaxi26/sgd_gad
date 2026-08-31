"""
Actualiza el catálogo de roles (usr_rol) al nuevo esquema:
  USUARIO, ARCHIVO, GESTOR_DOCUMENTAL, RESPONSABLE_ARCHIVO, ADMIN_GENERAL

- ADMIN_ARCHIVO se renombra a RESPONSABLE_ARCHIVO conservando la misma fila
  (y por tanto sus UsuarioRol existentes), no se crea un rol duplicado.
- ARCHIVO cambia su nombre visible de "Responsable de Archivo" a
  "Asistente de Archivo" (el código 'ARCHIVO' no cambia).
- Se crea GESTOR_DOCUMENTAL como rol nuevo.
- nivel de ADMIN_GENERAL/ARCHIVO/ADMIN_ARCHIVO no cambia (ya estaban en
  10/30/20 respectivamente); GESTOR_DOCUMENTAL se inserta en 25.
"""
from django.db import migrations


def actualizar_roles(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')

    archivo = Rol.objects.filter(codigo='ARCHIVO').first()
    if archivo:
        archivo.nombre = 'Asistente de Archivo'
        archivo.save(update_fields=['nombre'])

    admin_archivo = Rol.objects.filter(codigo='ADMIN_ARCHIVO').first()
    if admin_archivo:
        admin_archivo.codigo = 'RESPONSABLE_ARCHIVO'
        admin_archivo.nombre = 'Responsable de Archivo'
        admin_archivo.save(update_fields=['codigo', 'nombre'])

    Rol.objects.update_or_create(
        codigo='GESTOR_DOCUMENTAL',
        defaults={'nombre': 'Gestor Documental', 'nivel': 25, 'activo': True},
    )

    admin_general = Rol.objects.filter(codigo='ADMIN_GENERAL').first()
    if admin_general and admin_general.nombre != 'Administrador General':
        admin_general.nombre = 'Administrador General'
        admin_general.save(update_fields=['nombre'])


def revertir_roles(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')

    Rol.objects.filter(codigo='GESTOR_DOCUMENTAL').delete()

    responsable = Rol.objects.filter(codigo='RESPONSABLE_ARCHIVO').first()
    if responsable:
        responsable.codigo = 'ADMIN_ARCHIVO'
        responsable.nombre = 'Administrador de Archivo'
        responsable.save(update_fields=['codigo', 'nombre'])

    archivo = Rol.objects.filter(codigo='ARCHIVO').first()
    if archivo:
        archivo.nombre = 'Responsable de Archivo'
        archivo.save(update_fields=['nombre'])


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_usuario_cargo_tipo_usuario_titulo'),
    ]

    operations = [
        migrations.RunPython(actualizar_roles, revertir_roles),
    ]
