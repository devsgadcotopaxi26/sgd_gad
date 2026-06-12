"""
Comando de verificación del sistema antes de producción.
Uso: python manage.py verificar_sistema
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = 'Verifica que el sistema esté listo para producción'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Verificación SGD GAD Cotopaxi ===\n'))
        errores = 0

        checks = [
            self._check_db,
            self._check_apps,
            self._check_usuarios,
            self._check_organigrama,
            self._check_roles,
            self._check_tipos_documento,
            self._check_series_archivo,
            self._check_email,
        ]

        for check in checks:
            try:
                check()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗ ERROR: {e}'))
                errores += 1

        if errores == 0:
            self.stdout.write(self.style.SUCCESS('\n✅ Sistema listo para producción\n'))
        else:
            self.stdout.write(self.style.ERROR(f'\n❌ {errores} error(s) encontrado(s)\n'))

    def _check_db(self):
        connection.ensure_connection()
        self.stdout.write(self.style.SUCCESS('  ✓ Conexión a PostgreSQL OK'))

    def _check_apps(self):
        from django.apps import apps
        apps_sgd = ['usuarios','organizacion','documentos','tramites','correos','archivo','auditoria']
        for app in apps_sgd:
            apps.get_app_config(app)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(apps_sgd)} apps cargadas OK'))

    def _check_usuarios(self):
        from apps.usuarios.models import Usuario
        total = Usuario.objects.count()
        admins = Usuario.objects.filter(is_superuser=True).count()
        self.stdout.write(self.style.SUCCESS(f'  ✓ {total} usuarios ({admins} superusuarios)'))

    def _check_organigrama(self):
        from apps.organizacion.models import Unidad
        total = Unidad.objects.filter(activo=True).count()
        if total == 0:
            raise Exception('No hay unidades en el organigrama')
        self.stdout.write(self.style.SUCCESS(f'  ✓ {total} unidades en el organigrama'))

    def _check_roles(self):
        from apps.usuarios.models import Rol
        total = Rol.objects.filter(activo=True).count()
        if total == 0:
            raise Exception('No hay roles definidos')
        self.stdout.write(self.style.SUCCESS(f'  ✓ {total} roles activos'))

    def _check_tipos_documento(self):
        from apps.documentos.models import TipoDocumento
        total = TipoDocumento.objects.filter(activo=True).count()
        if total == 0:
            raise Exception('No hay tipos de documento')
        self.stdout.write(self.style.SUCCESS(f'  ✓ {total} tipos de documento'))

    def _check_series_archivo(self):
        from apps.archivo.models import Serie
        total = Serie.objects.filter(activo=True).count()
        if total == 0:
            raise Exception('No hay series documentales')
        self.stdout.write(self.style.SUCCESS(f'  ✓ {total} series documentales'))

    def _check_email(self):
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            self.stdout.write(self.style.WARNING('  ⚠ Email en modo consola (desarrollo)'))
        else:
            self.stdout.write(self.style.SUCCESS('  ✓ Email SMTP configurado'))