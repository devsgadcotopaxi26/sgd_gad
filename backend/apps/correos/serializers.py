from rest_framework import serializers
from .models import Correo, SeguimientoCorreo, AdjuntoCorreo


class AdjuntoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AdjuntoCorreo
        fields = '__all__'


class SeguimientoCorreoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)

    class Meta:
        model  = SeguimientoCorreo
        fields = '__all__'


class CorreoListSerializer(serializers.ModelSerializer):
    unidad_destino_nombre   = serializers.CharField(source='unidad_destino.nombre',            read_only=True)
    unidad_destino_siglas   = serializers.CharField(source='unidad_destino.siglas',            read_only=True)
    usuario_asignado_nombre = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True)
    vencido                 = serializers.BooleanField(read_only=True)
    dias_para_vencer        = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Correo
        fields = [
            'id', 'numero_registro', 'tipo', 'asunto',
            'remitente_email', 'remitente_nombre', 'remitente_entidad',
            'estado', 'prioridad', 'etiquetas',
            'fecha_recepcion', 'fecha_limite_resp',
            'respondido', 'leido', 'num_adjuntos',
            'unidad_destino_nombre', 'unidad_destino_siglas',
            'usuario_asignado_nombre', 'vencido', 'dias_para_vencer',
            'doc_generado', 'tramite_generado',
        ]


class CorreoDetalleSerializer(serializers.ModelSerializer):
    adjuntos                = AdjuntoSerializer(many=True, read_only=True)
    seguimientos            = SeguimientoCorreoSerializer(many=True, read_only=True)
    unidad_destino_nombre   = serializers.CharField(source='unidad_destino.nombre',            read_only=True)
    unidad_destino_siglas   = serializers.CharField(source='unidad_destino.siglas',            read_only=True)
    usuario_asignado_nombre = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True)
    registrado_por_nombre   = serializers.CharField(source='registrado_por.nombre_completo',   read_only=True)
    vencido                 = serializers.BooleanField(read_only=True)
    dias_para_vencer        = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Correo
        fields = '__all__'


class CorreoCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Correo
        fields = [
            'tipo', 'asunto', 'cuerpo',
            'remitente_email', 'remitente_nombre', 'remitente_entidad',
            'unidad_destino', 'prioridad', 'fecha_limite_resp', 'etiquetas',
        ]