# Carpetas Virtuales (F2-F) — lógica de dominio.
#
# Semántica: CLASIFICACIÓN OPERATIVA de una Unidad. No toca el documento, su
# estado, bandeja, responsable ni destinatarios. Independiente de Documentos
# Asociados y del módulo formal de Archivo/Expedientes.
#
# ─────────────────────────────────────────────────────────────────────────────
# REGLAS FUNCIONALES SGDA (F2-F):
#
#  R1. Los documentos EN ELABORACIÓN no pueden clasificarse en Carpetas
#      Virtuales. La regla depende del ESTADO/FLUJO real del documento
#      (`estado in ('borrador', 'en_revision')` → rechazado), NO de la bandeja
#      ni de que el botón esté oculto. Un borrador puede estar incompleto,
#      puede no enviarse nunca, y la carpeta es compartida por la unidad:
#      no se llena el árbol con documentos no consolidados ni se expone qué
#      está preparando un usuario.
#
#  R2. La ADMINISTRACIÓN del árbol (crear / renombrar / mover / desactivar /
#      reactivar carpetas) es EXCLUSIVA de ADMIN_GENERAL (o superusuario).
#      RESPONSABLE_ARCHIVO NO administra Carpetas Virtuales por su rol
#      (Carpetas Virtuales no es el módulo formal de Archivo). En el futuro
#      podría introducirse un rol/permiso `GESTOR_CARPETAS_VIRTUALES`; por
#      ahora no se crea.
#
#  R3. El USUARIO NORMAL de una unidad puede: consultar el árbol de SU unidad,
#      consultar los documentos a los que tenga ACL, y clasificar /
#      reclasificar / quitar de carpeta documentos formalizados de su unidad.
#      NO puede crear/renombrar/mover/desactivar/reactivar carpetas.
#
#  R4. Eliminar una carpeta = DESACTIVACIÓN LÓGICA (`activa=False`) recursiva
#      de todo su subárbol. Nunca borra físicamente la fila ni toca
#      Documento / DocumentoCarpetaVirtual / bandejas / Docs. Asociados /
#      Expedientes.
#
#  R5. MATRIZ DE BANDEJAS (auditoría QUIPUX específica de Carpetas Virtuales).
#      Un usuario NO admin solo puede clasificar un documento que tenga en una
#      bandeja "de contexto clasificable":
#         Recibidos · Enviados · Archivados · Tareas Recibidas · Tareas Enviadas
#      NO: En Elaboración · No Enviados · Reasignados · Informados · Eliminados.
#      Se valida en el endpoint, no solo en la UI. (Única desviación de la
#      matriz QUIPUX: "En Elaboración = SÍ" en QUIPUX → "NO" en SGDA, por R1.)
#      Desde Tareas se clasifica el DOCUMENTO (`BandejaDocumento.documento`),
#      nunca el objeto Tarea — coherente con F2-D (1 ítem de bandeja por
#      Documento aunque haya varias tareas).
# ─────────────────────────────────────────────────────────────────────────────
#
# Trazabilidad: DECISIÓN SGDA (no equivalencia con QUIPUX).
#   QUIPUX — clasificar un documento en Carpeta Virtual (TRD):
#       individual → hist_eventos_radicados, transacción 32
#       lote       → hist_eventos_radicados, transacción 88
#   QUIPUX — crear / renombrar / eliminar estructura TRD: no genera hist_eventos.
#   SGDA — clasificar / reclasificar / quitar de carpeta, y CRUD de carpetas:
#       → `aud_log` (trigger `fn_auditoria`)
#       → NUNCA `SeguimientoDocumento`
#   SGDA deja la clasificación FUERA del Recorrido del documento a propósito
#   (evitar ruido administrativo). Las transacciones 32/88 son de Carpetas
#   Virtuales, NO de Documentos Asociados: F2-E conserva su propia trazabilidad
#   en `SeguimientoDocumento` (asociar/desasociar/responder) y no se mezcla.
from django.db import transaction
from django.db.models import Count, Q

from .acl_documentos import documentos_visibles_para
from .models import (
    CarpetaVirtual, DocumentoCarpetaVirtual, Documento, BandejaDocumento,
    _norm_nombre_carpeta,
)

_MAX_PROFUNDIDAD = 50

# R1 — estados en los que el documento sigue "en elaboración": no clasificable.
ESTADOS_EN_ELABORACION = {'borrador', 'en_revision'}

# R5 — bandejas desde las que un usuario NO admin puede clasificar un documento.
BANDEJAS_CLASIFICABLES = {
    'recibidos', 'enviados', 'archivados', 'tareas_recibidas', 'tareas_enviadas',
}


