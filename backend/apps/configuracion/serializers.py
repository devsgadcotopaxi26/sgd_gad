from rest_framework import serializers
from .models import ConfiguracionSistema


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    modificado_por_nombre = serializers.CharField(
        source='modificado_por.nombre_completo', read_only=True
    )

    class Meta:
        model  = ConfiguracionSistema
        fields = '__all__'
        read_only_fields = ['creado_en', 'modificado_en', 'modificado_por']