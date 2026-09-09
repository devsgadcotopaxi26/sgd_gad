"""
FASE 0A / 0A.1 — PDF oficial inmutable del documento.

Cuando un documento pasa definitivamente a un estado oficial (enviado / firmado
por cualquiera de los flujos reales), los bytes del PDF de ese momento se
congelan como artefacto documental. A partir de ahí `GET /documentos/{id}/pdf/`
sirve exactamente esos bytes — nunca vuelve a reconstruirlos desde
`plantillas.py`.

FUENTE ÚNICA DE VERDAD: `AdjuntoDocumento(tipo='documento')` más reciente,
CONDICIONADO a que el documento ya no esté en `borrador` (§FASE 0A.1 — ver
`obtener_adjunto_oficial`).
    - Es la misma infraestructura que ya usa el callback de FirmaEC y la firma
      P12 en navegador (ambos suben ahí el PDF realmente firmado).
    - `DocumentoDetalleSerializer.pdf_firmado_url` ya apunta a ese adjunto.
    - `AdjuntoDocumento` ya tiene hash (`hash_integridad`), tamaño (`tamanio`),
      autor (`subido_por`) y fecha (`creado_en`) → el propio artefacto es el
      registro de auditoría de quién/cuándo/hash/tamaño.
    - No se añade ningún FileField nuevo a `Documento` → sin migraciones.

Precedencia: si ya existe un adjunto `tipo='documento'` oficial (p. ej. el PDF
firmado), `congelar_pdf_oficial` NO lo toca. Un PDF criptográficamente firmado
siempre gana frente a una regeneración de WeasyPrint.
"""
import hashlib
from contextlib import contextmanager

from django.core.files.base import ContentFile

TIPO_ADJUNTO_OFICIAL = 'documento'

# FASE 0A.1 — §Parte A (caso P12 parcial).
# La sola EXISTENCIA de un AdjuntoDocumento(tipo='documento') no basta para
# considerarlo el PDF oficial: el flujo P12 en navegador sube ese adjunto
# ANTES de llamar a registrar_firma (ver ModalFirmaElectronica.tsx). Si esa
# segunda llamada falla, el documento sigue siendo 'borrador' en BD pero ya
# habría un adjunto tipo='documento' huérfano — que NO representa ninguna
# firma ni envío válido. La regla más pequeña compatible con FirmaEC/P12: un
# adjunto tipo='documento' solo cuenta como PDF oficial si el documento ya
# salió de 'borrador' (única forma de llegar a 'firmado'/'enviado'/etc. es a
# través de un flujo que efectivamente completó su transición de estado).
ESTADOS_SIN_PDF_OFICIAL = {'borrador'}


def obtener_adjunto_oficial(doc):
    """El `AdjuntoDocumento` que representa el PDF oficial del documento, o
    None si el documento sigue siendo borrador (aunque exista físicamente un
    adjunto tipo='documento' huérfano de un flujo de firma incompleto).

    Único punto para responder "¿dónde está el PDF oficial de este documento?".
    """
    if doc.estado in ESTADOS_SIN_PDF_OFICIAL:
        return None
    return (
        doc.archivos_adjuntos
        .filter(tipo=TIPO_ADJUNTO_OFICIAL)
        .order_by('-creado_en')
        .first()
    )


def tiene_pdf_oficial(doc) -> bool:
    return obtener_adjunto_oficial(doc) is not None


def _render_pdf_bytes(doc, modo: str = 'final') -> bytes:
    """Render dinámico (WeasyPrint). `modo` se pasa tal cual a
    `html_documento_oficial` (ver allí). Por defecto 'final': cuando se llama
    para CONGELAR el PDF oficial el `doc.estado` todavía es 'borrador' en
    memoria, y el artefacto oficial jamás debe llevar la marca "BORRADOR"."""
    from .plantillas import html_documento_oficial
    from apps.auditoria.reportes import generar_pdf
    html = html_documento_oficial(doc, modo)
    return generar_pdf(html, f'doc_{doc.id}.pdf').content


def obtener_pdf_oficial_bytes(doc) -> bytes:
    """Bytes del PDF oficial: los congelados si existen; si no, un render
    dinámico. El fallback es siempre 'final' (se usa para documentos ya
    oficializados: adjuntar a email, legacy sin congelar…)."""
    adj = obtener_adjunto_oficial(doc)
    if adj and adj.archivo:
        try:
            with adj.archivo.open('rb') as fh:
                return fh.read()
        except (FileNotFoundError, OSError):
            pass
    return _render_pdf_bytes(doc, 'final')


def _crear_adjunto_oficial(doc, usuario):
    """Renderiza y persiste un nuevo AdjuntoDocumento(tipo='documento').
    Sin control de idempotencia — lo hace el llamador (`congelar_pdf_oficial` /
    `congelar_pdf_oficial_seguro`). No usar directamente fuera de este módulo.
    """
    from .models import AdjuntoDocumento

    # 'final' — el artefacto oficial NUNCA lleva la marca "BORRADOR", aunque
    # `doc.estado` aún sea 'borrador' aquí (el cambio de estado va después,
    # en la misma transacción).
    pdf_bytes = _render_pdf_bytes(doc, 'final')
    sha = hashlib.sha256(pdf_bytes).hexdigest()
    nombre = f'{doc.numero_documento or f"doc_{doc.id}"}.pdf'.replace('/', '-')

    adj = AdjuntoDocumento(
        documento             = doc,
        nombre                = nombre,
        tipo                  = TIPO_ADJUNTO_OFICIAL,
        mime_type             = 'application/pdf',
        tamanio               = len(pdf_bytes),
        subido_por            = usuario or doc.remitente or doc.creado_por,
        origen_digitalizacion = 'nativo_digital',
        hash_integridad       = sha,
    )
    adj.archivo.save(nombre, ContentFile(pdf_bytes), save=False)
    adj.save()
    return adj


