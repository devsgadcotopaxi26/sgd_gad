from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoDocumentoViewSet, DocumentoViewSet

router = DefaultRouter()
router.register('tipos',  TipoDocumentoViewSet, basename='tipo-documento')
router.register('',       DocumentoViewSet,      basename='documento')

urlpatterns = [path('', include(router.urls))]