"""
Servicio de envío de emails automáticos del SGD
"""
from django.core.mail import send_mail
from django.conf import settings


def enviar_email(destinatario: str, asunto: str, cuerpo_html: str):
    """Envía un email institucional del SGD."""
    try:
        send_mail(
            subject     = asunto,
            message     = '',
            html_message= cuerpo_html,
            from_email  = settings.DEFAULT_FROM_EMAIL,
            recipient_list = [destinatario],
            fail_silently  = True,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'Error enviando email a {destinatario}: {e}')


def _base_email(titulo: str, contenido: str, url_accion: str = '', texto_btn: str = '') -> str:
    btn = ''
    if url_accion and texto_btn:
        btn = f"""
        <div style="text-align:center;margin:24px 0">
          <a href="{url_accion}"
             style="background:#002f6c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            {texto_btn}
          </a>
        </div>
        """
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f6fa;margin:0;padding:20px">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#002f6c;padding:20px 28px;display:flex;align-items:center;gap:12px">
          <div>
            <p style="color:#fff;font-size:16px;font-weight:700;margin:0">SGD — GAD Cotopaxi</p>
            <p style="color:rgba(255,255,255,.6);font-size:12px;margin:2px 0 0">Sistema de Gestión Documental</p>
          </div>
        </div>
        <div style="padding:28px">
          <h2 style="font-size:18px;color:#0a1628;margin:0 0 12px">{titulo}</h2>
          {contenido}
          {btn}
        </div>
        <div style="background:#f8faff;padding:14px 28px;border-top:1px solid #f0f0f0;text-align:center">
          <p style="font-size:11px;color:#9ca3af;margin:0">
            Gobierno Autónomo Descentralizado de la Provincia de Cotopaxi<br>
            Este es un mensaje automático, no responder a este correo.
          </p>
        </div>
      </div>
    </body>
    </html>
    """


def email_documento_recibido(usuario_email: str, usuario_nombre: str,
                              numero_doc: str, asunto: str, unidad_origen: str):
    contenido = f"""
    <p style="color:#374151;font-size:14px">Estimado/a <strong>{usuario_nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin-top:8px">
      Has recibido un nuevo documento en tu bandeja del SGD:
    </p>
    <div style="background:#f8faff;border:1px solid #e8f1fd;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px"><strong>N° Documento:</strong> {numero_doc}</p>
      <p style="margin:0 0 6px"><strong>Asunto:</strong> {asunto}</p>
      <p style="margin:0"><strong>Desde:</strong> {unidad_origen}</p>
    </div>
    <p style="color:#6b7280;font-size:13px">
      Ingresa al sistema para revisar y tomar acción sobre este documento.
    </p>
    """
    enviar_email(
        usuario_email,
        f'[SGD] Nuevo documento recibido — {numero_doc}',
        _base_email('Nuevo documento en tu bandeja', contenido, 'http://localhost/documentos', 'Ver documento')
    )


def email_tramite_asignado(usuario_email: str, usuario_nombre: str,
                            numero: str, asunto: str, fecha_limite: str):
    contenido = f"""
    <p style="color:#374151;font-size:14px">Estimado/a <strong>{usuario_nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin-top:8px">
      Se te ha asignado un trámite ciudadano para atención:
    </p>
    <div style="background:#f8faff;border:1px solid #e8f1fd;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px"><strong>N° Trámite:</strong> {numero}</p>
      <p style="margin:0 0 6px"><strong>Asunto:</strong> {asunto}</p>
      <p style="margin:0;color:#da291c"><strong>Fecha límite:</strong> {fecha_limite}</p>
    </div>
    """
    enviar_email(
        usuario_email,
        f'[SGD] Trámite asignado — {numero}',
        _base_email('Trámite ciudadano asignado', contenido, 'http://localhost/tramites', 'Ver trámite')
    )


def email_tramite_vence(usuario_email: str, usuario_nombre: str,
                         numero: str, asunto: str, dias: int):
    color   = '#da291c' if dias <= 0 else '#c2410c' if dias <= 2 else '#854f0b'
    mensaje = 'venció hoy' if dias <= 0 else f'vence en {dias} día(s)'
    contenido = f"""
    <p style="color:#374151;font-size:14px">Estimado/a <strong>{usuario_nombre}</strong>,</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;color:{color}"><strong>⚠ ALERTA DE VENCIMIENTO</strong></p>
      <p style="margin:0 0 6px"><strong>N° Trámite:</strong> {numero}</p>
      <p style="margin:0 0 6px"><strong>Asunto:</strong> {asunto}</p>
      <p style="margin:0;color:{color}"><strong>El plazo {mensaje}</strong></p>
    </div>
    """
    enviar_email(
        usuario_email,
        f'[SGD] ⚠ Alerta vencimiento — {numero}',
        _base_email('Alerta: trámite próximo a vencer', contenido, 'http://localhost/tramites', 'Ver trámite')
    )


def email_correo_recibido(usuario_email: str, usuario_nombre: str,
                           numero_registro: str, asunto: str, remitente: str):
    contenido = f"""
    <p style="color:#374151;font-size:14px">Estimado/a <strong>{usuario_nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin-top:8px">
      Has recibido un nuevo correo institucional:
    </p>
    <div style="background:#f8faff;border:1px solid #e8f1fd;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px"><strong>N° Registro:</strong> {numero_registro}</p>
      <p style="margin:0 0 6px"><strong>Asunto:</strong> {asunto}</p>
      <p style="margin:0"><strong>Remitente:</strong> {remitente}</p>
    </div>
    """
    enviar_email(
        usuario_email,
        f'[SGD] Nuevo correo institucional — {numero_registro}',
        _base_email('Nuevo correo en tu bandeja', contenido, 'http://localhost/correos', 'Ver correo')
    )


def email_notificacion_ciudadano(ciudadano_email: str, ciudadano_nombre: str,
                                  numero: str, asunto: str, nuevo_estado: str):
    contenido = f"""
    <p style="color:#374151;font-size:14px">Estimado/a <strong>{ciudadano_nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin-top:8px">
      El estado de su trámite ha sido actualizado:
    </p>
    <div style="background:#f8faff;border:1px solid #e8f1fd;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px"><strong>N° Trámite:</strong> {numero}</p>
      <p style="margin:0 0 6px"><strong>Asunto:</strong> {asunto}</p>
      <p style="margin:0;color:#002f6c"><strong>Estado actual:</strong> {nuevo_estado}</p>
    </div>
    <p style="color:#6b7280;font-size:13px">
      Puede consultar el estado de su trámite en el portal ciudadano.
    </p>
    """
    enviar_email(
        ciudadano_email,
        f'[GAD Cotopaxi] Actualización de su trámite — {numero}',
        _base_email('Actualización de su trámite', contenido,
                    f'http://localhost/portal?numero={numero}', 'Consultar mi trámite')
    )