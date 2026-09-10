# Operaciones de dominio sobre ítems de bandeja, compartidas por las acciones
# INDIVIDUALES y las MASIVAS — las mismas reglas para 1 o para N documentos
# (mismo patrón que `_validar_envio_papelera` / `_aplicar_envio_papelera`).
from .models import BandejaDocumento, Destinatario, SeguimientoDocumento


class BandejaAccionError(Exception):
    """Un documento no admite la acción de bandeja solicitada. `code` = HTTP status."""

    def __init__(self, mensaje, code=409):
        super().__init__(mensaje)
        self.code = code


# ── Restaurar desde la papelera ('eliminados' → 'en_elaboracion') ────────────
#
# INVARIANTE (verificada en `_validar_envio_papelera`): todo documento que
# llega a 'eliminados' mediante `enviar_papelera` / `eliminar_borrador` provenía
# de 'en_elaboracion' (esa función exige un ítem `bandeja='en_elaboracion'` no
# reasignado). Por eso restaurar SIEMPRE devuelve a 'en_elaboracion' /
# `estado='borrador'`, sin necesidad de guardar bandeja/estado de origen.
#
# Si en una fase futura se permite enviar a la papelera desde otras bandejas
# (Recibidos, Enviados, Archivados…), esta invariante deja de cumplirse y habrá
# que persistir `bandeja_origen` / `estado_origen` en el modelo para devolver
# el documento a su situación anterior. NO generalizar esta función antes de
# ese cambio.
#
# NOTA de alcance: todo documento presente VÁLIDAMENTE en la papelera del
# usuario es restaurable. Las comprobaciones de abajo son de existencia /
# consistencia / autorización / concurrencia — NO reglas de negocio que
# clasifiquen documentos como "no restaurables".
def validar_restauracion(doc, usuario, *, es_admin_bandeja):
    """
    Comprueba que `doc` sigue en condiciones de ser restaurado por `usuario`.
    Devuelve el queryset de ítems de papelera del documento. Lanza
    BandejaAccionError (existencia / autorización / concurrencia).

    Un documento eliminado no tiene "responsable actual" (ya no está en
    `en_elaboracion` de nadie); el permiso se verifica sobre el ítem de
    papelera real (quien lo envió a la papelera) o un admin de bandeja —
    NO sobre `creado_por`, que puede no coincidir tras una reasignación.
    """
    items = BandejaDocumento.objects.filter(documento=doc, bandeja='eliminados')
    if not items.exists():
        # Concurrencia: otra operación ya lo restauró, o el id fue manipulado.
        raise BandejaAccionError('El documento ya no se encuentra en Eliminados.', 409)
    if not items.filter(usuario=usuario).exists() and not es_admin_bandeja:
        raise BandejaAccionError('No tiene permiso sobre este documento.', 403)
    return items


def aplicar_restauracion(doc, usuario, comentario, *, items=None):
    """
    Devuelve TODOS los ítems de papelera del documento a 'en_elaboracion' y
    limpia el soft-delete (`Documento.eliminado_*`, `estado='borrador'`) — ver
    INVARIANTE arriba. Registra el `comentario` recibido en el
    SeguimientoDocumento de ESTE documento (trazabilidad: acción + usuario +
    fecha + documento + comentario). Simétrico con `_aplicar_envio_papelera`.
    Debe llamarse dentro de un `transaction.atomic()`.
    """
    comentario = (comentario or '').strip()
    if items is None:
        items = BandejaDocumento.objects.filter(documento=doc, bandeja='eliminados')
    items.update(bandeja='en_elaboracion', accion_tomada='pendiente')
    doc.estado             = 'borrador'
    doc.eliminado_en       = None
    doc.eliminado_por      = None
    doc.motivo_eliminacion = ''
    doc.save(update_fields=['estado', 'eliminado_en', 'eliminado_por', 'motivo_eliminacion'])
    SeguimientoDocumento.objects.create(
        documento   = doc,
        etapa       = 'restaurado',
        usuario     = usuario,
        unidad      = getattr(usuario, 'unidad', None),
        observacion = comentario,
    )


# ── Reasignar un ítem de bandeja a otro usuario ─────────────────────────────
def validar_reasignacion_bandeja(item, usuario_destino_id):
    """
    Comprueba que `item` (BandejaDocumento) puede reasignarse a
    `usuario_destino_id`. Lanza BandejaAccionError si no procede.
    """
    if not usuario_destino_id:
        raise BandejaAccionError('Debe indicar el usuario destino.', 400)
    if str(usuario_destino_id) == str(item.usuario_id):
        raise BandejaAccionError('El documento ya está en la bandeja de ese usuario.', 409)
    if item.accion_tomada == 'reasignado':
        raise BandejaAccionError('Este documento ya fue reasignado.', 409)
    if item.documento.estado == 'anulado':
        raise BandejaAccionError('Un documento anulado no puede reasignarse.', 409)


