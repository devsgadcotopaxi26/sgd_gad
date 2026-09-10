from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoDocumentoViewSet, DocumentoViewSet,
    BandejaViewSet, EnviarDocumentoView, TareaViewSet, CarpetaVirtualViewSet,
    DocumentoPDFView, AdjuntoViewSet, DigitalizacionMasivaView,
    GenerarTokenFirmaECView, FirmaECCallbackView, FirmaFisicaView,
    ListaDistribucionViewSet,
    NumeracionUnidadView, NumeracionConfigView, NumeracionPreviewView,
    NumeracionAjustarSecuenciaView, NumeracionCopiarView,
)

router = DefaultRouter()
router.register('tipos',               TipoDocumentoViewSet,    basename='tipo-documento')
router.register('bandeja',             BandejaViewSet,          basename='bandeja')
router.register('tareas',              TareaViewSet,            basename='tarea')
router.register('carpetas',            CarpetaVirtualViewSet,   basename='carpeta-virtual')
router.register('enviar',              EnviarDocumentoView,     basename='enviar-documento')
router.register('adjuntos',            AdjuntoViewSet,          basename='adjunto')
router.register('listas-distribucion', ListaDistribucionViewSet, basename='lista-distribucion')
router.register('',                    DocumentoViewSet,        basename='documento')

urlpatterns = [
    # PDF
    path('<int:pk>/pdf/', DocumentoPDFView.as_view(), name='documento-pdf'),

    # Numeración configurable por Unidad × TipoDocumento (Etapa 2)
    path('numeracion/unidades/<int:unidad_id>/',
         NumeracionUnidadView.as_view(), name='numeracion-unidad'),
    path('numeracion/unidades/<int:unidad_id>/tipos/<int:tipo_id>/',
         NumeracionConfigView.as_view(), name='numeracion-config'),
    path('numeracion/unidades/<int:unidad_id>/tipos/<int:tipo_id>/preview/',
         NumeracionPreviewView.as_view(), name='numeracion-preview'),
    path('numeracion/unidades/<int:unidad_id>/tipos/<int:tipo_id>/ajustar-secuencia/',
         NumeracionAjustarSecuenciaView.as_view(), name='numeracion-ajustar'),
    path('numeracion/unidades/<int:unidad_id>/copiar-de/',
         NumeracionCopiarView.as_view(), name='numeracion-copiar'),

    # Digitalizacion masiva
    path('digitalizacion-masiva/', DigitalizacionMasivaView.as_view(), name='digitalizacion-masiva'),

    # FirmaEC — integración vía FirmaDigital service stack
    path('<int:pk>/firmaec/generar-token/',   GenerarTokenFirmaECView.as_view(),  name='firmaec-generar-token'),
    re_path(r'^firmaec/callback/?$',          FirmaECCallbackView.as_view(),      name='firmaec-callback'),

    # Firma fisica (papel)
    path('<int:pk>/firma-fisica/',          FirmaFisicaView.as_view(), name='firma-fisica'),

    path('', include(router.urls)),
]
