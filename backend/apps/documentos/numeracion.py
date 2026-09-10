"""
Numeración documental configurable por Unidad × TipoDocumento.

- El FORMATO (estructura, abreviatura, separador, dígitos) vive en
  `ConfiguracionNumeracion` — una fila por (unidad, tipo). Si no hay fila, se
  usa una config default en memoria (formato Quipux, abreviatura = prefijo del
  tipo) y se deja rastro en log.
- El CONTADOR vive en `SecuenciaDocumento` — una fila por (unidad, tipo, año),
  con dos contadores independientes:
    · `ultimo_provisional` → números "…-TEMP" de los borradores
    · `ultimo_numero`      → secuencia DEFINITIVA (se consume al oficializar)

Flujo:
  crear borrador        → `numero_provisional(doc)`         → GADPC-UTIC-2026-773-TEMP
  firmar / enviar        → `asignar_numero_definitivo(doc)`  → GADPC-UTIC-2026-0718-M
  pantalla de config     → `preview_siguiente(unidad, tipo)` → NO consume
"""
import logging
import re

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

ELEMENTOS_VALIDOS   = ('institucion', 'area', 'anio', 'secuencial', 'abreviatura')
ESTRUCTURA_DEFAULT  = ['institucion', 'area', 'anio', 'secuencial', 'abreviatura']
SEPARADOR_DEFAULT   = '-'
DIGITOS_ANIO_OK     = (2, 4)
DIGITOS_SEC_MIN, DIGITOS_SEC_MAX = 1, 8
_SEP_RE            = re.compile(r'^[-_./ ]{1,3}$')      # separadores permitidos
_LITERAL_RE       = re.compile(r'^literal:[A-Za-z0-9 ._\-]{1,10}$')


class NumeracionError(Exception):
    """Configuración de numeración inválida."""


# ── Config ────────────────────────────────────────────────────────────────
class _ConfigDefault:
    """Config en memoria para (unidad, tipo) sin fila propia (transición)."""
    _es_default = True

    def __init__(self, tipo_documento):
        self.abreviatura       = (tipo_documento.prefijo_numeracion or '').strip()
        self.separador         = SEPARADOR_DEFAULT
        self.digitos_anio      = 4
        self.digitos_secuencia = 4
        self.estructura        = list(ESTRUCTURA_DEFAULT)
        self.activo            = True


def obtener_config(unidad, tipo_documento):
    """Devuelve la `ConfiguracionNumeracion` real de (unidad, tipo) o una
    config default en memoria (`_es_default=True`)."""
    from .models import ConfiguracionNumeracion
    cfg = (
        ConfiguracionNumeracion.objects
        .filter(unidad=unidad, tipo_documento=tipo_documento)
        .first()
    )
    return cfg or _ConfigDefault(tipo_documento)


def validar_config(*, estructura, separador, digitos_anio, digitos_secuencia):
    """Valida los parámetros de formato. Lanza NumeracionError."""
    if not isinstance(estructura, list) or not estructura:
        raise NumeracionError('La estructura debe ser una lista no vacía.')
    for tok in estructura:
        if tok in ELEMENTOS_VALIDOS or _LITERAL_RE.match(str(tok)):
            continue
        raise NumeracionError(f'Elemento de estructura inválido: {tok!r}')
    if 'secuencial' not in estructura:
        raise NumeracionError('La estructura debe incluir el elemento "secuencial".')
    if not _SEP_RE.match(separador or ''):
        raise NumeracionError('Separador inválido (permitidos: - _ . / y espacio, 1–3 caracteres).')
    if digitos_anio not in DIGITOS_ANIO_OK:
        raise NumeracionError('Dígitos de año: solo 2 o 4.')
    if not (DIGITOS_SEC_MIN <= digitos_secuencia <= DIGITOS_SEC_MAX):
        raise NumeracionError(f'Dígitos de secuencia: entre {DIGITOS_SEC_MIN} y {DIGITOS_SEC_MAX}.')


# ── Construcción del string ───────────────────────────────────────────────
def _abrev_institucion():
    from apps.configuracion.models import ConfiguracionSistema
    return (ConfiguracionSistema.get().abreviatura_institucion or 'GADPC').strip()


