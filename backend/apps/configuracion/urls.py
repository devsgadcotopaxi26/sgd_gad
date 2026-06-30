from django.urls import path
from .views import ConfiguracionSistemaView, TestEmailView

urlpatterns = [
    path('', ConfiguracionSistemaView.as_view(), name='configuracion'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
]