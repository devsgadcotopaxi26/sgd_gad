"""
URLs para el modulo Quipux historico.
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
    QuipuxReasignarView,
    QuipuxComentarView,
    QuipuxMarcarLeidoView,
    QuipuxActualizarTareaView,
    QuipuxResponderView,
    QuipuxEnviarView,
    QuipuxArchivarView,
    QuipuxBuscarContenidoView,
    QuipuxEstadoIndexacionView,
    QuipuxSecuencialView,
    QuipuxUsuariosView,
    QuipuxRespaldoView,
    QuipuxRecorridoPDFView,
)

urlpatterns = [
    path('documentos/',                                      QuipuxDocumentosView.as_view()),
    path('documentos/<str:radi_id>/',                        QuipuxDocumentoDetalleView.as_view()),
    path('documentos/<str:radi_id>/pdf/',                    QuipuxPDFView.as_view()),
    path('documentos/<str:radi_id>/anexos/',                 QuipuxAnexosView.as_view()),
    path('documentos/<str:radi_id>/reasignar/',              QuipuxReasignarView.as_view()),
    path('documentos/<str:radi_id>/comentar/',               QuipuxComentarView.as_view()),
    path('documentos/<str:radi_id>/marcar_leido/',           QuipuxMarcarLeidoView.as_view()),
    path('documentos/<str:radi_id>/responder/',              QuipuxResponderView.as_view()),
    path('documentos/<str:radi_id>/enviar/',                 QuipuxEnviarView.as_view()),
    path('documentos/<str:radi_id>/archivar/',               QuipuxArchivarView.as_view()),
    path('documentos/<str:radi_id>/recorrido-pdf/',          QuipuxRecorridoPDFView.as_view()),
    path('tareas/<int:tarea_codi>/avance/',                  QuipuxActualizarTareaView.as_view()),
    path('buscar-contenido/',                                QuipuxBuscarContenidoView.as_view()),
    path('indexacion/',                                      QuipuxEstadoIndexacionView.as_view()),
    path('anexos/<str:anex_codigo>/descargar/',              QuipuxAnexoDownloadView.as_view()),
    path('mis-bandejas/',                                    QuipuxMisBandejasView.as_view()),
    path('estadisticas/',                                    QuipuxEstadisticasView.as_view()),
    path('secuencial/',                                      QuipuxSecuencialView.as_view()),
    path('usuarios-quipux/',                                 QuipuxUsuariosView.as_view()),
    path('respaldo-bandeja/',                                QuipuxRespaldoView.as_view()),
]