class CarpetaError(Exception):
    def __init__(self, mensaje, code=400):
        super().__init__(mensaje)
        self.code = code


# ── Permisos ───────────────────────────────────────────────────────────────
def es_admin_carpetas(usuario) -> bool:
    """R2 — administra el árbol de Carpetas Virtuales: superusuario técnico o
    rol ADMIN_GENERAL. RESPONSABLE_ARCHIVO NO (Carpetas Virtuales no es el
    módulo formal de Archivo)."""
    return bool(getattr(usuario, 'is_superuser', False)) or usuario.roles.filter(
        rol__codigo='ADMIN_GENERAL', activo=True,
    ).exists()


def puede_gestionar_unidad(usuario, unidad_id) -> bool:
    """R2/R3 — crear/renombrar/mover/desactivar/reactivar carpetas: SOLO
    ADMIN_GENERAL / superusuario. La pertenencia a la unidad NO basta."""
    return es_admin_carpetas(usuario)


def puede_clasificar_en_unidad(usuario, unidad_id) -> bool:
    """R3 — clasificar/reclasificar/quitar documentos para una unidad: ser
    miembro de esa unidad, o admin de carpetas."""
    if es_admin_carpetas(usuario):
        return True
    return getattr(usuario, 'unidad_id', None) == int(unidad_id)


def unidades_visibles(usuario):
    """IDs de unidad cuyos árboles puede VER el usuario. Miembro → su unidad;
    admin de carpetas → todas (None = sin restricción)."""
    if es_admin_carpetas(usuario):
        return None
    return {getattr(usuario, 'unidad_id', None)}


# ── Árbol / ciclos ─────────────────────────────────────────────────────────
def _ancestros(carpeta):
    vistos, actual, n = [], carpeta.padre, 0
    while actual is not None and n < _MAX_PROFUNDIDAD:
        vistos.append(actual)
        actual, n = actual.padre, n + 1
    return vistos


def _validar_padre(unidad_id, padre, *, carpeta=None):
    if padre is None:
        return
    if padre.unidad_id != unidad_id:
        raise CarpetaError('La carpeta padre pertenece a otra unidad.', 409)
    if not padre.activa:
        raise CarpetaError('La carpeta padre está desactivada.', 409)
    if carpeta is not None:
        if padre.id == carpeta.id:
            raise CarpetaError('Una carpeta no puede ser su propia padre.', 409)
        if carpeta.id in {a.id for a in _ancestros(padre)}:
            raise CarpetaError('No se puede mover una carpeta dentro de una de sus descendientes.', 409)


def _subarbol_ids(carpeta_id):
    """IDs de `carpeta_id` + TODOS sus descendientes."""
    ids, pendientes = [carpeta_id], [carpeta_id]
    while pendientes:
        hijos = list(CarpetaVirtual.objects.filter(padre_id__in=pendientes)
                     .values_list('id', flat=True))
        nuevos = [h for h in hijos if h not in ids]
        ids.extend(nuevos)
        pendientes = nuevos
    return ids


def _nombre_libre(unidad_id, padre_id, nombre, *, excluir_id=None):
    norm = _norm_nombre_carpeta(nombre)
    if not norm:
        raise CarpetaError('El nombre de la carpeta es obligatorio.', 400)
    # Solo colisionan carpetas ACTIVAS (una carpeta desactivada libera su
    # nombre para que se pueda recrear — coherente con el constraint parcial).
    qs = CarpetaVirtual.objects.filter(
        unidad_id=unidad_id, padre_id=padre_id, nombre_norm=norm, activa=True,
    )
    if excluir_id:
        qs = qs.exclude(pk=excluir_id)
    if qs.exists():
        raise CarpetaError(f'Ya existe una carpeta "{nombre.strip()}" en el mismo nivel.', 409)


# ── CRUD de carpetas ───────────────────────────────────────────────────────
def crear_carpeta(usuario, *, unidad_id, nombre, padre_id=None):
    if not puede_gestionar_unidad(usuario, unidad_id):
        raise CarpetaError('No tiene permiso para gestionar carpetas de esta unidad.', 403)
    padre = None
    if padre_id:
        padre = CarpetaVirtual.objects.filter(pk=padre_id).first()
        if padre is None:
            raise CarpetaError('La carpeta padre no existe.', 404)
    _validar_padre(int(unidad_id), padre)
    _nombre_libre(unidad_id, padre_id, nombre)
    return CarpetaVirtual.objects.create(
        unidad_id=unidad_id, nombre=nombre, padre=padre, creada_por=usuario,
    )


