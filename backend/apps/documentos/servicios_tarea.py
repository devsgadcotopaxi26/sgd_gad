# Ciclo de vida de Tarea (doc_tarea), compartido por endpoints individuales.
#
# Reglas (derivadas del modelo `Tarea`, no de nombres sueltos):
#   pendiente ──(asignado: iniciar)──▶ en_proceso
#   pendiente | en_proceso ──(asignado: completar + respuesta)──▶ completada
#   pendiente | en_proceso ──(creador: cancelar)──▶ cancelada
#   (completada / cancelada: estados terminales, sin acciones)
#
# La tarea NO transfiere responsabilidad documental: NUNCA toca
# `Documento.estado`, `remitente`, `creado_por` ni las bandejas
# recibidos/enviados. Solo `doc_tarea` + `SeguimientoDocumento` (recorrido).
from django.utils import timezone

from .models import Tarea, BandejaDocumento, SeguimientoDocumento


class TareaError(Exception):
    """Transición de tarea no permitida. `code` = HTTP status."""

    def __init__(self, mensaje, code=409):
        super().__init__(mensaje)
        self.code = code


_ETIQUETA = {
    'pendiente': 'Pendiente', 'en_proceso': 'En proceso',
    'completada': 'Completada', 'cancelada': 'Cancelada',
}
_ACTIVAS = ('pendiente', 'en_proceso')


def _seg(tarea, usuario, etapa, obs):
    SeguimientoDocumento.objects.create(
        documento=tarea.documento, etapa=etapa, usuario=usuario,
        unidad=getattr(usuario, 'unidad', None), observacion=obs,
        tarea=tarea,      # relación estructurada: qué Tarea originó el evento
    )


def _limpiar_bandeja_recibidas(tarea):
    """Si el asignado ya no tiene tareas ACTIVAS sobre este documento, quita el
    ítem de su bandeja Tareas Recibidas (como QUIPUX, que solo lista estado=1).
    Tareas Enviadas del creador NO se limpia — conserva el histórico."""
    hay_activas = Tarea.objects.filter(
        documento_id=tarea.documento_id, asignada_a_id=tarea.asignada_a_id,
        estado__in=_ACTIVAS,
    ).exists()
    if not hay_activas:
        BandejaDocumento.objects.filter(
            documento_id=tarea.documento_id, usuario_id=tarea.asignada_a_id,
            bandeja='tareas_recibidas',
        ).delete()


# ── Crear ──────────────────────────────────────────────────────────────────
def crear_tarea(*, documento, creado_por, asignada_a_id, descripcion,
                prioridad='normal', unidad_id=None, fecha_limite=None):
    """Crea la tarea + los ítems de bandeja Tareas Recibidas/Enviadas + rastro.
    Debe llamarse dentro de `transaction.atomic()`."""
    if not asignada_a_id:
        raise TareaError('Debe indicar a quién se asigna la tarea.', 400)
    if str(asignada_a_id) == str(getattr(creado_por, 'id', creado_por)):
        raise TareaError('No puede asignarse una tarea a usted mismo.', 400)
    if not (descripcion or '').strip():
        raise TareaError('La descripción de la tarea es obligatoria.', 400)

    tarea = Tarea.objects.create(
        documento=documento, asignada_por=creado_por, asignada_a_id=asignada_a_id,
        unidad_destino_id=unidad_id, descripcion=descripcion.strip(),
        prioridad=(prioridad or 'normal'), fecha_limite=fecha_limite or None,
    )
    BandejaDocumento.objects.get_or_create(
        documento=documento, usuario_id=asignada_a_id, bandeja='tareas_recibidas',
        defaults={'instrucciones': descripcion.strip()},
    )
    BandejaDocumento.objects.get_or_create(
        documento=documento, usuario=creado_por, bandeja='tareas_enviadas',
    )
    _seg(tarea, creado_por, 'tarea_creada',
         f'Tarea asignada a {tarea.asignada_a.nombre_completo}: {tarea.descripcion}')
    return tarea


# ── Transiciones ───────────────────────────────────────────────────────────
def iniciar_tarea(tarea, usuario):
    if usuario.id != tarea.asignada_a_id:
        raise TareaError('Solo la persona asignada puede iniciar la tarea.', 403)
    if tarea.estado != 'pendiente':
        raise TareaError(f'Solo se puede iniciar una tarea pendiente (está "{_ETIQUETA.get(tarea.estado, tarea.estado)}").', 409)
    tarea.estado = 'en_proceso'
    tarea.save(update_fields=['estado'])
    _seg(tarea, usuario, 'tarea_iniciada', 'Tarea iniciada.')


def completar_tarea(tarea, usuario, respuesta):
    if usuario.id != tarea.asignada_a_id:
        raise TareaError('Solo la persona asignada puede completar la tarea.', 403)
    if tarea.estado not in _ACTIVAS:
        raise TareaError(f'La tarea ya está "{_ETIQUETA.get(tarea.estado, tarea.estado)}".', 409)
    respuesta = (respuesta or '').strip()
    if not respuesta:
        raise TareaError('Debe registrar una respuesta para completar la tarea.', 400)
    tarea.estado = 'completada'
    tarea.respuesta = respuesta
    tarea.completada_en = timezone.now()
    tarea.save(update_fields=['estado', 'respuesta', 'completada_en'])
    _seg(tarea, usuario, 'tarea_completada', f'Tarea completada. Respuesta: {respuesta}')
    _limpiar_bandeja_recibidas(tarea)


def cancelar_tarea(tarea, usuario, motivo=''):
    if usuario.id != tarea.asignada_por_id:
        raise TareaError('Solo quien creó la tarea puede cancelarla.', 403)
    if tarea.estado not in _ACTIVAS:
        raise TareaError(f'La tarea ya está "{_ETIQUETA.get(tarea.estado, tarea.estado)}".', 409)
    tarea.estado = 'cancelada'
    tarea.save(update_fields=['estado'])
    obs = 'Tarea cancelada por quien la asignó.'
    if (motivo or '').strip():
        obs += f' Motivo: {motivo.strip()}'
    _seg(tarea, usuario, 'tarea_cancelada', obs)
    _limpiar_bandeja_recibidas(tarea)