def _pieza(token, *, unidad, anio, secuencial, cfg):
    if token == 'institucion':
        return _abrev_institucion()
    if token == 'area':
        return (unidad.siglas or 'GAD').strip()
    if token == 'anio':
        return f'{anio % 100:02d}' if cfg.digitos_anio == 2 else f'{anio:04d}'
    if token == 'secuencial':
        # No trunca si la secuencia supera el ancho configurado.
        return str(secuencial).zfill(cfg.digitos_secuencia)
    if token == 'abreviatura':
        return (cfg.abreviatura or '').strip()
    if isinstance(token, str) and token.startswith('literal:'):
        return token.split(':', 1)[1]
    return ''


def construir_numero(cfg, *, unidad, anio, secuencial):
    piezas = [
        _pieza(t, unidad=unidad, anio=anio, secuencial=secuencial, cfg=cfg)
        for t in (cfg.estructura or ESTRUCTURA_DEFAULT)
    ]
    return cfg.separador.join(p for p in piezas if p != '')


# ── Consumo de contadores ─────────────────────────────────────────────────
def _lock_secuencia(unidad, tipo_documento, anio, *, semilla=0):
    """get_or_create + SELECT … FOR UPDATE sobre la fila SecuenciaDocumento.
    Debe llamarse dentro de una transacción. `semilla` inicializa
    `ultimo_numero` la primera vez (migración Quipux)."""
    from .models import SecuenciaDocumento
    obj, _created = SecuenciaDocumento.objects.get_or_create(
        unidad=unidad, tipo_documento=tipo_documento, anio=anio,
        defaults={'ultimo_numero': semilla},
    )
    return SecuenciaDocumento.objects.select_for_update().get(pk=obj.pk)


# Al buscar un correlativo libre saltamos los ya ocupados en `doc_documento`
# (numeraciones legacy / importadas de Quipux que comparten el mismo namespace
# de `numero_documento`). Cota de seguridad: el mayor `fn_contador` de Quipux
# observado ronda ~3100; 50000 deja margen amplio para años futuros.
_MAX_INTENTOS_NUMERO = 50000


def _siguiente_numero_libre(construir, *, desde: int, excluir_pk) -> tuple:
    """Devuelve (secuencial, numero_documento) para el PRIMER secuencial
    > `desde` cuyo `numero_documento` no exista ya en `doc_documento`
    (protege el unique constraint frente a numeraciones legacy/importadas).
    Lanza NumeracionError si se agota la cota."""
    from .models import Documento
    ex = excluir_pk if excluir_pk else 0
    n = desde
    for _ in range(_MAX_INTENTOS_NUMERO):
        n += 1
        candidato = construir(n)
        if not Documento.objects.filter(numero_documento=candidato).exclude(pk=ex).exists():
            return n, candidato
    raise NumeracionError(
        f'No se encontró un número documental libre tras {_MAX_INTENTOS_NUMERO} '
        f'intentos desde {desde}. Revise la configuración de numeración de la unidad/tipo.'
    )


def numero_provisional(doc):
    """Asigna a `doc` un número PROVISIONAL ("…-TEMP"). Consume el contador
    `ultimo_provisional` (separado del oficial). No persiste `doc`."""
    anio = timezone.now().year
    cfg  = obtener_config(doc.unidad_origen, doc.tipo_documento)

    cfg_temp = _ConfigDefault(doc.tipo_documento)
    cfg_temp.abreviatura       = 'TEMP'
    cfg_temp.separador         = cfg.separador
    cfg_temp.digitos_anio      = cfg.digitos_anio
    cfg_temp.digitos_secuencia = 1                     # el correlativo TEMP no se rellena
    cfg_temp.estructura        = cfg.estructura

    with transaction.atomic():
        seq = _lock_secuencia(doc.unidad_origen, doc.tipo_documento, anio)
        n, numero = _siguiente_numero_libre(
            lambda k: construir_numero(cfg_temp, unidad=doc.unidad_origen, anio=anio, secuencial=k),
            desde=seq.ultimo_provisional, excluir_pk=doc.pk,
        )
        seq.ultimo_provisional = n
        seq.save(update_fields=['ultimo_provisional', 'actualizado_en'])

    doc.numero_documento  = numero
    doc.numero_secuencial = None                       # None == provisional (invariante)
    doc.anio              = anio


