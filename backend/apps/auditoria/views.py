from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.tramites.models import Tramite
from apps.documentos.models import Documento
from apps.correos.models import Correo
from apps.archivo.models import Expediente
from apps.usuarios.models import Usuario
from django.http import HttpResponse
from .reportes import generar_pdf, reporte_tramites, reporte_documentos, reporte_kpi_unidades


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy      = timezone.now().date()
        hace_30d = hoy - timedelta(days=30)
        hace_7d  = hoy - timedelta(days=7)

        # ── KPIs principales ─────────────────────────────────
        tramites_pendientes = Tramite.objects.filter(
            estado__in=['ingresado', 'asignado', 'en_proceso', 'en_inspeccion']
        ).count()

        tramites_vencen_hoy = Tramite.objects.filter(
            fecha_limite=hoy,
            estado__in=['ingresado', 'asignado', 'en_proceso']
        ).count()

        tramites_resueltos_mes = Tramite.objects.filter(
            estado='resuelto',
            fecha_resolucion__date__gte=hace_30d
        ).count()

        correos_sin_atender = Correo.objects.filter(
            respondido=False,
            estado__in=['nuevo', 'registrado', 'asignado', 'en_proceso']
        ).count()

        docs_pendientes = Documento.objects.filter(
            estado__in=['borrador', 'en_revision']
        ).count()

        # ── Trámites por categoría ────────────────────────────
        tramites_categoria = list(
            Tramite.objects.filter(
                fecha_ingreso__date__gte=hace_30d
            ).values(
                'tipo_tramite__categoria__nombre'
            ).annotate(
                total=Count('id')
            ).order_by('-total')[:6]
        )

        # ── Documentos últimos 7 días ─────────────────────────
        docs_7d = []
        for i in range(6, -1, -1):
            dia   = hoy - timedelta(days=i)
            count = Documento.objects.filter(
                creado_en__date=dia
            ).count()
            docs_7d.append({
                'fecha': dia.strftime('%d/%m'),
                'dia':   ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dia.weekday()],
                'total': count,
            })

        # ── Trámites recientes ────────────────────────────────
        tramites_recientes = []
        for t in Tramite.objects.select_related(
            'persona', 'tipo_tramite', 'unidad_responsable'
        ).order_by('-fecha_ingreso')[:5]:
            tramites_recientes.append({
                'id':             t.id,
                'numero':         t.numero_tramite,
                'asunto':         t.asunto[:50],
                'estado':         t.estado,
                'persona':        t.persona.nombre_completo,
                'unidad':         t.unidad_responsable.siglas or t.unidad_responsable.nombre[:20],
                'fecha_ingreso':  t.fecha_ingreso.strftime('%d/%m/%Y %H:%M'),
                'dias_restantes': (t.fecha_limite - hoy).days if t.estado not in ('resuelto','archivado','rechazado') else None,
            })

        # ── Documentos recientes ──────────────────────────────
        docs_recientes = []
        for d in Documento.objects.select_related(
            'tipo_documento', 'unidad_origen', 'creado_por'
        ).order_by('-creado_en')[:5]:
            docs_recientes.append({
                'id':       d.id,
                'numero':   d.numero_documento or str(d.uuid)[:8],
                'asunto':   d.asunto[:50],
                'estado':   d.estado,
                'tipo':     d.tipo_documento.nombre,
                'unidad':   d.unidad_origen.siglas or d.unidad_origen.nombre[:20],
                'fecha':    d.creado_en.strftime('%d/%m/%Y %H:%M'),
            })

        # ── Actividad reciente (log) ──────────────────────────
        actividad = []
        for t in Tramite.objects.select_related(
            'usuario_asignado', 'unidad_responsable'
        ).filter(
            modificado_en__date__gte=hace_7d
        ).order_by('-modificado_en')[:8]:
            actividad.append({
                'tipo':   'tramite',
                'texto':  f'Trámite {t.numero_tramite} — {t.get_estado_display()}',
                'unidad': t.unidad_responsable.siglas or '',
                'fecha':  t.modificado_en.strftime('%d/%m %H:%M'),
                'color':  '#002f6c',
            })

        for d in Documento.objects.select_related(
            'creado_por', 'unidad_origen'
        ).filter(
            modificado_en__date__gte=hace_7d
        ).order_by('-modificado_en')[:4]:
            actividad.append({
                'tipo':   'documento',
                'texto':  f'{d.tipo_documento.nombre} {d.numero_documento or ""} — {d.get_estado_display()}',
                'unidad': d.unidad_origen.siglas or '',
                'fecha':  d.modificado_en.strftime('%d/%m %H:%M'),
                'color':  '#5b3a8c',
            })

        actividad.sort(key=lambda x: x['fecha'], reverse=True)

        # ── Próximos a vencer ─────────────────────────────────
        proximos_vencer = []
        for t in Tramite.objects.select_related(
            'unidad_responsable'
        ).filter(
            fecha_limite__lte=hoy + timedelta(days=5),
            estado__in=['ingresado', 'asignado', 'en_proceso']
        ).order_by('fecha_limite')[:5]:
            dias = (t.fecha_limite - hoy).days
            proximos_vencer.append({
                'numero':  t.numero_tramite,
                'titulo':  t.asunto[:40],
                'unidad':  t.unidad_responsable.siglas or t.unidad_responsable.nombre[:15],
                'dias':    dias,
                'tipo':    'tramite',
            })

        # ── Cumplimiento de plazos ────────────────────────────
        resueltos_mes = Tramite.objects.filter(
            estado='resuelto', fecha_resolucion__date__gte=hace_30d
        )
        total_res  = resueltos_mes.count()
        en_plazo   = resueltos_mes.filter(dentro_plazo=True).count()
        cumplimiento = round(en_plazo / total_res * 100, 1) if total_res > 0 else 0

        # ── Satisfacción ciudadana ─────────────────────────────
        sat = Tramite.objects.filter(
            calificacion__isnull=False
        ).aggregate(promedio=Avg('calificacion'))
        satisfaccion = round(sat['promedio'] or 0, 1)

        return Response({
            'kpis': {
                'tramites_pendientes':    tramites_pendientes,
                'tramites_vencen_hoy':    tramites_vencen_hoy,
                'tramites_resueltos_mes': tramites_resueltos_mes,
                'correos_sin_atender':    correos_sin_atender,
                'docs_pendientes':        docs_pendientes,
                'cumplimiento_plazo':     cumplimiento,
                'satisfaccion':           satisfaccion,
            },
            'tramites_categoria': tramites_categoria,
            'docs_7d':            docs_7d,
            'tramites_recientes': tramites_recientes,
            'docs_recientes':     docs_recientes,
            'actividad':          actividad[:8],
            'proximos_vencer':    proximos_vencer,
        })


class KpiUnidadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy      = timezone.now().date()
        hace_30d = hoy - timedelta(days=30)

        unidades_stats = []
        from apps.organizacion.models import Unidad
        for u in Unidad.objects.filter(
            tipo__in=['direccion', 'secretaria'], activo=True
        ).order_by('orden_display')[:8]:
            total   = Tramite.objects.filter(unidad_responsable=u).count()
            pend    = Tramite.objects.filter(
                unidad_responsable=u,
                estado__in=['ingresado', 'asignado', 'en_proceso']
            ).count()
            res_mes = Tramite.objects.filter(
                unidad_responsable=u,
                estado='resuelto',
                fecha_resolucion__date__gte=hace_30d
            ).count()
            unidades_stats.append({
                'unidad':    u.siglas or u.nombre[:20],
                'total':     total,
                'pendientes': pend,
                'resueltos': res_mes,
            })

        return Response({'unidades': unidades_stats})

class ReporteTramitesPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.tramites.models import Tramite
        estado  = request.query_params.get('estado', '')
        unidad  = request.query_params.get('unidad', '')
        desde   = request.query_params.get('desde', '')
        hasta   = request.query_params.get('hasta', '')

        qs = Tramite.objects.select_related(
            'persona', 'tipo_tramite', 'unidad_responsable'
        ).order_by('-fecha_ingreso')

        if estado:
            qs = qs.filter(estado=estado)
        if unidad:
            qs = qs.filter(unidad_responsable_id=unidad)
        if desde:
            qs = qs.filter(fecha_ingreso__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha_ingreso__date__lte=hasta)

        tramites = list(qs[:500])
        filtros  = {'periodo': f'{desde or "Inicio"} — {hasta or "Hoy"}'}
        html     = reporte_tramites(tramites, filtros)
        return generar_pdf(html, f'reporte_tramites_{timezone.now().strftime("%Y%m%d")}.pdf')


class ReporteDocumentosPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.documentos.models import Documento
        estado = request.query_params.get('estado', '')
        tipo   = request.query_params.get('tipo', '')
        desde  = request.query_params.get('desde', '')
        hasta  = request.query_params.get('hasta', '')

        qs = Documento.objects.select_related(
            'tipo_documento', 'unidad_origen'
        ).order_by('-creado_en')

        if estado:
            qs = qs.filter(estado=estado)
        if tipo:
            qs = qs.filter(tipo_documento_id=tipo)
        if desde:
            qs = qs.filter(creado_en__date__gte=desde)
        if hasta:
            qs = qs.filter(creado_en__date__lte=hasta)

        documentos = list(qs[:500])
        filtros    = {'periodo': f'{desde or "Inicio"} — {hasta or "Hoy"}'}
        html       = reporte_documentos(documentos, filtros)
        return generar_pdf(html, f'reporte_documentos_{timezone.now().strftime("%Y%m%d")}.pdf')


class ReporteKPIUnidadesPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        hoy      = timezone.now().date()
        hace_30d = hoy - timedelta(days=30)
        from apps.organizacion.models import Unidad
        from apps.tramites.models import Tramite
        from django.db.models import Count

        unidades_data = []
        for u in Unidad.objects.filter(tipo__in=['direccion','secretaria'], activo=True).order_by('orden_display')[:15]:
            total   = Tramite.objects.filter(unidad_responsable=u).count()
            pend    = Tramite.objects.filter(unidad_responsable=u, estado__in=['ingresado','asignado','en_proceso']).count()
            res_mes = Tramite.objects.filter(unidad_responsable=u, estado='resuelto', fecha_resolucion__date__gte=hace_30d).count()
            if total > 0:
                unidades_data.append({'unidad': u.siglas or u.nombre[:25], 'total': total, 'pendientes': pend, 'resueltos': res_mes})

        html = reporte_kpi_unidades(unidades_data)
        return generar_pdf(html, f'reporte_kpi_{timezone.now().strftime("%Y%m%d")}.pdf')