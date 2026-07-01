"""
Plantillas de documentos oficiales con membrete institucional
GAD Provincial de Cotopaxi — Hoja membretada 2023-2027

Logos incrustados como data-URI para que WeasyPrint no dependa
de URLs externas que pueden fallar en generacion de PDF.
"""
import base64
import os

from django.utils import timezone

# ── Logos embebidos como data-URI ──────────────────────────────────────────
_LOGOS_DIR = os.path.join(os.path.dirname(__file__), 'logos')


def _b64(path: str, mime: str) -> str:
    """Lee un archivo local y devuelve data-URI para usar en <img src=>."""
    try:
        data = open(path, 'rb').read()
        return f'data:{mime};base64,{base64.b64encode(data).decode()}'
    except Exception:
        return ''


ESCUDO_DATA    = _b64(os.path.join(_LOGOS_DIR, 'escudo_gad.png'),       'image/png')
LOGO_PREF_DATA = _b64(os.path.join(_LOGOS_DIR, 'logo_prefectura.svg'),  'image/svg+xml')

# Fallback: si los archivos no están, usar la URL pública (solo para escudo)
ESCUDO_SRC    = ESCUDO_DATA    or 'https://cotopaxi.gob.ec/wp-content/uploads/2026/02/cropped-favicon-copia-192x192.png'
LOGO_PREF_SRC = LOGO_PREF_DATA or 'https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg'

# ── Constantes de tipo de documento ───────────────────────────────────────
ACENTO_TIPO = {
    'OFI': '#002f6c', 'MEM': '#854f0b', 'CIR': '#da291c',
    'RES': '#534ab7', 'INF': '#0f6e56', 'CON': '#15803d',
    'CER': '#92400e', 'ACT': '#0369a1',
}

NOMBRE_TIPO_LARGO = {
    'OFI': 'OFICIO',       'MEM': 'MEMORANDO',    'CIR': 'CIRCULAR',
    'RES': 'RESOLUCIÓN',   'INF': 'INFORME',       'CON': 'CONVOCATORIA',
    'CER': 'CERTIFICADO',  'ACT': 'ACTA',
}

# Tipos que usan formato PARA/ASUNTO (internos), el resto usa Señor/a (externos)
TIPOS_INTERNOS = {'MEM', 'CIR', 'INF', 'CON', 'ACT'}

MESES_ES = {
    'January': 'enero',   'February': 'febrero', 'March': 'marzo',
    'April': 'abril',     'May': 'mayo',          'June': 'junio',
    'July': 'julio',      'August': 'agosto',     'September': 'septiembre',
    'October': 'octubre', 'November': 'noviembre', 'December': 'diciembre',
}


def _fecha_es(dt) -> str:
    if not dt:
        dt = timezone.now()
    s = dt.strftime('%d de %B de %Y')
    for en, es in MESES_ES.items():
        s = s.replace(en, es)
    return s


