"""
Tareas Celery para procesamiento de PDFs de Quipux.

Extrae texto de los PDFs almacenados en quipux_documental y los indexa
en doc_quipux_contenido para búsqueda full-text desde el SGD.
"""
import base64
import io
import logging

from celery import shared_task
from django.db import connections

logger = logging.getLogger(__name__)

BATCH_SIZE = 20   # PDFs por ejecución de tarea periódica


def _extraer_texto_pdf(pdf_bytes: bytes) -> tuple[str, bool]:
    """
    Extrae texto de un PDF. Devuelve (texto, es_escaneado).
    Primero intenta extracción directa (pdfminer); si falla o el texto
    es muy corto, usa OCR (pytesseract vía pdf2image).
    """
    texto = ''
    try:
        from pdfminer.high_level import extract_text
        texto = extract_text(io.BytesIO(pdf_bytes)) or ''
        texto = texto.strip()
    except Exception:
        pass

    if len(texto) >= 50:
        return texto, False

    # PDF escaneado — usar OCR
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
        imagenes = convert_from_bytes(pdf_bytes, dpi=200, first_page=1, last_page=3)
        partes = []
        for img in imagenes:
            partes.append(pytesseract.image_to_string(img, lang='spa'))
        texto = '\n'.join(partes).strip()
        return texto, True
    except Exception as e:
        logger.warning('OCR falló: %s', e)
        return texto, bool(texto)


@shared_task(bind=True, max_retries=3, name='documentos.extraer_contenido_quipux_batch')
def extraer_contenido_quipux_batch(self, arch_codis: list[tuple[str, int]]):
    """
    Procesa un lote de (radi_nume_text, arch_codi) desde Quipux.
    Llama a func_recuperar_archivo y extrae el texto del PDF.
    """
    from .models import QuipuxContenidoPDF

    procesados = 0
    for radi_nume_text, arch_codi in arch_codis:
        if QuipuxContenidoPDF.objects.filter(radi_nume_text=radi_nume_text).exists():
            continue
        try:
            with connections['quipux_documental'].cursor() as cur:
                cur.execute('SELECT func_recuperar_archivo(%s)', [arch_codi])
                row = cur.fetchone()
                if not row or not row[0]:
                    QuipuxContenidoPDF.objects.create(
                        radi_nume_text=radi_nume_text,
                        arch_codi=arch_codi,
                        tiene_contenido=False,
                        error_extraccion='Sin archivo en DB documental',
                    )
                    continue
                pdf_bytes = base64.b64decode(row[0])
        except Exception as e:
            QuipuxContenidoPDF.objects.create(
                radi_nume_text=radi_nume_text,
                arch_codi=arch_codi,
                tiene_contenido=False,
                error_extraccion=str(e)[:200],
            )
            continue

        texto, es_escaneado = _extraer_texto_pdf(pdf_bytes)
        QuipuxContenidoPDF.objects.create(
            radi_nume_text=radi_nume_text,
            arch_codi=arch_codi,
            contenido_texto=texto,
            tiene_contenido=bool(texto),
            es_escaneado=es_escaneado,
        )
        procesados += 1

    return {'procesados': procesados, 'lote': len(arch_codis)}


@shared_task(name='documentos.programar_extraccion_quipux')
def programar_extraccion_quipux():
    """
    Tarea periódica (Celery Beat) que selecciona el siguiente lote de PDFs
    Quipux sin indexar y despacha la tarea de extracción.
    Procesa los más recientes primero.
    """
    from .models import QuipuxContenidoPDF

    ya_procesados = set(
        QuipuxContenidoPDF.objects.values_list('radi_nume_text', flat=True)
    )

    try:
        with connections['quipux_transaccional'].cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (radi_nume_text) radi_nume_text, arch_codi
                FROM radicado
                WHERE arch_codi > 0
                ORDER BY radi_nume_text, radi_fech_radi DESC
                LIMIT %s
            """, [len(ya_procesados) + BATCH_SIZE * 10])
            rows = [(r[0], r[1]) for r in cur.fetchall() if r[0] not in ya_procesados]
    except Exception as e:
        logger.error('No se pudo leer Quipux: %s', e)
        return

    # Tomar los más recientes (la query ya trae los más recientes primero)
    lote = rows[:BATCH_SIZE]
    if lote:
        extraer_contenido_quipux_batch.delay(lote)
        logger.info('Encolados %d PDFs Quipux para extracción', len(lote))

    return {'encolados': len(lote), 'pendientes': len(rows) - len(lote)}
