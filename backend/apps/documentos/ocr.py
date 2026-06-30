"""
Servicio de extracción de texto y OCR para adjuntos PDF
Soporta PDFs nativos (pdfminer) y escaneados (tesseract)
"""
import io
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


def extraer_texto_pdf_nativo(archivo_path: str) -> Tuple[str, int]:
    """
    Extrae texto de un PDF nativo usando pdfminer.
    Retorna (texto, num_paginas)
    """
    try:
        from pdfminer.high_level import extract_text, extract_pages
        from pdfminer.layout import LTPage

        texto = extract_text(archivo_path)
        paginas = sum(1 for _ in extract_pages(archivo_path))
        return texto.strip(), paginas
    except Exception as e:
        logger.warning(f'pdfminer falló en {archivo_path}: {e}')
        return '', 0


def extraer_texto_ocr(archivo_path: str, idioma: str = 'spa') -> Tuple[str, float, int]:
    """
    Extrae texto de un PDF escaneado usando OCR (tesseract).
    Retorna (texto, confianza_promedio, num_paginas)
    """
    try:
        import pytesseract
        from pdf2image import convert_from_path

        paginas_img = convert_from_path(archivo_path, dpi=300)
        textos = []
        confianzas = []

        for img in paginas_img:
            # Obtener datos con confianza
            data = pytesseract.image_to_data(
                img,
                lang=idioma,
                output_type=pytesseract.Output.DICT
            )
            # Filtrar palabras con confianza > 0
            palabras = [
                data['text'][i]
                for i in range(len(data['text']))
                if int(data['conf'][i]) > 0 and data['text'][i].strip()
            ]
            confs = [
                int(data['conf'][i])
                for i in range(len(data['conf']))
                if int(data['conf'][i]) > 0 and data['text'][i].strip()
            ]
            textos.append(' '.join(palabras))
            if confs:
                confianzas.append(sum(confs) / len(confs))

        texto_final = '\n'.join(textos).strip()
        confianza_promedio = sum(confianzas) / len(confianzas) if confianzas else 0.0
        return texto_final, round(confianza_promedio, 1), len(paginas_img)

    except Exception as e:
        logger.error(f'OCR falló en {archivo_path}: {e}')
        return '', 0.0, 0


def es_pdf_nativo(archivo_path: str, umbral_chars: int = 50) -> bool:
    """
    Determina si un PDF tiene texto seleccionable o es una imagen escaneada.
    Si extrae más de `umbral_chars` caracteres, es nativo.
    """
    try:
        from pdfminer.high_level import extract_text
        texto = extract_text(archivo_path)
        return len(texto.strip()) >= umbral_chars
    except Exception:
        return False


def procesar_adjunto(adjunto) -> dict:
    """
    Procesa un AdjuntoDocumento: extrae texto (nativo o OCR) y actualiza el registro.
    Retorna dict con resultado del procesamiento.
    """
    if not adjunto.archivo:
        return {'ok': False, 'error': 'Sin archivo'}

    if adjunto.mime_type and not adjunto.mime_type.startswith('application/pdf'):
        # No es PDF — extraer texto básico si es posible
        adjunto.ocr_procesado = True
        adjunto.ocr_confianza = 100.0
        adjunto.save(update_fields=['ocr_procesado', 'ocr_confianza'])
        return {'ok': True, 'metodo': 'no_pdf', 'texto_chars': 0}

    try:
        archivo_path = adjunto.archivo.path
    except Exception:
        return {'ok': False, 'error': 'No se puede acceder al archivo'}

    try:
        if es_pdf_nativo(archivo_path):
            texto, paginas = extraer_texto_pdf_nativo(archivo_path)
            metodo     = 'nativo'
            confianza  = 100.0
        else:
            texto, confianza, paginas = extraer_texto_ocr(archivo_path, adjunto.idioma_ocr or 'spa')
            metodo = 'ocr'

        adjunto.contenido_texto = texto
        adjunto.ocr_procesado   = True
        adjunto.ocr_confianza   = confianza
        adjunto.paginas         = paginas
        adjunto.save(update_fields=[
            'contenido_texto', 'ocr_procesado',
            'ocr_confianza', 'paginas'
        ])

        return {
            'ok':          True,
            'metodo':      metodo,
            'paginas':     paginas,
            'confianza':   confianza,
            'texto_chars': len(texto),
        }

    except Exception as e:
        logger.error(f'Error procesando adjunto {adjunto.id}: {e}')
        return {'ok': False, 'error': str(e)}