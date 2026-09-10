"""
Plantilla oficial SGD-GAD Cotopaxi — formato Quipux.
Medidas obtenidas del PDF Quipux original:
  - Fuente: Times New Roman / Liberation Serif 11pt, line-height 1.18
  - Margen izquierdo: 40mm, derecho: 30mm
  - Número/Fecha: derecha, NEGRILLA
  - PARA: span label + div.dest con padding-left 56pt
  - Párrafos: margin-bottom 11pt
  - Firma electrónica: rojo #c00000, negrilla cursiva, margin-top 22pt
  - Firma cargo: negrilla (sin mayúsculas forzadas)
"""
import base64
import os

from django.utils import timezone

# ── Logos ──────────────────────────────────────────────────────────────────
_LOGOS_DIR = os.path.join(os.path.dirname(__file__), 'logos')


def _file_uri(filename: str) -> str:
    p = os.path.join(_LOGOS_DIR, filename)
    return f'file://{p}' if os.path.exists(p) else ''


def _b64(path: str, mime: str) -> str:
    try:
        return f'data:{mime};base64,{base64.b64encode(open(path,"rb").read()).decode()}'
    except Exception:
        return ''


ESCUDO_SRC      = _file_uri('escudo_gad.png') or _b64(
    os.path.join(_LOGOS_DIR, 'escudo_gad.png'), 'image/png')
LOGO_PREF_SRC   = _file_uri('logo_prefectura.svg') or _b64(
    os.path.join(_LOGOS_DIR, 'logo_prefectura.svg'), 'image/svg+xml')
MARCA_AGUA_SRC  = _file_uri('marca_agua_quipux.png') or _b64(
    os.path.join(_LOGOS_DIR, 'marca_agua_quipux.png'), 'image/png')


def _marca_agua_borrador_datauri() -> str:
    """
    SVG generado (no un archivo estático) con el texto "BORRADOR" en
    diagonal, SUTIL y PERIFÉRICO al estilo Quipux — pocas apariciones
    pequeñas y tenues cerca de los márgenes laterales, dejando limpio el
    bloque central de lectura. Se calcula una sola vez al importar el
    módulo — es determinístico, no depende de doc.

    Coordenadas en mm sobre viewBox 0 0 210 297 (tamaño A4), alineadas
    contra la geometría real de la plantilla (@page margin 44mm arriba /
    24mm abajo; .contenido con padding 40mm izq / 30mm der — ver _CSS más
    abajo): las posiciones caen dentro de esas franjas de margen, donde el
    texto del documento nunca llega, para que la marca casi no compita
    visualmente con PARA/ASUNTO/cuerpo/firma aunque tenga baja opacidad.
    """
    posiciones = [
        (15, 70),   (196, 70),    # franja superior: izquierda / derecha
        (12, 165),  (199, 165),   # franja media: izquierda / derecha
        (15, 250),  (196, 250),   # franja inferior: izquierda / derecha
    ]
    textos = [
        f'<text x="{x}" y="{y}" transform="rotate(-35 {x} {y})">BORRADOR</text>'
        for x, y in posiciones
    ]
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">'
        '<g font-family="Liberation Sans, Carlito, Arial, sans-serif" font-size="8" '
        'font-weight="bold" fill="#b0b0b0" fill-opacity="0.15" text-anchor="middle">'
        + ''.join(textos) +
        '</g></svg>'
    )
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


MARCA_BORRADOR_SRC = _marca_agua_borrador_datauri()

# ── Constantes ─────────────────────────────────────────────────────────────
# Primera letra mayúscula — igual que Quipux
NOMBRE_TIPO = {
    'OFI': 'Oficio',       'MEM': 'Memorando',    'CIR': 'Circular',
    'RES': 'Resolución',   'INF': 'Informe',       'CON': 'Convocatoria',
    'CER': 'Certificado',  'ACT': 'Acta',
}

# Internos solo muestran tabla PARA/ASUNTO (sin DE:)
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


def _iniciales(usuario) -> str:
    nombres   = (getattr(usuario, 'nombres',   '') or '').strip().split()
    apellidos = (getattr(usuario, 'apellidos', '') or '').strip().split()
    ini_n = nombres[0][0].lower()   if nombres   else ''
    ini_a = apellidos[0][0].lower() if apellidos else ''
    return f'{ini_n}{ini_a}'


