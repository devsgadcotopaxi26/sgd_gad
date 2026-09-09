# ACL de LECTURA de documentos — fuente ÚNICA de autorización de visibilidad.
#
# Un usuario puede consultar un `Documento` si tiene RELACIÓN con él:
#   - lo creó (`creado_por`), es su remitente (`remitente`) o lo firmó (`firmado_por`)
#   - es Destinatario de cualquier tipo: principal / copia / conocimiento
#   - lo tiene en ALGUNA de sus bandejas (`BandejaDocumento`): recibidos,
#     enviados, en_elaboracion (incl. 'reasignado', que es físicamente
#     en_elaboracion), no_enviados, archivados, informados, eliminados,
#     por_imprimir, tareas_recibidas, tareas_enviadas
#   - o es "admin de bandeja" (superuser / ADMIN_GENERAL / RESPONSABLE_ARCHIVO):
#     ve todos, por responsabilidad documental.
#
# Estar ASOCIADO (Documento.responde_a) NO concede acceso — la asociación
# expresa relación documental, no autorización.
from django.db.models import Q


def _es_admin_lectura(usuario):
    # Mismo criterio que `views._es_admin_bandeja` (se replica aquí para no
    # crear un import circular views <-> acl).
    return usuario.is_superuser or usuario.roles.filter(
        rol__codigo__in=['ADMIN_GENERAL', 'RESPONSABLE_ARCHIVO'], activo=True,
    ).exists()


def filtro_visibilidad_documento(usuario):
    """Q(...) para filtrar un queryset de `Documento` a los visibles por `usuario`."""
    return (
        Q(creado_por=usuario)
        | Q(remitente=usuario)
        | Q(firmado_por=usuario)
        | Q(destinatarios__usuario=usuario)
        | Q(bandejas__usuario=usuario)
    )


def documentos_visibles_para(usuario, es_admin=None):
    """
    Queryset de `Documento` visibles por `usuario`. `es_admin=None` → se
    calcula con `_es_admin_lectura`. Admin → todos. Aplica `.distinct()`
    (los JOIN a bandejas/destinatarios producen duplicados).
    """
    from .models import Documento
    if es_admin is None:
        es_admin = _es_admin_lectura(usuario)
    qs = Documento.objects.all()
    if es_admin:
        return qs
    return qs.filter(filtro_visibilidad_documento(usuario)).distinct()


def puede_ver_documento(usuario, doc, es_admin=None):
    """True si `usuario` puede consultar `doc`. Punto único para APIView sueltas
    (PDF, anexos, asociados…) que no pasan por `DocumentoViewSet.get_queryset`."""
    if es_admin is None:
        es_admin = _es_admin_lectura(usuario)
    if es_admin:
        return True
    return documentos_visibles_para(usuario, False).filter(pk=doc.pk).exists()