def html_documento_oficial(doc) -> str:
    prefijo     = doc.tipo_documento.prefijo_numeracion or 'OFI'
    acento      = ACENTO_TIPO.get(prefijo, '#002f6c')
    nombre_tipo = NOMBRE_TIPO_LARGO.get(prefijo, doc.tipo_documento.nombre.upper())
    es_interno  = prefijo in TIPOS_INTERNOS

    fecha_doc   = _fecha_es(doc.fecha_elaboracion)
    firmante    = doc.firmado_por.nombre_completo if doc.firmado_por else doc.creado_por.nombre_completo
    cargo_fir   = getattr(doc.firmado_por or doc.creado_por, 'cargo', '') or ''
    unidad_orig = doc.unidad_origen.nombre if doc.unidad_origen else ''

    destino_nombre = (
        doc.unidad_destino.nombre if doc.unidad_destino else (doc.remitente_entidad or 'A quien corresponda')
    )

    # ── Bloque de destinatario/asunto según tipo ──────────────────────────
    if es_interno:
        # Formato memorando: PARA / ASUNTO centrado con tabla
        bloque_dest = f"""
        <table class="tabla-encabezado">
          <tr>
            <td class="lbl">PARA:</td>
            <td><strong>{destino_nombre}</strong></td>
          </tr>
          <tr>
            <td class="lbl">ASUNTO:</td>
            <td>{doc.asunto}</td>
          </tr>
        </table>"""
    else:
        # Formato oficio: Señor/a → nombre → Presente
        bloque_dest = f"""
        <div class="destinatario">
          <p>Señor/a</p>
          <p><strong>{destino_nombre}</strong></p>
          <p class="presente">Presente.-</p>
        </div>
        <div class="asunto-bloque">
          <span class="asunto-label">ASUNTO:</span>
          {doc.asunto}
        </div>"""

    # ── Bloque firma electrónica BCE ─────────────────────────────────────
    firma_bce = ''
    if doc.firma_bce_info:
        info = doc.firma_bce_info
        firma_bce = f"""
        <div class="sello-firma">
          <div class="sello-check">✓</div>
          <div>
            <strong>Firmado electrónicamente — FirmaEC:</strong>
            {info.get('firmado_por', firmante)}<br>
            Entidad: {info.get('entidad_cert', '—')} &nbsp;·&nbsp;
            Fecha: {(info.get('fecha_firma', '')[:10]) if info.get('fecha_firma') else '—'}<br>
            <span style="font-size:7.5pt;font-style:italic;color:#4d7c0f">
              Válido según Art. 14, Ley de Comercio Electrónico, Firmas Electrónicas y
              Mensajes de Datos del Ecuador
            </span>
          </div>
        </div>"""

    cuerpo_html = doc.cuerpo if doc.cuerpo else '<p style="color:#999;font-style:italic">[Sin contenido]</p>'

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 0;
    @bottom-right {{
      content: counter(page) "/" counter(pages);
      font-size: 8pt;
      color: #666;
      font-family: Arial, sans-serif;
      padding-right: 30px;
    }}
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
  }}

  /* ── PÁGINA ── */
  .pagina {{
    width: 21cm;
    min-height: 29.7cm;
    padding: 0;
    position: relative;
  }}

  /* ── MARCA DE AGUA ── */
  .marca-agua {{
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12cm;
    opacity: 0.04;
    z-index: 0;
  }}

  /* ── ENCABEZADO ── */
  .encabezado {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px 10px 28px;
    position: relative;
    z-index: 1;
  }}
  .enc-izq {{
    width: 80px;
    flex-shrink: 0;
  }}
  .enc-der {{
    width: 180px;
    flex-shrink: 0;
  }}

  /* ── LÍNEAS SEPARADORAS (igual que Quipux) ── */
  /* Dos segmentos: izquierdo (azul 58%) + gap + derecho (rojo 38%) */
  .lineas-sep {{
    display: flex;
    align-items: center;
    padding: 0 28px;
    gap: 0;
    margin-bottom: 1px;
  }}
  .lin-azul  {{ height: 3px; flex: 58; background: #002f6c; }}
  .lin-gap   {{ flex: 4; }}
  .lin-roja  {{ height: 3px; flex: 38; background: #da291c; }}

  .lineas-sep2 {{
    display: flex;
    padding: 0 28px;
    margin-bottom: 0;
    gap: 0;
  }}
  .lin2-azul {{ height: 1px; flex: 58; background: #da291c; }}
  .lin2-gap  {{ flex: 4; }}
  .lin2-roja {{ height: 1px; flex: 38; background: #da291c; }}

  /* ── CONTENIDO ── */
  .contenido {{
    padding: 28px 50px 80px 50px;
    position: relative;
    z-index: 1;
  }}

  /* Número y fecha centrados (estilo Quipux) */
  .num-doc {{
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 11.5pt;
    font-weight: bold;
    margin-bottom: 4px;
  }}
  .fecha-doc {{
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 24px;
  }}

  /* Tabla PARA/ASUNTO (memorandos) */
  .tabla-encabezado {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
    font-size: 11pt;
  }}
  .tabla-encabezado .lbl {{
    font-weight: bold;
    width: 90px;
    vertical-align: top;
    padding-top: 2px;
  }}
  .tabla-encabezado td {{ padding: 2px 0; vertical-align: top; }}

  /* Bloque destinatario (oficios externos) */
  .destinatario {{
    margin-bottom: 16px;
    font-size: 11pt;
  }}
  .presente {{ font-style: italic; color: #555; margin-top: 2px; }}

  .asunto-bloque {{
    background: #f8faff;
    border-left: 3px solid {acento};
    padding: 7px 12px;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
    font-size: 11pt;
  }}
  .asunto-label {{
    font-weight: bold;
    margin-right: 6px;
  }}

  /* Cuerpo */
  .cuerpo-doc {{
    text-align: justify;
    margin-bottom: 40px;
    font-size: 11pt;
  }}
  .cuerpo-doc p {{ margin-bottom: 10px; }}

  /* ── FIRMA ── */
  .bloque-firma {{
    margin-top: 36px;
    font-size: 10.5pt;
  }}
  .atte         {{ margin-bottom: 40px; }}
  .firma-nombre {{ font-weight: bold; font-family: Arial, sans-serif; font-size: 10.5pt; }}
  .firma-cargo  {{ font-size: 9.5pt; color: #555; margin-top: 2px; font-family: Arial, sans-serif; }}

  /* ── SELLO BCE ── */
  .sello-firma {{
    margin-top: 20px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: Arial, sans-serif;
    font-size: 8.5pt;
    color: #14532d;
  }}
  .sello-check {{
    min-width: 22px; height: 22px; border-radius: 50%;
    background: #15803d; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12pt; font-weight: bold; flex-shrink: 0;
    text-align: center; line-height: 22px;
  }}

  /* ── PIE DE PÁGINA (posición fija para todas las páginas) ── */
  .pie-pagina {{
    position: fixed;
    bottom: 0;
    left: 0; right: 0;
    padding: 0 28px 10px 28px;
    z-index: 1;
  }}
  .pie-texto {{
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #333;
    text-align: center;
    line-height: 1.7;
    margin-top: 5px;
  }}
  .pie-texto strong {{ color: #111; }}

  .quipux-tag {{
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #aaa;
    position: fixed;
    bottom: 3px;
    left: 28px;
  }}
</style>
</head>
<body>
<div class="pagina">

  <!-- Marca de agua -->
  <img src="{ESCUDO_SRC}" class="marca-agua" alt="">

  <!-- ── ENCABEZADO ── -->
  <div class="encabezado">
    <img src="{ESCUDO_SRC}" class="enc-izq" alt="GAD Provincial de Cotopaxi">
    <img src="{LOGO_PREF_SRC}" class="enc-der" alt="Prefectura COTOPAXI">
  </div>

  <!-- Líneas separadoras (igual que Quipux) -->
  <div class="lineas-sep">
    <div class="lin-azul"></div>
    <div class="lin-gap"></div>
    <div class="lin-roja"></div>
  </div>
  <div class="lineas-sep2">
    <div class="lin2-azul"></div>
    <div class="lin2-gap"></div>
    <div class="lin2-roja"></div>
  </div>

  <!-- ── CONTENIDO ── -->
  <div class="contenido">

    <!-- Número de documento y fecha (centrados, negrita, igual que Quipux) -->
    <p class="num-doc">{nombre_tipo} Nro. {doc.numero_documento or '(por asignar)'}</p>
    <p class="fecha-doc">Latacunga, {fecha_doc}</p>

    <!-- Destinatario / PARA+ASUNTO según tipo -->
    {bloque_dest}

    <!-- Cuerpo del documento -->
    <div class="cuerpo-doc">
      {cuerpo_html}
    </div>

    <!-- Firma -->
    <div class="bloque-firma">
      <p class="atte">Atentamente,</p>
      <p class="firma-nombre">{firmante}</p>
      {f'<p class="firma-cargo">{cargo_fir}</p>' if cargo_fir else ''}
      {f'<p class="firma-cargo">{unidad_orig}</p>' if unidad_orig else ''}
    </div>

    {firma_bce}

  </div>

  <!-- ── PIE DE PÁGINA (fijo en todas las páginas) ── -->
  <div class="pie-pagina">
    <div class="lineas-sep" style="padding:0;">
      <div class="lin-azul"></div>
      <div class="lin-gap"></div>
      <div class="lin-roja"></div>
    </div>
    <div class="lineas-sep2" style="padding:0;margin-bottom:4px;">
      <div class="lin2-azul"></div>
      <div class="lin2-gap"></div>
      <div class="lin2-roja"></div>
    </div>
    <div class="pie-texto">
      <strong>Dir:</strong> Calle Tarqui N° 507 y Quito &nbsp;•&nbsp;
      <strong>Telf:</strong> (03) 2800 416 - 2800 418 &nbsp;•&nbsp;
      <strong>Telefax:</strong> 2800 411<br>
      <strong>E-mail:</strong> info@cotopaxi.gob.ec &nbsp;•&nbsp;
      www.cotopaxi.gob.ec &nbsp;•&nbsp; Cotopaxi - Ecuador
    </div>
  </div>

  <div class="quipux-tag">* Documento generado por SGD-GAD</div>

</div>
</body>
</html>
"""