# ── CSS ────────────────────────────────────────────────────────────────────
# Todas las medidas en mm/pt para que WeasyPrint las respete exactamente.
_CSS = """
  @page {
    size: A4;
    /* 44mm = 5mm pad-top + ~25mm logo + 3mm pad-bot + 2pt línea + ~10mm respiro */
    margin: 44mm 0 24mm 0;
    @top-center {
      content: element(page-header);
    }
    @bottom-center {
      content: element(page-footer);
    }
    @bottom-right {
      content: counter(page) "/" counter(pages);
      font-family: 'Liberation Sans', Carlito, Arial, sans-serif;
      font-size: 8pt;
      color: #666;
      padding-right: 10mm;
      padding-bottom: 4mm;
    }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; padding: 0; }

  /* ── MARCA DE AGUA (fixed → aparece en todas las páginas) ── */
  .marca-agua {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 11cm;
    opacity: 0.04;
    z-index: 0;
  }

  /* ── MARCA DE AGUA "BORRADOR" (solo estado='borrador', ver es_borrador) ──
     fixed + tamaño A4 exacto → se repite igual en todas las páginas, detrás
     del contenido (z-index 0 < .contenido z-index 1). El texto ya viene
     repetido en diagonal dentro del propio SVG (ver _marca_agua_borrador_
     datauri en este mismo archivo), no es un overlay del visor frontend. */
  .marca-agua-borrador {
    position: fixed;
    top: 0; left: 0;
    width: 210mm;
    height: 297mm;
    z-index: 0;
  }

  /* ── ENCABEZADO (running element → se repite en cada página) ── */
  /* width: 210mm forzado porque @top-center en WeasyPrint puede acotar el ancho */
  .page-header {
    position: running(page-header);
    width: 210mm;
    display: block;
  }
  .encabezado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5mm 10mm 3mm 10mm;
  }
  /* Altura máxima explícita para que el logo no desborde el margen @page */
  .enc-izq { width: 20mm; max-height: 22mm; object-fit: contain; flex-shrink: 0; }
  .enc-der { width: 45mm; max-height: 22mm; object-fit: contain; flex-shrink: 0; }

  /* ── PIE DE PÁGINA (running element → se repite en cada página) ── */
  .page-footer {
    position: running(page-footer);
    width: 210mm;
    display: block;
    padding: 0 10mm 3mm 10mm;
  }

  /* ── LÍNEA SEPARADORA ──
     Encabezado: de borde a borde (margin: 0 en .page-header sin padding).
     Pie:        con 10mm de margen a cada lado (hereda el padding del .page-footer).
     Orden: roja izquierda | pequeño separador | azul derecha  */
  .lineas   { display: flex; margin: 0; }
  .lin-roja { height: 2pt; flex: 1; background: #da291c; }
  .lin-gap  { flex: 0 0 3pt; }
  .lin-azul { height: 2pt; flex: 1; background: #002f6c; }

  /* ── CONTENIDO (flujo normal; los márgenes @page evitan el solapamiento) ── */
  .contenido {
    padding: 5mm 30mm 5mm 40mm;
    position: relative;
    z-index: 1;
  }

  /* ── CUERPO DEL DOCUMENTO (formato Quipux exacto) ── */
  .memo-body {
    font-family: "Times New Roman", "Liberation Serif", Times, serif;
    font-size: 11pt;
    line-height: 1.18;
    text-align: justify;
    color: #000;
  }
  .memo-body p { margin: 0 0 11pt 0; }

  /* Número de documento y fecha: derecha, NEGRILLA */
  .memo-body .enc { text-align: right; font-weight: bold; }

  /* PARA: bloque con sangría izquierda 56pt (medida exacta Quipux) */
  .memo-body .para { margin-top: 22pt; }
  .memo-body .para .lbl { font-weight: bold; }
  .memo-body .dest { padding-left: 56pt; margin-top: 2pt; }
  .memo-body .dest .item { margin-bottom: 11pt; }
  .memo-body .dest .item:last-child { margin-bottom: 0; }
  .memo-body .dest .cargo { font-weight: bold; }

  /* ASUNTO */
  .memo-body .asunto { margin: 14pt 0; }
  .memo-body .asunto .lbl { font-weight: bold; }

  /* Listas dentro del cuerpo */
  .memo-body ul, .memo-body ol { margin: 0 0 11pt 20pt; }
  .memo-body li { margin-bottom: 4pt; }

  /* Cuerpo: espacio inferior antes del bloque firma */
  .cuerpo-doc { margin-bottom: 11pt; }

  /* ── BLOQUE SEÑOR/A (oficios externos) ── */
  .bloque-senor { margin-bottom: 14pt; line-height: 1.18; }
  .presente { font-style: normal; }
  .dest-nombre { font-weight: normal; }
  .dest-cargo  { font-weight: bold; }
  .asunto-ofi  { margin-bottom: 14pt; }

  /* ── FIRMA ── */
  /* Línea manual para firma física (docs sin firma electrónica) */
  .linea-firma {
    width: 55mm;
    border-top: 1pt solid #000;
    margin: 38pt 0 4pt;
  }

  /* "Documento firmado electrónicamente": AZUL institucional, NEGRILLA, CURSIVA */
  .firma-elec-texto {
    color: #002f6c;
    font-weight: bold;
    font-style: italic;
    margin-top: 22pt;
    margin-bottom: 4pt;
  }

  /* Nombre firmante: regular */
  .firma-nombre { font-weight: normal; margin: 0; line-height: 1.18; }
  /* Cargo y unidad: negrilla */
  .firma-cargo  { font-weight: bold;   margin: 0; line-height: 1.18; }

  /* Iniciales del redactor */
  .iniciales {
    font-size: 8pt;
    color: #888;
    margin-top: 20pt;
    letter-spacing: 1pt;
  }

  .pie-texto {
    font-family: 'Liberation Sans', Carlito, Arial, sans-serif;
    font-size: 7pt;
    color: #333;
    text-align: center;
    line-height: 1.6;
    margin-top: 3pt;
  }
"""


