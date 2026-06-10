from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.auditoria.views import (
    DashboardStatsView, KpiUnidadView,
    ReporteTramitesPDFView, ReporteDocumentosPDFView, ReporteKPIUnidadesPDFView,
)
from apps.auditoria.notificaciones_views import NotificacionViewSet

router = DefaultRouter()
router.register('notificaciones', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('dashboard/',             DashboardStatsView.as_view(),       name='dashboard-stats'),
    path('kpi-unidades/',          KpiUnidadView.as_view(),            name='kpi-unidades'),
    path('reportes/tramites/',     ReporteTramitesPDFView.as_view(),   name='reporte-tramites'),
    path('reportes/documentos/',   ReporteDocumentosPDFView.as_view(), name='reporte-documentos'),
    path('reportes/kpi-unidades/', ReporteKPIUnidadesPDFView.as_view(),name='reporte-kpi'),
    path('', include(router.urls)),
]