# Reglas de negocio para la transición de un documento a estado ENVIADO.
# Punto único de validación para que ningún endpoint pueda marcar un
# documento como enviado sin tipo, asunto y al menos un destinatario.
from django.utils import timezone


class DocumentoInvalidoError(Exception):
    """El documento no cumple las condiciones mínimas para guardarse/enviarse."""


def validar_documento_minimo(doc):
    """Tipo de documento y asunto: obligatorios para guardar, previsualizar o enviar."""
    if not doc.tipo_documento_id:
        raise DocumentoInvalidoError('Seleccione el tipo de documento.')
    if not (doc.asunto or '').strip():
        raise DocumentoInvalidoError('Ingrese el asunto.')


def tiene_destinatario_valido(doc):
    """>=1 destinatario PRINCIPAL ("Para") interno con usuario. Un documento de
    copia/conocimiento sin ningún "Para" no es un envío válido."""
    return doc.destinatarios.filter(usuario__isnull=False, tipo='principal').exists()


def validar_documento_enviable(doc):
    """
    Reglas mínimas para OFICIALIZAR un documento (enviar O firmar): tipo,
    asunto y al menos un destinatario PRINCIPAL. Punto ÚNICO — invocado por
    `enviar`, firma física, firma electrónica y `cambiar_estado` →
    enviado/firmado. Ningún endpoint debe poder oficializar sin "Para".
    """
    validar_documento_minimo(doc)
    if not tiene_destinatario_valido(doc):
        raise DocumentoInvalidoError('Seleccione al menos un destinatario (Para).')


def marcar_documento_enviado(doc):
    """
    Única regla de negocio para la transición BORRADOR -> ENVIADO de un
    documento propio (DocumentoViewSet.enviar). Debe invocarse dentro de
    una transaction.atomic() que también cubra el movimiento de bandejas,
    de forma que cualquier fallo posterior revierta también este cambio
    de estado: nunca debe quedar `estado=enviado` con 0 destinatarios.
    """
    if doc.estado == 'enviado':
        raise DocumentoInvalidoError('El documento ya fue enviado.')
    validar_documento_enviable(doc)
    doc.estado = 'enviado'
    doc.fecha_envio = timezone.now()
    doc.save(update_fields=['estado', 'fecha_envio'])


def validar_lista_destinatarios(destinatarios_internos, destinatarios_externos):
    """
    Usado por EnviarDocumentoView (flujo "Distribuir"): ese endpoint no
    parte de un borrador con destinatarios ya guardados, sino que recibe
    la lista de destinatarios en la misma solicitud. Valida que incluya
    al menos un destinatario interno o externo antes de crear ninguna
    asociación ni marcar el documento como enviado.
    """
    internos_validos = [d for d in (destinatarios_internos or []) if d.get('usuario_id')]
    if not internos_validos and not (destinatarios_externos or []):
        raise DocumentoInvalidoError('Seleccione al menos un destinatario.')
    return internos_validos