def aplicar_reasignacion_bandeja(item, usuario_origen, usuario_destino_id, unidad_id, instrucciones):
    """
    Crea (o reutiliza) el ítem 'recibidos' del usuario destino y marca el ítem
    de origen como 'reasignado'. Debe llamarse dentro de `transaction.atomic()`.
    Misma lógica para la acción individual (`BandejaViewSet.reasignar`) y la
    masiva (`reasignar_lote`).
    """
    BandejaDocumento.objects.get_or_create(
        documento  = item.documento,
        usuario_id = usuario_destino_id,
        bandeja    = 'recibidos',
        defaults={
            'unidad_id':     unidad_id,
            'instrucciones': instrucciones,
            'es_urgente':    item.es_urgente,
            'fecha_limite':  item.fecha_limite,
        },
    )
    item.accion_tomada = 'reasignado'
    item.save(update_fields=['accion_tomada', 'modificado_en'])
    SeguimientoDocumento.objects.create(
        documento   = item.documento,
        etapa       = 'reasignado',
        usuario     = usuario_origen,
        unidad_id   = unidad_id,
        observacion = instrucciones,
    )


# ── Informar / poner un documento EN CONOCIMIENTO de otros usuarios ─────────
#
# QUIPUX "Informar": pone un documento en conocimiento de un usuario adicional
# DESPUÉS de que ya circula. NO transfiere responsabilidad, NO saca el
# documento de la bandeja del emisor, NO es reenviar ni comentar. Lectura
# independiente por receptor.
#
# Distinción de TRAZABILIDAD (se conserva):
#   - "Con copia" inicial (Destinatario.tipo='copia', creado al redactar/enviar)
#     → hoy el receptor lo ve en Recibidos (comportamiento actual sin cambios).
#   - "Informar" posterior (esta función) → Destinatario.tipo='conocimiento' +
#     BandejaDocumento(bandeja='informados', accion_tomada='informado') +
#     SeguimientoDocumento(etapa='informado'). El `accion_tomada='informado'` y
#     la etapa distinguen su origen.
#
# IDEMPOTENTE: informar a un usuario que ya estaba informado del documento no
# crea un segundo registro (se omite silenciosamente y se reporta como omitido).
def aplicar_informar(doc, emisor, usuario_ids, comentario=''):
    """
    Pone `doc` en conocimiento de `usuario_ids`. Debe llamarse dentro de
    `transaction.atomic()`. Devuelve (informados_ahora, ya_estaban) — listas
    de ids. Registra UN SeguimientoDocumento(etapa='informado') por documento
    con los usuarios efectivamente informados en esta operación.
    """
    from apps.usuarios.models import Usuario

    comentario = (comentario or '').strip()
    ya_informados = set(
        BandejaDocumento.objects.filter(documento=doc, bandeja='informados')
        .values_list('usuario_id', flat=True)
    )
    informados_ahora, ya_estaban = [], []
    for uid in usuario_ids:
        uid = int(uid)
        if uid in ya_informados:
            ya_estaban.append(uid)
            continue
        try:
            u = Usuario.objects.select_related('unidad').get(pk=uid)
        except Usuario.DoesNotExist:
            continue
        # Relación de conocimiento (no pisa un Destinatario principal/copia).
        Destinatario.objects.get_or_create(
            documento=doc, usuario=u,
            defaults={'unidad': u.unidad, 'tipo': 'conocimiento'},
        )
        BandejaDocumento.objects.update_or_create(
            documento=doc, usuario=u, bandeja='informados',
            defaults={'accion_tomada': 'informado', 'leido': False,
                      'instrucciones': comentario},
        )
        ya_informados.add(uid)
        informados_ahora.append(uid)

    if informados_ahora:
        nombres = [
            u.nombre_completo for u in Usuario.objects.filter(pk__in=informados_ahora)
        ]
        obs = f'Puesto en conocimiento de: {", ".join(nombres)}'
        if comentario:
            obs += f'. {comentario}'
        SeguimientoDocumento.objects.create(
            documento=doc, etapa='informado', usuario=emisor,
            unidad=getattr(emisor, 'unidad', None), observacion=obs,
        )
    return informados_ahora, ya_estaban


def aplicar_quitar_informado(item):
    """
    Quita la entrada 'informados' del usuario dueño de `item` — retira ESA
    COPIA de conocimiento de su bandeja. NO elimina el Documento institucional
    ni afecta a otros informados / al emisor. Debe llamarse dentro de
    `transaction.atomic()`.
    """
    doc, usuario = item.documento, item.usuario
    item.delete()
    SeguimientoDocumento.objects.create(
        documento=doc, etapa='informado', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=f'{usuario.nombre_completo} retiró el documento de su bandeja Informados.',
    )