def renombrar_carpeta(usuario, carpeta, nombre):
    if not puede_gestionar_unidad(usuario, carpeta.unidad_id):
        raise CarpetaError('No tiene permiso para gestionar carpetas de esta unidad.', 403)
    _nombre_libre(carpeta.unidad_id, carpeta.padre_id, nombre, excluir_id=carpeta.id)
    carpeta.nombre = nombre
    carpeta.save(update_fields=['nombre', 'nombre_norm', 'actualizado_en'])
    return carpeta


def mover_carpeta(usuario, carpeta, nuevo_padre_id):
    if not puede_gestionar_unidad(usuario, carpeta.unidad_id):
        raise CarpetaError('No tiene permiso para gestionar carpetas de esta unidad.', 403)
    nuevo_padre = None
    if nuevo_padre_id:
        nuevo_padre = CarpetaVirtual.objects.filter(pk=nuevo_padre_id).first()
        if nuevo_padre is None:
            raise CarpetaError('La carpeta padre no existe.', 404)
    _validar_padre(carpeta.unidad_id, nuevo_padre, carpeta=carpeta)
    _nombre_libre(carpeta.unidad_id, nuevo_padre_id, carpeta.nombre, excluir_id=carpeta.id)
    carpeta.padre = nuevo_padre
    carpeta.save(update_fields=['padre', 'actualizado_en'])
    return carpeta


def desactivar_carpeta(usuario, carpeta):
    """
    R4 — DESACTIVACIÓN LÓGICA RECURSIVA. Marca `activa=False` en la carpeta y
    en TODO su subárbol (opción más segura: una carpeta padre no puede quedar
    activa colgando de una desactivada, y no se pierde ninguna estructura).

    NUNCA borra la fila, ni toca Documento / DocumentoCarpetaVirtual (las
    clasificaciones se conservan intactas) / bandejas / Docs. Asociados /
    Expedientes. Una carpeta desactivada:
      - desaparece del árbol de la unidad (salvo consulta admin explícita);
      - no admite nuevas clasificaciones (409 'inactiva');
      - libera su nombre para poder recrear una carpeta homónima.
    Auditada por `aud_log` (trigger), NO por SeguimientoDocumento.
    """
    if not puede_gestionar_unidad(usuario, carpeta.unidad_id):
        raise CarpetaError('No tiene permiso para administrar carpetas.', 403)
    if not carpeta.activa:
        raise CarpetaError('La carpeta ya está desactivada.', 409)
    ids = _subarbol_ids(carpeta.id)
    with transaction.atomic():
        # save() por fila para que el trigger de auditoría registre cada una.
        for c in CarpetaVirtual.objects.filter(pk__in=ids, activa=True):
            c.activa = False
            c.save(update_fields=['activa', 'actualizado_en'])
    return len(ids)


def activar_carpeta(usuario, carpeta):
    """Reactiva SOLO esta carpeta (no el subárbol). Su padre debe estar activo
    (no se puede reactivar una rama colgando de una carpeta desactivada)."""
    if not puede_gestionar_unidad(usuario, carpeta.unidad_id):
        raise CarpetaError('No tiene permiso para administrar carpetas.', 403)
    if carpeta.activa:
        raise CarpetaError('La carpeta ya está activa.', 409)
    if carpeta.padre_id and not CarpetaVirtual.objects.filter(pk=carpeta.padre_id, activa=True).exists():
        raise CarpetaError('Reactive primero la carpeta padre.', 409)
    # El nombre debe seguir libre entre las hermanas activas.
    _nombre_libre(carpeta.unidad_id, carpeta.padre_id, carpeta.nombre, excluir_id=carpeta.id)
    carpeta.activa = True
    carpeta.save(update_fields=['activa', 'actualizado_en'])
    return carpeta


# ── Consulta del árbol ─────────────────────────────────────────────────────
def _clasificaciones_visibles(usuario, unidad_id, carpeta_ids):
    """
    `DocumentoCarpetaVirtual` "visibles" en la vista de carpeta — la FUENTE
    ÚNICA que usan por igual `arbol_unidad` (para `n_docs`) y
    `documentos_de_carpeta` (para la lista), de modo que contador y lista
    SIEMPRE coinciden:
      · misma unidad y carpeta(s);
      · documento NO en `borrador` / `en_revision` (R1 — incluye borradores
        históricos migrados: la fila se conserva pero no cuenta ni se lista);
      · documento NO en papelera (`eliminado_en`);
      · documento dentro de la ACL de lectura del usuario (F2-E). Si la ACL
        del usuario ya es total (`_es_admin_lectura`: superuser / ADMIN_GENERAL
        / RESPONSABLE_ARCHIVO) se omite el subfiltro — no hay N+1.
    """
    from .acl_documentos import _es_admin_lectura
    qs = (DocumentoCarpetaVirtual.objects
          .filter(unidad_id=unidad_id, carpeta_id__in=carpeta_ids)
          .exclude(documento__estado__in=ESTADOS_EN_ELABORACION)
          .filter(documento__eliminado_en__isnull=True))
    if not _es_admin_lectura(usuario):
        qs = qs.filter(
            documento_id__in=documentos_visibles_para(usuario, False).values('pk')
        )
    return qs


