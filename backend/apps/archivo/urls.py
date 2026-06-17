from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FondoViewSet, SeccionViewSet, SerieViewSet, ExpedienteViewSet,
    TransferenciaViewSet, BajaDocumentalViewSet,
    PrestamoDocumentalViewSet, CopiaCertificadaViewSet,
)

router = DefaultRouter()
router.register('fondos', FondoViewSet, basename='fondo')
router.register('secciones', SeccionViewSet, basename='seccion')
router.register('series', SerieViewSet, basename='serie')
router.register('expedientes', ExpedienteViewSet, basename='expediente')
router.register('transferencias', TransferenciaViewSet, basename='transferencia')
router.register('bajas-documentales', BajaDocumentalViewSet, basename='baja-documental')
router.register('prestamos', PrestamoDocumentalViewSet, basename='prestamo')
router.register('copias-certificadas', CopiaCertificadaViewSet, basename='copia-certificada')

urlpatterns = [
    path('', include(router.urls)),
]