# ── Archivar / Restaurar un ítem de bandeja (archivo de GESTIÓN PERSONAL) ──
#
# ARCHIVAR es SOLO organización de bandejas del usuario. NO es expediente,
# archivo institucional, preservación, eliminación, ni transferencia de
# responsabilidad. Según QUIPUX, SOLO se archiva desde Recibidos y Enviados.
#
# El origen se preserva EXPLÍCITAMENTE en `BandejaDocumento.bandeja_origen`
# (SGDA no tiene el equivalente de QUIPUX `usuarios_radicado.radi_usua_tipo`,
# que permite recomputar el tray desde la relación usuario-documento).
#
# `accion_tomada` NO se toca al archivar (opción B): (1) su único consumidor de
# lógica es el valor 'reasignado', que nunca está en Recibidos/Enviados; (2)
# `bandeja='archivados'` ya identifica el estado; (3) el evento queda en
# SeguimientoDocumento + trigger de auditoría; (4) así archive↔restore es un
# toggle SIN pérdida — `leido`, `leido_en`, `instrucciones`, `es_urgente`,
# `numero_referencia`, `fecha_limite` y el `accion_tomada` previo sobreviven
# el viaje redondo automáticamente.
_ORIGENES_ARCHIVABLES = ('recibidos', 'enviados')


def validar_archivado_bandeja(item):
    """Comprueba que `item` puede archivarse. Lanza BandejaAccionError."""
    if item.bandeja not in _ORIGENES_ARCHIVABLES:
        raise BandejaAccionError(
            'Solo se puede archivar un documento que está en Recibidos o Enviados.', 409)
    if item.bandeja_origen:
        # Un ítem en Recibidos/Enviados NO debería tener bandeja_origen (solo lo
        # tiene mientras está archivado). No sobrescribir en silencio.
        raise BandejaAccionError(
            f'Inconsistencia de datos: el ítem en "{item.bandeja}" ya tiene un origen de '
            f'archivado registrado ("{item.bandeja_origen}"). Requiere revisión.', 409)


def aplicar_archivado_bandeja(item, usuario, observacion=''):
    """
    Mueve el ítem a 'archivados' preservando su origen en `bandeja_origen`.
    Debe llamarse dentro de `transaction.atomic()` y tras `validar_archivado_bandeja`.
    """
    validar_archivado_bandeja(item)   # defensa en profundidad
    item.bandeja_origen = item.bandeja
    item.bandeja        = 'archivados'
    item.save(update_fields=['bandeja', 'bandeja_origen', 'modificado_en'])
    SeguimientoDocumento.objects.create(
        documento   = item.documento,
        etapa       = 'archivado',
        usuario     = usuario,
        unidad      = getattr(usuario, 'unidad', None),
        observacion = (observacion or '').strip(),
    )


def validar_desarchivado(item):
    """Comprueba que `item` puede restaurarse desde Archivados. Lanza BandejaAccionError."""
    if item.bandeja != 'archivados':
        raise BandejaAccionError('El documento ya no está en Archivados.', 409)
    if item.bandeja_origen not in _ORIGENES_ARCHIVABLES:
        raise BandejaAccionError(
            'No se puede restaurar: este documento archivado no tiene una bandeja de origen '
            'registrada. Requiere revisión manual.', 409)


def aplicar_desarchivado(item, usuario, observacion=''):
    """
    Devuelve el ítem a su bandeja de origen y limpia `bandeja_origen` (NO es
    histórico). Solo reorganiza la bandeja del usuario — no toca el Documento.
    Debe llamarse dentro de `transaction.atomic()` y tras `validar_desarchivado`.
    """
    destino = item.bandeja_origen
    item.bandeja        = destino
    item.bandeja_origen = None
    item.save(update_fields=['bandeja', 'bandeja_origen', 'modificado_en'])
    etiqueta = {'recibidos': 'Recibidos', 'enviados': 'Enviados'}.get(destino, destino)
    obs = (observacion or '').strip() or f'Restaurado a {etiqueta}.'
    SeguimientoDocumento.objects.create(
        documento   = item.documento,
        etapa       = 'desarchivado',
        usuario     = usuario,
        unidad      = getattr(usuario, 'unidad', None),
        observacion = obs,
    )


# ── Marcar leído un ítem de bandeja ────────────────────────────────────────
def aplicar_marcar_leido_bandeja(item):
    """
    Marca el ítem como leído. IDEMPOTENTE: `leido_en` registra la PRIMERA
    lectura — repetir la operación no corre la fecha ni escribe de nuevo.
    Acción neutra/reversible (no cambia bandeja ni estado del documento).
    """
    from django.utils import timezone
    if not item.leido:
        item.leido = True
        item.leido_en = timezone.now()
        item.save(update_fields=['leido', 'leido_en', 'modificado_en'])


# ── Comentar un ítem de bandeja ────────────────────────────────────────────
def aplicar_comentario_bandeja(item, usuario, comentario):
    """
    Registra un comentario (SeguimientoDocumento) sobre el documento del ítem
    y marca el ítem como 'comentado'. Un SeguimientoDocumento POR documento:
    nunca un registro grupal (preserva la trazabilidad individual).
    Debe llamarse dentro de `transaction.atomic()`.
    """
    SeguimientoDocumento.objects.create(
        documento   = item.documento,
        etapa       = 'comentado',
        usuario     = usuario,
        unidad      = getattr(usuario, 'unidad', None),
        observacion = comentario,
    )
    item.accion_tomada = 'comentado'
    item.save(update_fields=['accion_tomada', 'modificado_en'])