def arbol_unidad(usuario, unidad_id, *, incluir_inactivas=False):
    """Lista plana de carpetas de la unidad + `n_docs` (documentos DIRECTOS
    visibles, sin subcarpetas — coherente con la lista de la carpeta).
    El frontend arma la jerarquía con `padre`. Por defecto solo carpetas
    ACTIVAS; `incluir_inactivas=True` (solo admin de carpetas) las incluye."""
    vis = unidades_visibles(usuario)
    if vis is not None and int(unidad_id) not in {u for u in vis if u is not None}:
        raise CarpetaError('No tiene acceso a las carpetas de esta unidad.', 403)
    ver_inactivas = incluir_inactivas and es_admin_carpetas(usuario)

    carpetas = CarpetaVirtual.objects.filter(unidad_id=unidad_id)
    if not ver_inactivas:
        carpetas = carpetas.filter(activa=True)
    carpetas = list(carpetas.order_by('nombre'))
    ids = [c.id for c in carpetas]

    # 1 sola consulta de agregación para TODAS las carpetas (sin N+1).
    conteos = dict(
        _clasificaciones_visibles(usuario, unidad_id, ids)
        .values_list('carpeta_id').annotate(n=Count('documento_id', distinct=True))
    ) if ids else {}

    return [{
        'id': c.id, 'nombre': c.nombre, 'padre': c.padre_id,
        'activa': c.activa, 'n_docs': conteos.get(c.id, 0),
    } for c in carpetas]


def documentos_de_carpeta(usuario, carpeta, *, incluir_subcarpetas=False):
    """Documentos clasificados en `carpeta` (opcionalmente en sus descendientes).
    Misma regla de visibilidad que `n_docs` (`_clasificaciones_visibles`):
    ACL de lectura F2-E + sin borrador/en_revision + sin papelera. La carpeta
    NO concede acceso."""
    vis = unidades_visibles(usuario)
    if vis is not None and carpeta.unidad_id not in {u for u in vis if u is not None}:
        raise CarpetaError('No tiene acceso a las carpetas de esta unidad.', 403)

    carpeta_ids = _subarbol_ids(carpeta.id) if incluir_subcarpetas else [carpeta.id]
    doc_ids = list(
        _clasificaciones_visibles(usuario, carpeta.unidad_id, carpeta_ids)
        .values_list('documento_id', flat=True)
    )
    return (Documento.objects.filter(pk__in=doc_ids)
            .select_related('tipo_documento', 'unidad_origen', 'creado_por', 'remitente')
            .order_by('-creado_en'))


# ── Clasificación de documentos ────────────────────────────────────────────
def _unidad_clasificacion(usuario, carpeta):
    """R3 — la unidad para la que se clasifica es SIEMPRE la de la carpeta. Un
    usuario solo puede clasificar en carpetas de su propia unidad (o admin de
    carpetas)."""
    if not puede_clasificar_en_unidad(usuario, carpeta.unidad_id):
        raise CarpetaError('Solo puede clasificar documentos en carpetas de su unidad.', 403)
    return carpeta.unidad_id


def _contexto_bandeja_permite(usuario, doc, *, es_admin):
    """R5 — un usuario NO admin solo clasifica un documento que tenga en una
    bandeja de contexto clasificable (Recibidos / Enviados / Archivados /
    Tareas Recibidas / Tareas Enviadas). Reasignados (físicamente
    'en_elaboracion'), No Enviados, Informados y Eliminados NO habilitan."""
    if es_admin:
        return True
    return BandejaDocumento.objects.filter(
        documento=doc, usuario=usuario, bandeja__in=BANDEJAS_CLASIFICABLES,
    ).exists()


