"""
Generación de reportes PDF con WeasyPrint
"""
import io
from datetime import datetime
from django.http import HttpResponse
from django.utils import timezone
from weasyprint import HTML, CSS


def generar_pdf(html_content: str, nombre_archivo: str) -> HttpResponse:
    pdf_file = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_file)
    pdf_file.seek(0)
    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
    return response


def html_base(titulo: str, subtitulo: str, contenido: str) -> str:
    fecha = timezone.now().strftime('%d/%m/%Y %H:%M')
    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 2cm 1.5cm;
    @bottom-center {{
      content: "Página " counter(page) " de " counter(pages);
      font-size: 9pt;
      color: #888;
    }}
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 10pt; color: #222; line-height: 1.5; }}

  .header {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #002f6c; padding-bottom: 12px; margin-bottom: 20px; }}
  .header-left {{ }}
  .inst {{ font-size: 14pt; font-weight: bold; color: #002f6c; }}
  .sub-inst {{ font-size: 9pt; color: #666; margin-top: 2px; }}
  .header-right {{ text-align: right; font-size: 8pt; color: #888; }}

  .report-title {{ background: #002f6c; color: #fff; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }}
  .report-title h1 {{ font-size: 13pt; font-weight: bold; }}
  .report-title p {{ font-size: 9pt; opacity: .8; margin-top: 3px; }}

  .kpi-row {{ display: flex; gap: 10px; margin-bottom: 16px; }}
  .kpi-box {{ flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; text-align: center; }}
  .kpi-box .val {{ font-size: 18pt; font-weight: bold; color: #002f6c; }}
  .kpi-box .lbl {{ font-size: 8pt; color: #666; margin-top: 2px; }}

  table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }}
  thead tr {{ background: #002f6c; color: #fff; }}
  thead th {{ padding: 7px 8px; text-align: left; font-weight: bold; font-size: 8.5pt; }}
  tbody tr:nth-child(even) {{ background: #f8faff; }}
  tbody td {{ padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }}

  .section-title {{ font-size: 11pt; font-weight: bold; color: #002f6c; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; margin-top: 16px; }}

  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: bold; }}
  .badge-blue  {{ background: #e8f1fd; color: #002f6c; }}
  .badge-green {{ background: #f0fdf4; color: #15803d; }}
  .badge-red   {{ background: #fef2f2; color: #dc2626; }}
  .badge-gray  {{ background: #f3f4f6; color: #374151; }}

  .footer-note {{ margin-top: 20px; font-size: 8pt; color: #888; border-top: 1px solid #e5e7eb; padding-top: 8px; }}
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="inst">GAD Provincial de Cotopaxi</div>
      <div class="sub-inst">Gobierno Autónomo Descentralizado de la Provincia de Cotopaxi</div>
    </div>
    <div class="header-right">
      Sistema de Gestión Documental<br>
      Generado: {fecha}
    </div>
  </div>

  <div class="report-title">
    <h1>{titulo}</h1>
    <p>{subtitulo}</p>
  </div>

  {contenido}

  <div class="footer-note">
    Documento generado automáticamente por el SGD — GAD Provincia de Cotopaxi · {fecha}
  </div>
</body>
</html>
"""


def reporte_tramites(tramites, filtros: dict) -> str:
    from apps.tramites.models import Tramite
    hoy = timezone.now().date()

    total      = len(tramites)
    resueltos  = sum(1 for t in tramites if t.estado == 'resuelto')
    pendientes = sum(1 for t in tramites if t.estado in ('ingresado','asignado','en_proceso'))
    vencidos   = sum(1 for t in tramites if t.fecha_limite < hoy and t.estado not in ('resuelto','archivado','rechazado'))

    kpis = f"""
    <div class="kpi-row">
      <div class="kpi-box"><div class="val">{total}</div><div class="lbl">Total trámites</div></div>
      <div class="kpi-box"><div class="val">{resueltos}</div><div class="lbl">Resueltos</div></div>
      <div class="kpi-box"><div class="val">{pendientes}</div><div class="lbl">Pendientes</div></div>
      <div class="kpi-box"><div class="val">{vencidos}</div><div class="lbl">Vencidos</div></div>
    </div>
    """

    ESTADO_BADGE = {
        'ingresado':  'badge-blue',
        'asignado':   'badge-blue',
        'en_proceso': 'badge-blue',
        'resuelto':   'badge-green',
        'rechazado':  'badge-red',
        'archivado':  'badge-gray',
    }

    filas = ''
    for t in tramites:
        badge = ESTADO_BADGE.get(t.estado, 'badge-gray')
        dias  = (t.fecha_limite - hoy).days if t.estado not in ('resuelto','archivado','rechazado') else '—'
        filas += f"""
        <tr>
          <td><strong>{t.numero_tramite}</strong></td>
          <td>{t.asunto[:60]}</td>
          <td>{t.persona.nombre_completo}</td>
          <td>{t.unidad_responsable.siglas or t.unidad_responsable.nombre[:15]}</td>
          <td>{t.fecha_ingreso.strftime('%d/%m/%Y')}</td>
          <td>{t.fecha_limite.strftime('%d/%m/%Y')}</td>
          <td><span class="badge {badge}">{t.get_estado_display()}</span></td>
          <td>{dias}</td>
        </tr>
        """

    tabla = f"""
    <div class="section-title">Detalle de trámites</div>
    <table>
      <thead>
        <tr>
          <th>N° Trámite</th><th>Asunto</th><th>Ciudadano</th>
          <th>Unidad</th><th>Ingreso</th><th>Límite</th>
          <th>Estado</th><th>Días rest.</th>
        </tr>
      </thead>
      <tbody>{filas}</tbody>
    </table>
    """

    periodo = filtros.get('periodo', 'Todos los períodos')
    return html_base(
        'Reporte de trámites ciudadanos',
        f'Período: {periodo} · Total: {total} registros',
        kpis + tabla
    )


def reporte_documentos(documentos, filtros: dict) -> str:
    total     = len(documentos)
    firmados  = sum(1 for d in documentos if d.fecha_firma)
    borradores = sum(1 for d in documentos if d.estado == 'borrador')
    enviados  = sum(1 for d in documentos if d.estado == 'enviado')

    kpis = f"""
    <div class="kpi-row">
      <div class="kpi-box"><div class="val">{total}</div><div class="lbl">Total documentos</div></div>
      <div class="kpi-box"><div class="val">{firmados}</div><div class="lbl">Firmados</div></div>
      <div class="kpi-box"><div class="val">{enviados}</div><div class="lbl">Enviados</div></div>
      <div class="kpi-box"><div class="val">{borradores}</div><div class="lbl">Borradores</div></div>
    </div>
    """

    ESTADO_BADGE = {
        'borrador':    'badge-gray',
        'en_revision': 'badge-blue',
        'aprobado':    'badge-green',
        'enviado':     'badge-blue',
        'archivado':   'badge-gray',
        'anulado':     'badge-red',
    }

    filas = ''
    for d in documentos:
        badge = ESTADO_BADGE.get(d.estado, 'badge-gray')
        filas += f"""
        <tr>
          <td><strong>{d.numero_documento or '—'}</strong></td>
          <td>{d.tipo_documento.nombre}</td>
          <td>{d.asunto[:55]}</td>
          <td>{d.unidad_origen.siglas or d.unidad_origen.nombre[:15]}</td>
          <td>{d.creado_en.strftime('%d/%m/%Y')}</td>
          <td><span class="badge {badge}">{d.get_estado_display()}</span></td>
        </tr>
        """

    tabla = f"""
    <div class="section-title">Detalle de documentos</div>
    <table>
      <thead>
        <tr>
          <th>N° Documento</th><th>Tipo</th><th>Asunto</th>
          <th>Unidad</th><th>Fecha</th><th>Estado</th>
        </tr>
      </thead>
      <tbody>{filas}</tbody>
    </table>
    """

    periodo = filtros.get('periodo', 'Todos los períodos')
    return html_base(
        'Reporte de documentos institucionales',
        f'Período: {periodo} · Total: {total} registros',
        kpis + tabla
    )


def reporte_kpi_unidades(unidades_data: list) -> str:
    filas = ''
    for u in unidades_data:
        pct = round(u['resueltos'] / u['total'] * 100, 1) if u['total'] > 0 else 0
        filas += f"""
        <tr>
          <td><strong>{u['unidad']}</strong></td>
          <td>{u['total']}</td>
          <td>{u['pendientes']}</td>
          <td>{u['resueltos']}</td>
          <td>{pct}%</td>
        </tr>
        """

    tabla = f"""
    <div class="section-title">KPIs por unidad organizativa</div>
    <table>
      <thead>
        <tr>
          <th>Unidad</th><th>Total trámites</th>
          <th>Pendientes</th><th>Resueltos (mes)</th><th>% Cumplimiento</th>
        </tr>
      </thead>
      <tbody>{filas}</tbody>
    </table>
    """

    fecha = timezone.now().strftime('%B %Y')
    return html_base(
        'Reporte KPIs por unidad',
        f'Período: {fecha}',
        tabla
    )