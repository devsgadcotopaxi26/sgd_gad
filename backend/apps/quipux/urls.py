"""
URLs para el modulo Quipux historico (solo lectura).
"""

from django.urls import path

from .views import (
    QuipuxDocumentoDetalleView,
    QuipuxDocumentosView,
    QuipuxEstadisticasView,
    QuipuxPDFView,
)

urlpatterns = [
    path('documentos/', QuipuxDocumentosView.as_view()),
    path('documentos/<str:radi_id>/', QuipuxDocumentoDetalleView.as_view()),
    path('documentos/<str:radi_id>/pdf/', QuipuxPDFView.as_view()),
    path('estadisticas/', QuipuxEstadisticasView.as_view()),
]
