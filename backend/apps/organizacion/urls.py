from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NivelViewSet, FuncionViewSet, UnidadViewSet

router = DefaultRouter()
router.register('niveles',   NivelViewSet,   basename='nivel')
router.register('funciones', FuncionViewSet, basename='funcion')
router.register('unidades',  UnidadViewSet,  basename='unidad')

urlpatterns = [path('', include(router.urls))]