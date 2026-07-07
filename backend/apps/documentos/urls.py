from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoDocumentoViewSet, DocumentoViewSet,
    BandejaViewSet, EnviarDocumentoView,
    DocumentoPDFView, AdjuntoViewSet, DigitalizacionMasivaView,
    GenerarTokenFirmaECView, FirmaECCallbackView, FirmaFisicaView,
)

router = DefaultRouter()
router.register('tipos',   TipoDocumentoViewSet, basename='tipo-documento')
router.register('bandeja', BandejaViewSet,        basename='bandeja')
router.register('enviar',  EnviarDocumentoView,   basename='enviar-documento')
router.register('adjuntos', AdjuntoViewSet, basename='adjunto')
router.register('',        DocumentoViewSet,      basename='documento')

urlpatterns = [
    # PDF
    path('<int:pk>/pdf/', DocumentoPDFView.as_view(), name='documento-pdf'),

    # Digitalizacion masiva
    path('digitalizacion-masiva/', DigitalizacionMasivaView.as_view(), name='digitalizacion-masiva'),

    # FirmaEC — integración vía FirmaDigital service stack
    path('<int:pk>/firmaec/generar-token/',   GenerarTokenFirmaECView.as_view(),  name='firmaec-generar-token'),
    re_path(r'^firmaec/callback/?$',          FirmaECCallbackView.as_view(),      name='firmaec-callback'),

    # Firma fisica (papel)
    path('<int:pk>/firma-fisica/',          FirmaFisicaView.as_view(), name='firma-fisica'),

    path('', include(router.urls)),
]