def es_provisional(doc) -> bool:
    return doc.numero_secuencial is None


def asignar_numero_definitivo(doc):
    """Consume la secuencia OFICIAL y fija el número definitivo en `doc`
    (persistido). Idempotente: si `doc` ya tiene número definitivo
    (`numero_secuencial` != None) no hace nada.

    Debe invocarse cuando el documento se oficializa (firma o envío), dentro
    de la `transaction.atomic()` del llamador — así el lock de la secuencia se
    mantiene hasta que TODA la operación confirme.
    """
    if doc.numero_secuencial is not None:
        return doc.numero_documento

    anio = timezone.now().year
    cfg  = obtener_config(doc.unidad_origen, doc.tipo_documento)
    if getattr(cfg, '_es_default', False):
        logger.info(
            'Numeración: (unidad=%s, tipo=%s) sin ConfiguracionNumeracion propia — usando formato default',
            doc.unidad_origen_id, doc.tipo_documento_id,
        )

    semilla = doc.tipo_documento.secuencial_inicial or 0
    seq = _lock_secuencia(doc.unidad_origen, doc.tipo_documento, anio, semilla=semilla)
    # `_siguiente_numero_libre` salta cualquier `numero_documento` ya ocupado
    # (documentos legacy SGDA o importados de Quipux que comparten el mismo
    # formato) → el correlativo continúa de forma natural donde terminó la
    # numeración previa, sin colisionar con el unique constraint.
    proximo, numero = _siguiente_numero_libre(
        lambda k: construir_numero(cfg, unidad=doc.unidad_origen, anio=anio, secuencial=k),
        desde=max(seq.ultimo_numero, semilla), excluir_pk=doc.pk,
    )
    seq.ultimo_numero = proximo
    seq.save(update_fields=['ultimo_numero', 'actualizado_en'])

    doc.numero_secuencial = proximo
    doc.anio              = anio
    doc.numero_documento  = numero
    doc.save(update_fields=['numero_documento', 'numero_secuencial', 'anio'])
    return doc.numero_documento


def cfg_efectiva(unidad, tipo_documento, override=None):
    """Config efectiva de (unidad, tipo): la fila real (o el default) con
    `override` (dict) aplicado encima — para previsualizar cambios sin
    guardar. Devuelve un objeto tipo config (no persistido)."""
    real = obtener_config(unidad, tipo_documento)
    cfg  = _ConfigDefault(tipo_documento)
    cfg.abreviatura       = real.abreviatura
    cfg.separador         = real.separador
    cfg.digitos_anio      = real.digitos_anio
    cfg.digitos_secuencia = real.digitos_secuencia
    cfg.estructura        = list(real.estructura)
    cfg.activo            = real.activo
    for k in ('abreviatura', 'separador', 'digitos_anio', 'digitos_secuencia', 'estructura', 'activo'):
        if override and override.get(k) is not None:
            setattr(cfg, k, list(override[k]) if k == 'estructura' else override[k])
    return cfg


def resumen_unidad(unidad):
    """Filas para la pantalla (§22): por cada TipoDocumento activo, su config
    efectiva (real o default), el contador del año y el próximo número."""
    from .models import TipoDocumento, SecuenciaDocumento, ConfiguracionNumeracion
    anio     = timezone.now().year
    configs  = {c.tipo_documento_id: c for c in ConfiguracionNumeracion.objects.filter(unidad=unidad)}
    seqs     = {s.tipo_documento_id: s for s in SecuenciaDocumento.objects.filter(unidad=unidad, anio=anio)}
    filas = []
    for tipo in TipoDocumento.objects.filter(activo=True).order_by('orden'):
        cfg    = configs.get(tipo.id) or _ConfigDefault(tipo)
        seq    = seqs.get(tipo.id)
        actual = seq.ultimo_numero if seq else 0
        prox   = max(actual, tipo.secuencial_inicial or 0) + 1
        filas.append({
            'tipo_id':          tipo.id,
            'tipo_codigo':      tipo.codigo,
            'tipo_nombre':      tipo.nombre,
            'configurado':      tipo.id in configs,
            'activo':           cfg.activo,
            'abreviatura':      cfg.abreviatura,
            'separador':        cfg.separador,
            'digitos_anio':     cfg.digitos_anio,
            'digitos_secuencia': cfg.digitos_secuencia,
            'estructura':       list(cfg.estructura),
            'anio':             anio,
            'secuencia_actual': actual,
            'proximo_numero':   construir_numero(cfg, unidad=unidad, anio=anio, secuencial=prox),
        })
    return filas