def congelar_pdf_oficial(doc, usuario=None, *, motivo: str = 'envio'):
    """Genera y persiste el PDF oficial del documento EN ESTE MOMENTO, si aún
    no existe uno reconocido como oficial (ver `obtener_adjunto_oficial` — el
    guard de estado de FASE 0A.1 aplica aquí también). Idempotente y
    respetuoso de la precedencia: si ya hay un adjunto oficial (PDF firmado o
    congelado previamente) → NO hace nada y lo devuelve.

    ADVERTENCIA (§FASE 0A.1 Parte B): esta función por sí sola NO protege
    contra archivos huérfanos si algo MÁS ADELANTE en la misma transacción
    atómica del llamador falla — el archivo ya se escribió en disco y
    FileSystemStorage no participa del rollback SQL. Para cualquier caller
    que ejecute código adicional dentro del mismo `transaction.atomic()`
    DESPUÉS de congelar, usar `congelar_pdf_oficial_seguro` (más abajo) en su
    lugar. Esta función simple solo es segura cuando es la ÚLTIMA operación
    del bloque atómico (p. ej. `registrar_firma`, `FirmaFisicaView`).
    """
    existente = obtener_adjunto_oficial(doc)
    if existente is not None:
        return existente
    return _crear_adjunto_oficial(doc, usuario)


@contextmanager
def congelar_pdf_oficial_seguro(doc, usuario=None, *, motivo: str = 'envio'):
    """Igual que `congelar_pdf_oficial`, pero como context manager que
    garantiza limpieza del archivo físico si el código que se ejecuta DENTRO
    del `with` (típicamente el resto de la transacción: marcar el documento
    como enviado, mover bandejas, etc.) lanza una excepción.

    Uso:
        with congelar_pdf_oficial_seguro(doc, request.user) as adj:
            marcar_documento_enviado(doc)
            ...  # resto de operaciones de la misma transaction.atomic()

    Si algo dentro del `with` falla:
      - la `transaction.atomic()` del llamador revierte el INSERT del
        AdjuntoDocumento (y todo lo demás) en la base de datos — eso ya lo
        da Django;
      - ESTE context manager, además, borra el archivo físico que él mismo
        acababa de escribir en MEDIA_ROOT en esta misma llamada — nunca un
        archivo preexistente de otro adjunto/documento.
    Si el adjunto oficial ya existía (idempotencia: no se creó nada nuevo en
    esta llamada), no se borra nada ante un fallo posterior — no es "nuestro".
    """
    existente = obtener_adjunto_oficial(doc)
    if existente is not None:
        yield existente
        return

    adj = _crear_adjunto_oficial(doc, usuario)
    try:
        yield adj
    except Exception:
        _borrar_archivo_fisico(adj)
        raise


def _borrar_archivo_fisico(adjunto) -> None:
    """Borra el archivo físico de ESTE adjunto (best-effort). Usado solo por
    `congelar_pdf_oficial_seguro` para compensar un rollback SQL posterior a
    haber escrito el archivo. Nunca debe usarse sobre un adjunto que no se
    acaba de crear en la misma operación."""
    try:
        if adjunto.archivo and adjunto.archivo.storage.exists(adjunto.archivo.name):
            adjunto.archivo.storage.delete(adjunto.archivo.name)
    except Exception:
        # Best-effort: un fallo al limpiar no debe ocultar la excepción
        # original que disparó la compensación (el `raise` de más arriba).
        pass


def descongelar_pdf_oficial(doc) -> int:
    """Elimina el PDF oficial congelado. SOLO para 'recuperar' (el documento
    vuelve a borrador dentro de la ventana de 10 min y se volverá a
    oficializar tras la corrección). No es una acción de "regenerar": el
    documento deja de estar oficializado.

    Seguridad: NO borra nada si el documento tiene firma registrada
    (`firma_bce_info`) — en ese caso el adjunto podría ser un PDF
    criptográficamente firmado y su gestión excede FASE 0A.

    Nota: a diferencia de `obtener_adjunto_oficial`, aquí se consulta
    `archivos_adjuntos` directamente (sin el guard de estado) porque esta
    función se llama DESPUÉS de que `recuperar` ya puso `doc.estado='borrador'`
    — es precisamente el caso que debe limpiar: un adjunto tipo='documento'
    que quedó de un envío ahora recuperado.
    Devuelve cuántos artefactos se eliminaron.
    """
    if doc.firma_bce_info:
        return 0
    borrados = 0
    for adj in doc.archivos_adjuntos.filter(tipo=TIPO_ADJUNTO_OFICIAL):
        try:
            adj.archivo.delete(save=False)
        except (FileNotFoundError, OSError):
            pass
        adj.delete()
        borrados += 1
    return borrados
