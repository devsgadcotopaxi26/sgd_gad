from django.urls import path
urlpatterns = []
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, TipoTramiteViewSet,
    PersonaViewSet, TramiteViewSet,
    PortalCiudadanoView, CalificarTramiteView,
)

router = DefaultRouter()
router.register('categorias', CategoriaViewSet,   basename='categoria')
router.register('tipos',      TipoTramiteViewSet, basename='tipo-tramite')
router.register('personas',   PersonaViewSet,     basename='persona')
router.register('',           TramiteViewSet,     basename='tramite')

urlpatterns = [
    path('portal/consultar/',  PortalCiudadanoView.as_view(),  name='portal-consultar'),
    path('portal/calificar/',  CalificarTramiteView.as_view(), name='portal-calificar'),
    path('', include(router.urls)),
]