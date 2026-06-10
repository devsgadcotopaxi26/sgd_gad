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