"""
URLs para el modulo Quipux historico (solo lectura).
"""

from django.urls import path

from .views import (
    QuipuxDocumentoDetalleView,
    QuipuxDocumentosView,
    QuipuxEstadisticasView,
    QuipuxPDFView,
    QuipuxAnexosView,
    QuipuxAnexoDownloadView,
    QuipuxMisBandejasView,
)

urlpatterns = [
    path('documentos/',                          QuipuxDocumentosView.as_view()),
    path('documentos/<str:radi_id>/',            QuipuxDocumentoDetalleView.as_view()),
    path('documentos/<str:radi_id>/pdf/',        QuipuxPDFView.as_view()),
    path('documentos/<str:radi_id>/anexos/',     QuipuxAnexosView.as_view()),
    path('anexos/<str:anex_codigo>/descargar/',  QuipuxAnexoDownloadView.as_view()),
    path('mis-bandejas/',                        QuipuxMisBandejasView.as_view()),
    path('estadisticas/',                        QuipuxEstadisticasView.as_view()),
]