def _validar_clasificacion(usuario, doc, carpeta, unidad_id, *, visibles_ids, es_admin):
    if doc.eliminado_en is not None:
        raise CarpetaError('El documento está en la papelera.', 409)
    # R1 — un documento en elaboración (borrador / en revisión) NO se clasifica.
    if doc.estado in ESTADOS_EN_ELABORACION:
        raise CarpetaError(
            'Los documentos en elaboración no pueden clasificarse en Carpetas Virtuales.', 409,
        )
    if doc.id not in visibles_ids:
        raise CarpetaError('No tiene acceso a este documento.', 403)
    # R5 — matriz de bandejas (Reasignados / Informados / No enviados no habilitan).
    if not _contexto_bandeja_permite(usuario, doc, es_admin=es_admin):
        raise CarpetaError(
            'Este documento no puede clasificarse desde su bandeja actual '
            '(solo Recibidos, Enviados, Archivados o Tareas).', 409,
        )
    existente = DocumentoCarpetaVirtual.objects.filter(
        documento=doc, unidad_id=unidad_id,
    ).select_related('carpeta').first()
    if existente and existente.carpeta_id == carpeta.id:
        return ('sin_cambio', existente)
    if existente:
        return ('reclasificar', existente)
    return ('clasificar', None)


def clasificar_documentos(usuario, *, documento_ids, carpeta_id):
    """
    Clasificación (individual o masiva) TODO-O-NADA. Todos los documentos van
    a la MISMA carpeta. Idempotente: un documento ya en esa carpeta cuenta
    como `sin_cambio`, no es error. Reclasificar = UPDATE de la fila existente.

    Devuelve {clasificados: [...], reclasificados: [...], sin_cambio: [...]}.
    Lanza CarpetaError (con .code) si algún documento no es elegible.
    """
    if not isinstance(documento_ids, list) or not documento_ids:
        raise CarpetaError('Debe indicar al menos un documento.', 400)

    carpeta = CarpetaVirtual.objects.filter(pk=carpeta_id).select_related('unidad').first()
    if carpeta is None:
        raise CarpetaError('La carpeta no existe.', 404)
    if not carpeta.activa:
        raise CarpetaError('La carpeta está inactiva.', 409)

    unidad_id = _unidad_clasificacion(usuario, carpeta)
    es_admin = es_admin_carpetas(usuario)

    docs = {d.id: d for d in Documento.objects.filter(pk__in=documento_ids)}
    visibles_ids = set(
        documentos_visibles_para(usuario).filter(pk__in=documento_ids).values_list('pk', flat=True)
    )

    planes, errores = [], []
    for did in documento_ids:
        doc = docs.get(did)
        if doc is None:
            errores.append({'documento_id': did, 'detalle': 'Documento no encontrado.'})
            continue
        try:
            accion, existente = _validar_clasificacion(
                usuario, doc, carpeta, unidad_id, visibles_ids=visibles_ids, es_admin=es_admin,
            )
            planes.append((doc, accion, existente))
        except CarpetaError as e:
            errores.append({'documento_id': did, 'detalle': str(e)})

    if errores:
        raise _CarpetaBatchError(errores)

    res = {'clasificados': [], 'reclasificados': [], 'sin_cambio': []}
    with transaction.atomic():
        for doc, accion, existente in planes:
            if accion == 'sin_cambio':
                res['sin_cambio'].append(doc.id)
            elif accion == 'reclasificar':
                existente.carpeta = carpeta
                existente.asignado_por = usuario
                existente.save(update_fields=['carpeta', 'asignado_por', 'actualizado_en'])
                res['reclasificados'].append(doc.id)
            else:
                DocumentoCarpetaVirtual.objects.create(
                    documento=doc, unidad_id=unidad_id, carpeta=carpeta, asignado_por=usuario,
                )
                res['clasificados'].append(doc.id)
    return res


def quitar_de_carpeta(usuario, doc, *, unidad_id=None):
    """Retira la clasificación del documento para la unidad indicada (por
    defecto, la del usuario). NO toca el documento ni la clasificación de
    otras unidades."""
    if unidad_id is None:
        unidad_id = getattr(usuario, 'unidad_id', None)
    if unidad_id is None:
        raise CarpetaError('No se pudo determinar la unidad.', 400)
    if not puede_clasificar_en_unidad(usuario, unidad_id):
        raise CarpetaError('No tiene permiso para modificar la clasificación de esta unidad.', 403)
    rel = DocumentoCarpetaVirtual.objects.filter(documento=doc, unidad_id=unidad_id).first()
    if rel is None:
        raise CarpetaError('El documento no está clasificado en ninguna carpeta de esta unidad.', 409)
    rel.delete()


class _CarpetaBatchError(CarpetaError):
    """TODO-O-NADA: lista de errores por documento (código 409)."""
    def __init__(self, errores):
        super().__init__('Ningún documento fue clasificado.', 409)
        self.errores = errores