@transaction.atomic
def ajustar_secuencia(unidad, tipo_documento, *, nueva_secuencia, motivo, usuario):
    """Fija manualmente `ultimo_numero` (§16/§17). El PRÓXIMO documento usará
    `nueva_secuencia + 1`. Registra la operación en `aud_log`
    (usuario/fecha/motivo/antes/después). No renumera nada existente."""
    from .models import SecuenciaDocumento
    from apps.auditoria.models import LogAuditoria

    if not isinstance(nueva_secuencia, int) or nueva_secuencia < 0:
        raise NumeracionError('La nueva secuencia debe ser un entero >= 0.')
    if not (motivo or '').strip():
        raise NumeracionError('El motivo es obligatorio.')

    anio  = timezone.now().year
    seq   = _lock_secuencia(unidad, tipo_documento, anio)
    antes = seq.ultimo_numero
    seq.ultimo_numero = nueva_secuencia
    seq.save(update_fields=['ultimo_numero', 'actualizado_en'])

    # Auditoría §17 — entrada explícita en aud_log. Va en un savepoint propio:
    # si la tabla no existe (p. ej. BD de test sin el bootstrap de auditoría)
    # el fallo no aborta la transacción del ajuste, solo deja un warning.
    try:
        with transaction.atomic():
            LogAuditoria.objects.create(
                tabla='doc_secuencia', registro_id=seq.id, accion='UPDATE',
                datos_antes={'ultimo_numero': antes},
                datos_despues={'ultimo_numero': nueva_secuencia},
                usuario_id=getattr(usuario, 'id', None),
                usuario_email=(getattr(usuario, 'email', '') or ''),
                unidad_id=unidad.id,
                modulo='documentos',
                descripcion=(
                    f'Ajuste manual de secuencia {unidad.siglas}/{tipo_documento.codigo}/{anio}: '
                    f'{antes} -> {nueva_secuencia}. Motivo: {motivo.strip()}'
                ),
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning('No se pudo registrar el ajuste de secuencia en aud_log: %s', exc)
    return seq


def copiar_config(unidad_destino, unidad_origen, *, usuario):
    """Copia la ConfiguracionNumeracion de cada tipo de `unidad_origen` a
    `unidad_destino`. Copia SOLO el formato — NUNCA la SecuenciaDocumento
    (§15: la secuencia pertenece al área destino). Devuelve (#copiadas)."""
    from .models import ConfiguracionNumeracion
    if unidad_destino.pk == unidad_origen.pk:
        raise NumeracionError('La unidad origen y destino no pueden ser la misma.')
    copiadas = 0
    for src in ConfiguracionNumeracion.objects.filter(unidad=unidad_origen):
        ConfiguracionNumeracion.objects.update_or_create(
            unidad=unidad_destino, tipo_documento=src.tipo_documento,
            defaults=dict(
                abreviatura=src.abreviatura, separador=src.separador,
                digitos_anio=src.digitos_anio, digitos_secuencia=src.digitos_secuencia,
                estructura=list(src.estructura), activo=src.activo,
                modificado_por=usuario,
            ),
        )
        copiadas += 1
    return copiadas


def preview_siguiente(unidad, tipo_documento, *, cfg_override=None) -> str:
    """String del PRÓXIMO número DEFINITIVO, sin consumir. `cfg_override`
    permite previsualizar cambios de formato aún no guardados."""
    from .models import SecuenciaDocumento
    anio = timezone.now().year
    cfg  = cfg_override or obtener_config(unidad, tipo_documento)
    seq  = (
        SecuenciaDocumento.objects
        .filter(unidad=unidad, tipo_documento=tipo_documento, anio=anio)
        .first()
    )
    semilla = tipo_documento.secuencial_inicial or 0
    actual  = seq.ultimo_numero if seq else 0
    return construir_numero(cfg, unidad=unidad, anio=anio, secuencial=max(actual, semilla) + 1)
