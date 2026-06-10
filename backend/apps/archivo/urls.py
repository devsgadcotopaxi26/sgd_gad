from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SerieViewSet, ExpedienteViewSet

router = DefaultRouter()
router.register('series',      SerieViewSet,      basename='serie')
router.register('expedientes', ExpedienteViewSet, basename='expediente')

urlpatterns = [path('', include(router.urls))]