"""
SGD — URLs principales
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

API_V1 = 'api/v1/'

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth
    path(API_V1 + 'auth/login/',   TokenObtainPairView.as_view(),  name='token_obtain_pair'),
    path(API_V1 + 'auth/refresh/', TokenRefreshView.as_view(),     name='token_refresh'),
    path(API_V1 + 'auth/verify/',  TokenVerifyView.as_view(),      name='token_verify'),

    # Apps
    path(API_V1 + 'usuarios/',     include('apps.usuarios.urls')),
    path(API_V1 + 'organizacion/', include('apps.organizacion.urls')),
    path(API_V1 + 'documentos/',   include('apps.documentos.urls')),
    path(API_V1 + 'tramites/',     include('apps.tramites.urls')),
    path(API_V1 + 'correos/',      include('apps.correos.urls')),
    path(API_V1 + 'archivo/',      include('apps.archivo.urls')),
    path(API_V1 + 'auditoria/',    include('apps.auditoria.urls')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)