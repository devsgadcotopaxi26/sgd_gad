from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoDocumentoViewSet, DocumentoViewSet,
    BandejaViewSet, EnviarDocumentoView,
    DocumentoPDFView, AdjuntoViewSet, DigitalizacionMasivaView
)

router = DefaultRouter()
router.register('tipos',   TipoDocumentoViewSet, basename='tipo-documento')
router.register('bandeja', BandejaViewSet,        basename='bandeja')
router.register('enviar',  EnviarDocumentoView,   basename='enviar-documento')
router.register('adjuntos', AdjuntoViewSet, basename='adjunto')
router.register('',        DocumentoViewSet,      basename='documento')

urlpatterns = [
    path('<int:pk>/pdf/', DocumentoPDFView.as_view(), name='documento-pdf'),
    path('digitalizacion-masiva/', DigitalizacionMasivaView.as_view(), name='digitalizacion-masiva'),
    path('', include(router.urls)),
]