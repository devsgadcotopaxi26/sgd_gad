from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, LogoutView, MiPerfilView, UsuarioViewSet, RolViewSet

router = DefaultRouter()
router.register('roles', RolViewSet, basename='rol')
router.register('', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('auth/login/',   LoginView.as_view(),    name='login'),
    path('auth/logout/',  LogoutView.as_view(),   name='logout'),
    path('auth/perfil/',  MiPerfilView.as_view(), name='perfil'),
    path('', include(router.urls)),
]