def html_documento_oficial(doc, pre_firma: bool = False) -> str:
    prefijo     = doc.tipo_documento.prefijo_numeracion or 'OFI'
    nombre_tipo = NOMBRE_TIPO.get(prefijo, doc.tipo_documento.nombre)
    es_interno  = prefijo in TIPOS_INTERNOS

    # Fuente real de "es borrador": Documento.estado, tal cual está
    # persistido — no el número (puede contener "TEMP" sin relación con
    # esto), no la bandeja/accion_tomada (esas describen quién lo tiene, no
    # si es oficial). `pre_firma=True` es la excepción explícita: ese render
    # se envía a firmar y su resultado firmado pasa a ser el documento
    # definitivo — jamás debe llevar la marca de "BORRADOR" incrustada.
    es_borrador = doc.estado == 'borrador' and not pre_firma

    fecha_doc = _fecha_es(doc.fecha_elaboracion)

    # Firmante: remitente > firmado_por > creado_por
    firmante_obj = doc.remitente or doc.firmado_por or doc.creado_por
    firmante     = firmante_obj.nombre_completo if firmante_obj else ''
    cargo_fir    = getattr(firmante_obj, 'cargo', '') or ''
    unidad_orig  = doc.unidad_origen.nombre if doc.unidad_origen else ''

    # Iniciales redactor (solo si es distinto al firmante)
    creador_obj = doc.creado_por
    iniciales   = (
        _iniciales(creador_obj)
        if (firmante_obj and creador_obj and firmante_obj.pk != creador_obj.pk)
        else ''
    )

    # ── Destinatarios ─────────────────────────────────────────────────────
    destinatarios_qs = list(
        doc.destinatarios.select_related('usuario', 'usuario__unidad').all()
    )

    # ── Bloque PARA/ASUNTO ─────────────────────────────────────────────────
    if es_interno:
        if destinatarios_qs:
            items_html = ''
            for i, d in enumerate(destinatarios_qs):
                u      = d.usuario
                nombre = u.nombre_completo if u else ''
                cargo  = getattr(u, 'cargo', '') or ''
                unid   = u.unidad.nombre if (u and u.unidad) else ''
                inner  = nombre
                if cargo:
                    inner += f'<br><span class="cargo">{cargo}</span>'
                if unid:
                    inner += f'<br><span class="cargo">{unid}</span>'
                last   = ' style="margin-bottom:0"' if i == len(destinatarios_qs) - 1 else ''
                items_html += f'<div class="item"{last}>{inner}</div>'
        else:
            fb = (doc.unidad_destino.nombre if doc.unidad_destino
                  else (doc.remitente_entidad or 'A quien corresponda'))
            items_html = f'<div class="item" style="margin-bottom:0">{fb}</div>'

        bloque_dest = f"""<div class="para">
          <span class="lbl">PARA:</span>
          <div class="dest">{items_html}</div>
        </div>
        <div class="asunto"><span class="lbl">ASUNTO:</span> {doc.asunto}</div>"""

    else:
        # Oficio: bloque Señor/a por destinatario
        bloques = ''
        if destinatarios_qs:
            for d in destinatarios_qs:
                u      = d.usuario
                nombre = u.nombre_completo if u else ''
                cargo  = getattr(u, 'cargo', '') or ''
                unid   = u.unidad.nombre if (u and u.unidad) else ''
                bloques += f"""<div class="bloque-senor">
                  <div>Señor/a</div>
                  <div class="dest-nombre">{nombre}</div>
                  {f'<div class="dest-cargo">{cargo}</div>'  if cargo else ''}
                  {f'<div class="dest-cargo">{unid}</div>'   if unid  else ''}
                  <div class="presente">Presente.-</div>
                </div>"""
        else:
            fb = (doc.unidad_destino.nombre if doc.unidad_destino
                  else (doc.remitente_entidad or 'A quien corresponda'))
            bloques = f"""<div class="bloque-senor">
              <div>Señor/a</div>
              <div class="dest-nombre">{fb}</div>
              <div class="presente">Presente.-</div>
            </div>"""

        bloque_dest = f"""{bloques}
        <div class="asunto-ofi"><strong>ASUNTO:</strong>&nbsp; {doc.asunto}</div>"""

    # ── Bloque firma ──────────────────────────────────────────────────────
    tiene_firma = bool(doc.firma_bce_info) or pre_firma

    if tiene_firma:
        separador_firma = '<div class="firma-elec-texto">Documento firmado electr&#xF3;nicamente</div>'
    else:
        separador_firma = '<div class="linea-firma"></div>'

    cuerpo_html   = doc.cuerpo or '<p style="color:#999;font-style:italic">[Sin contenido]</p>'
    pie_iniciales = f'<div class="iniciales">{iniciales}</div>' if iniciales else ''

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>{_CSS}</style>
</head>
<body>

  <img src="{MARCA_AGUA_SRC}" class="marca-agua" alt="">
  {f'<img src="{MARCA_BORRADOR_SRC}" class="marca-agua-borrador" alt="Borrador">' if es_borrador else ''}

  <!-- ENCABEZADO (running element → se repite en cada página) -->
  <div class="page-header">
    <div class="encabezado">
      <img src="{ESCUDO_SRC}"    class="enc-izq" alt="GAD Cotopaxi">
      <img src="{LOGO_PREF_SRC}" class="enc-der" alt="Prefectura COTOPAXI">
    </div>
    <div class="lineas">
      <div class="lin-roja"></div>
      <div class="lin-gap"></div>
      <div class="lin-azul"></div>
    </div>
  </div>

  <!-- PIE DE PÁGINA (running element → se repite en cada página) -->
  <div class="page-footer">
    <div class="lineas">
      <div class="lin-roja"></div>
      <div class="lin-gap"></div>
      <div class="lin-azul"></div>
    </div>
    <div class="pie-texto">
      <strong>Dir:</strong> Calle Tarqui N&#xB0; 507 y Quito &nbsp;&bull;&nbsp;
      <strong>Telf:</strong> (03) 2800&nbsp;416 - 2800&nbsp;418 &nbsp;&bull;&nbsp;
      <strong>Telefax:</strong> 2800&nbsp;411<br>
      <strong>E-mail:</strong> info@cotopaxi.gob.ec &nbsp;&bull;&nbsp;
      www.cotopaxi.gob.ec &nbsp;&bull;&nbsp; Cotopaxi - Ecuador
    </div>
  </div>

  <!-- CONTENIDO -->
  <div class="contenido">
    <div class="memo-body">

      <div class="enc">{nombre_tipo} Nro. {doc.numero_documento or '(por asignar)'}</div>
      <div class="enc">Latacunga, {fecha_doc}</div>

      {bloque_dest}

      <div class="cuerpo-doc">{cuerpo_html}</div>

      <div class="bloque-firma">
        <p>Atentamente,</p>
        {separador_firma}
        <div class="firma-nombre">{firmante}</div>
        {f'<div class="firma-cargo">{cargo_fir}</div>'   if cargo_fir   else ''}
        {f'<div class="firma-cargo">{unidad_orig}</div>' if unidad_orig else ''}
        {pie_iniciales}
      </div>

    </div>
  </div>


</body>
</html>
"""
