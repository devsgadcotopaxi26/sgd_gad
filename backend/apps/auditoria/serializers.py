from rest_framework import serializers
from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notificacion
        fields = [
            'id', 'tipo', 'titulo', 'mensaje', 'url_accion',
            'leido', 'leido_en', 'estado', 'creado_en',
            'tramite_id', 'documento_id',
        ]

from .models import LogAuditoria

class LogAuditoriaSerializer(serializers.ModelSerializer):
    accion_label = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model  = LogAuditoria
        fields = [
            'id', 'tabla', 'registro_id', 'accion', 'accion_label',
            'modulo', 'descripcion', 'usuario_id', 'usuario_email',
            'unidad_id', 'ip_address', 'campos_cambiados',
            'datos_antes', 'datos_despues', 'creado_en',
        ]