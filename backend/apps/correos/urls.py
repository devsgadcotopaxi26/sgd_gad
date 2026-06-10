from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CorreoViewSet

router = DefaultRouter()
router.register('', CorreoViewSet, basename='correo')

urlpatterns = [path('', include(router.urls))]