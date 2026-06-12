from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def alertas_vencimiento():
    """Tarea diaria: envía alertas de vencimiento de trámites."""
    from apps.tramites.models import Tramite
    from apps.auditoria.emails import email_tramite_vence

    hoy      = timezone.now().date()
    limite   = hoy + timedelta(days=3)

    tramites = Tramite.objects.select_related(
        'persona', 'usuario_asignado', 'unidad_responsable'
    ).filter(
        fecha_limite__lte=limite,
        estado__in=['ingresado', 'asignado', 'en_proceso'],
    )

    enviados = 0
    for tramite in tramites:
        dias = (tramite.fecha_limite - hoy).days

        # Notificar al analista asignado
        if tramite.usuario_asignado and tramite.usuario_asignado.email:
            email_tramite_vence(
                tramite.usuario_asignado.email,
                tramite.usuario_asignado.nombre_completo,
                tramite.numero_tramite,
                tramite.asunto,
                dias,
            )
            enviados += 1

        # Notificar al ciudadano si tiene email
        if tramite.persona.notificacion_email and tramite.persona.email and dias == 1:
            from apps.auditoria.emails import email_notificacion_ciudadano
            email_notificacion_ciudadano(
                tramite.persona.email,
                tramite.persona.nombre_completo,
                tramite.numero_tramite,
                tramite.asunto,
                'Por vencer mañana',
            )

    return f'Alertas enviadas: {enviados}'


@shared_task
def notificacion_documento_recibido(bandeja_id: int):
    """Notifica por email cuando se envía un documento a una bandeja."""
    from apps.documentos.models import BandejaDocumento
    from apps.auditoria.emails import email_documento_recibido

    try:
        bandeja = BandejaDocumento.objects.select_related(
            'usuario', 'documento__tipo_documento', 'documento__unidad_origen'
        ).get(id=bandeja_id)

        if bandeja.usuario.email:
            email_documento_recibido(
                bandeja.usuario.email,
                bandeja.usuario.nombre_completo,
                bandeja.documento.numero_documento or 'Sin número',
                bandeja.documento.asunto,
                bandeja.documento.unidad_origen.nombre,
            )
    except Exception:
        pass

@shared_task
def backup_database():
    """Tarea diaria: ejecuta pg_dump del sistema."""
    import subprocess
    from datetime import datetime
    import os

    fecha    = datetime.now().strftime('%Y%m%d_%H%M%S')
    directorio = '/app/backups'
    os.makedirs(directorio, exist_ok=True)
    archivo  = f'{directorio}/sgd_gad_{fecha}.dump'

    resultado = subprocess.run([
        'pg_dump',
        '-h', os.environ.get('DB_HOST', 'host.docker.internal'),
        '-p', os.environ.get('DB_PORT', '5432'),
        '-U', os.environ.get('DB_USER', 'postgres'),
        '-F', 'c',
        '-f', archivo,
        os.environ.get('DB_NAME', 'sgd_gad_cotopaxi'),
    ], env={**os.environ, 'PGPASSWORD': os.environ.get('DB_PASSWORD', 'sgd2026')},
    capture_output=True)

    if resultado.returncode == 0:
        return f'Backup exitoso: {archivo}'
    else:
        return f'Error backup: {resultado.stderr.decode()}'