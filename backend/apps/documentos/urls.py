from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoDocumentoViewSet, DocumentoViewSet,
    BandejaViewSet, EnviarDocumentoView,
    DocumentoPDFView, AdjuntoViewSet, DigitalizacionMasivaView,
    GenerarTokenFirmaECView, BajarDocumentoFirmaECView,
    GuardarDocumentoFirmaECView, FirmaFisicaView,
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

    # FirmaEC — app de firma electronica del gobierno Ecuador
    # re_path con /? porque FirmaEC hace POST sin barra final y Django no redirige POST
    path('<int:pk>/firmaec/generar-token/', GenerarTokenFirmaECView.as_view(), name='firmaec-generar-token'),
    re_path(r'^firmaec/bajar_documento/?$',   BajarDocumentoFirmaECView.as_view(),  name='firmaec-bajar'),
    re_path(r'^firmaec/guardar_documento/?$', GuardarDocumentoFirmaECView.as_view(), name='firmaec-guardar'),

    # Firma fisica (papel)
    path('<int:pk>/firma-fisica/',          FirmaFisicaView.as_view(), name='firma-fisica'),

    path('', include(router.urls)),
]
