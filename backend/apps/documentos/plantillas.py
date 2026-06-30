"""
Plantillas de documentos oficiales con membrete institucional
GAD Provincial de Cotopaxi — Hoja membretada 2023-2027
"""
from django.utils import timezone

ESCUDO_URL  = 'https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg'

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

MESES_ES = {
    'January': 'enero',   'February': 'febrero', 'March': 'marzo',
    'April': 'abril',     'May': 'mayo',          'June': 'junio',
    'July': 'julio',      'August': 'agosto',     'September': 'septiembre',
    'October': 'octubre', 'November': 'noviembre','December': 'diciembre',
}


def html_documento_oficial(doc) -> str:
    prefijo     = doc.tipo_documento.prefijo_numeracion or 'OFI'
    acento      = ACENTO_TIPO.get(prefijo, '#002f6c')
    nombre_tipo = NOMBRE_TIPO_LARGO.get(prefijo, doc.tipo_documento.nombre.upper())

    fecha_doc = doc.fecha_elaboracion.strftime('%d de %B de %Y') if doc.fecha_elaboracion else timezone.now().strftime('%d de %B de %Y')
    for en, es in MESES_ES.items():
        fecha_doc = fecha_doc.replace(en, es)

    destino  = doc.unidad_destino.nombre if doc.unidad_destino else (doc.remitente_entidad or 'A quien corresponda')
    firmante = doc.firmado_por.nombre_completo if doc.firmado_por else doc.creado_por.nombre_completo
    cargo_firmante = getattr(doc.firmado_por or doc.creado_por, 'cargo', '') or ''

    firma_bce_bloque = ''
    if doc.firma_bce_info:
        info = doc.firma_bce_info
        firma_bce_bloque = f"""
        <div class="sello-firma">
          <span class="sello-check">✓</span>
          <div>
            <strong>Firmado electrónicamente — FirmaEC:</strong> {info.get('firmado_por', firmante)}<br>
            Entidad: {info.get('entidad_cert', '—')} · Fecha: {(info.get('fecha_firma', '')[:10]) if info.get('fecha_firma') else '—'}<br>
            <span style="font-size:7.5pt;font-style:italic;color:#4d7c0f">Valido segun Art. 14, Ley de Comercio Electronico, Firmas Electronicas y Mensajes de Datos del Ecuador</span>
          </div>
        </div>
        """

    cuerpo_html = doc.cuerpo if doc.cuerpo else '<p style="color:#999;font-style:italic">[Sin contenido]</p>'

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 0;
    @bottom-center {{
      content: "Página " counter(page) " de " counter(pages);
      font-size: 8pt; color: #666; font-family: Arial, sans-serif;
    }}
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
  }}

  /* ── PÁGINA con márgenes que respetan membrete ── */
  .pagina {{
    width: 21cm;
    min-height: 29.7cm;
    padding: 0;
    position: relative;
    overflow: hidden;
  }}

  /* ── MARCA DE AGUA ── */
  .marca-agua {{
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14cm;
    opacity: 0.04;
    z-index: 0;
  }}

  /* ── ENCABEZADO membretado oficial ── */
  .encabezado {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 30px 0 30px;
    position: relative;
    z-index: 1;
  }}
  .enc-escudo {{ width: 70px; height: auto; }}
  .enc-lineas {{
    display: flex;
    gap: 0;
    margin: 8px 30px 0 30px;
  }}
  .enc-linea-roja-izq {{
    height: 2.5px;
    flex: 45;
    background: #da291c;
  }}
  .enc-linea-gap {{
    flex: 10;
  }}
  .enc-linea-azul-der {{
    height: 2.5px;
    flex: 45;
    background: #002f6c;
  }}

  /* ── CUERPO DEL DOCUMENTO ── */
  .contenido {{
    padding: 24px 50px 20px 50px;
    position: relative;
    z-index: 1;
  }}

  .tipo-badge {{
    display: inline-block;
    background: {acento};
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 8.5pt;
    font-weight: bold;
    letter-spacing: 1.5px;
    padding: 4px 14px;
    border-radius: 3px;
    margin-bottom: 16px;
  }}

  .cabecera-num-fecha {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
  }}
  .num-doc  {{ font-size: 10.5pt; font-weight: bold; color: #1a1a1a; }}
  .fecha-doc {{ font-size: 10pt; color: #555; }}

  .destinatario {{ margin-bottom: 18px; font-size: 11pt; }}
  .destinatario .saludo  {{ margin-bottom: 3px; }}
  .destinatario .nombre  {{ font-weight: bold; }}
  .destinatario .presente {{ font-style: italic; color: #555; margin-top: 2px; }}

  .asunto-bloque {{
    background: #f8faff;
    border-left: 3px solid {acento};
    padding: 8px 14px;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
  }}
  .asunto-bloque .asunto-label {{
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: {acento};
    display: block;
    margin-bottom: 3px;
  }}

  .cuerpo-doc {{
    text-align: justify;
    margin-bottom: 40px;
    font-size: 11pt;
  }}
  .cuerpo-doc p {{ margin-bottom: 10px; }}

  /* ── FIRMA ── */
  .bloque-firma {{
    margin-top: 40px;
    text-align: center;
    font-size: 10.5pt;
  }}
  .atte     {{ text-align: left; margin-bottom: 44px; }}
  .linea-firma {{ border-top: 1px solid #1a1a1a; width: 220px; margin: 0 auto 6px; }}
  .nombre-firma {{ font-weight: bold; font-family: Arial, sans-serif; }}
  .cargo-firma  {{ font-size: 9.5pt; color: #555; margin-top: 2px; font-family: Arial, sans-serif; }}

  /* ── SELLO FIRMA ELECTRÓNICA ── */
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
    width: 22px; height: 22px; border-radius: 50%;
    background: #15803d; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 13pt; font-weight: bold; flex-shrink: 0;
    line-height: 22px; text-align: center;
  }}

  /* ── PIE DE PÁGINA oficial ── */
  .pie-pagina {{
    position: fixed;
    bottom: 0;
    left: 0; right: 0;
    padding: 0 30px 12px 30px;
    z-index: 1;
  }}
  .pie-lineas {{
    display: flex;
    gap: 0;
    margin-bottom: 6px;
  }}
  .pie-linea-roja-izq {{
    height: 2px;
    flex: 45;
    background: #da291c;
  }}
  .pie-linea-gap {{
    flex: 10;
  }}
  .pie-linea-azul-der {{
    height: 2px;
    flex: 45;
    background: #002f6c;
  }}
  .pie-texto {{
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #444;
    text-align: center;
    line-height: 1.6;
  }}
  .pie-texto strong {{ color: #1a1a1a; }}
</style>
</head>
<body>
<div class="pagina">

  <!-- Marca de agua -->
  <img src="{ESCUDO_URL}" class="marca-agua" alt="">

  <!-- Encabezado membretado -->
  <div class="encabezado">
    <img src="{ESCUDO_URL}" class="enc-escudo" alt="Escudo GAD Cotopaxi">
    <div style="text-align:right">
      <div style="font-family:Arial;font-size:13pt;font-weight:700;color:#002f6c">Prefectura</div>
      <div style="font-family:Arial;font-size:16pt;font-weight:900;color:#002f6c;letter-spacing:-1px">COTOPAXI</div>
      <div style="font-family:Arial;font-size:7pt;color:#666">Juntos, construimos la nueva historia</div>
    </div>
  </div>
  <div class="enc-lineas">
    <div class="enc-linea-roja-izq"></div>
    <div class="enc-linea-gap"></div>
    <div class="enc-linea-azul-der"></div>
  </div>

  <!-- Contenido -->
  <div class="contenido">
    <div class="tipo-badge">{nombre_tipo}</div>

    <div class="cabecera-num-fecha">
      <span class="num-doc">{nombre_tipo} N.° {doc.numero_documento or '(por asignar)'}</span>
      <span class="fecha-doc">Latacunga, {fecha_doc}</span>
    </div>

    <div class="destinatario">
      <p class="saludo">Señor/a</p>
      <p class="nombre">{destino}</p>
      <p class="presente">Presente.-</p>
    </div>

    <div class="asunto-bloque">
      <span class="asunto-label">Asunto</span>
      {doc.asunto}
    </div>

    <div class="cuerpo-doc">
      {cuerpo_html}
    </div>

    <div class="bloque-firma">
      <p class="atte">Atentamente,</p>
      <div class="linea-firma"></div>
      <p class="nombre-firma">{firmante}</p>
      {f'<p class="cargo-firma">{cargo_firmante}</p>' if cargo_firmante else ''}
      <p class="cargo-firma">{doc.unidad_origen.nombre}</p>
    </div>

    {firma_bce_bloque}
  </div>

  <!-- Pie de página oficial -->
  <div class="pie-pagina">
    <div class="pie-lineas">
      <div class="pie-linea-roja-izq"></div>
      <div class="pie-linea-gap"></div>
      <div class="pie-linea-azul-der"></div>
    </div>
    <div class="pie-texto">
      <strong>Dir:</strong> Calle Tarqui N° 507 y Quito &nbsp;•&nbsp;
      <strong>Telf:</strong> (03) 2800 416 - 2800 418 &nbsp;•&nbsp;
      <strong>Telefax:</strong> 2800 411<br>
      <strong>E-mail:</strong> documentacion@cotopaxi.gob.ec &nbsp;•&nbsp;
      www.cotopaxi.gob.ec &nbsp;•&nbsp; Cotopaxi - Ecuador
    </div>
  </div>

</div>
</body>
</html>
"""