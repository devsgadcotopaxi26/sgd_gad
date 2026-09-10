"""
FASE 0B.1 — Acceso al PDF ORIGINAL de un documento histórico Quipux.

Capa de compatibilidad: dado el `numero_documento` de un `Documento` SGDA
(que para los 142.248 históricos es idéntico al `radi_nume_text` de Quipux),
resuelve el radicado legacy y recupera los bytes del PDF original desde la
base documental Quipux — SIN copiarlo a MEDIA, sin crear `AdjuntoDocumento`,
sin migrar nada.

La lógica de acceso a `quipux_documental` (`func_recuperar_archivo`) se
centraliza aquí y la reutiliza tanto `QuipuxPDFView` como
`apps.documentos.views.DocumentoPDFView`.
"""
import base64
import re

from django.db import connections

from .models import QuipuxRadicado

# Filtro barato: formato de `radi_nume_text` de Quipux
# (ej. GADPC-UTIC-2025-4086-M). Sirve para NO tocar la base legacy por cada
# borrador o documento SGDA nativo; la confirmación real es la consulta a
# radicado.radi_nume_text (más abajo).
_RE_QUIPUX_NUM = re.compile(r'^GADPC-[A-Z0-9]+-\d{4}-\d+-[A-Z0-9]+$')


class QuipuxNoDisponible(Exception):
    """La base legacy de Quipux (transaccional o documental) no respondió.
    El llamador debe degradar de forma controlada, NO propagar un 500."""


def parece_numero_quipux(numero_documento: str) -> bool:
    """Señal barata, sin I/O: ¿el número tiene forma de radi_nume_text Quipux?"""
    return bool(numero_documento) and bool(_RE_QUIPUX_NUM.match(numero_documento))


def resolver_radicado_quipux(numero_documento: str):
    """Confirma contra la base transaccional si `numero_documento` corresponde
    a un radicado histórico Quipux.

    Devuelve:
      - dict {'radi_nume_text': str, 'arch_codi': int}  si existe el radicado
        (arch_codi = MAX entre todos los "hermanos" con el mismo radi_nume_text,
        igual criterio que QuipuxPDFView; 0 si ninguno tiene PDF);
      - None  si el formato no parece Quipux, o si no hay radicado con ese
        radi_nume_text (p. ej. los 16 documentos SGDA nativos).

    Lanza QuipuxNoDisponible si la base transaccional no responde.

    Rendimiento: filtro exacto sobre radi_nume_text (índice `idx_radinumtex`),
    `order_by('-arch_codi')` + `.first()` → LIMIT 1. No carga el queryset.
    """
    if not parece_numero_quipux(numero_documento):
        return None
    try:
        arch = (
            QuipuxRadicado.objects.using('quipux_transaccional')
            .filter(radi_nume_text=numero_documento)
            .order_by('-arch_codi')
            .values_list('arch_codi', flat=True)
            .first()
        )
    except Exception as exc:  # noqa: BLE001 — cualquier fallo de conexión/DB legacy
        raise QuipuxNoDisponible(str(exc)) from exc

    if arch is None:
        return None  # forma Quipux pero sin radicado real → no es histórico Quipux
    return {'radi_nume_text': numero_documento, 'arch_codi': int(arch or 0)}


def recuperar_pdf_original(arch_codi: int):
    """Bytes del PDF original desde `quipux_documental` vía
    `func_recuperar_archivo(arch_codi)`. Devuelve None si no hay archivo
    (arch_codi<=0, función sin resultado, o base64 inválido).

    Lanza QuipuxNoDisponible si la base documental no responde.
    """
    if not arch_codi or arch_codi <= 0:
        return None
    try:
        with connections['quipux_documental'].cursor() as cursor:
            cursor.execute("SELECT func_recuperar_archivo(%s)", [arch_codi])
            row = cursor.fetchone()
    except Exception as exc:  # noqa: BLE001
        raise QuipuxNoDisponible(str(exc)) from exc

    if not row or not row[0]:
        return None
    try:
        return base64.b64decode(row[0])
    except Exception:  # noqa: BLE001 — contenido corrupto en la base documental
        return None
