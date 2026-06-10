from rest_framework import serializers
from .models import Serie, Expediente, ExpedienteDocumento


class SerieSerializer(serializers.ModelSerializer):
    num_expedientes = serializers.SerializerMethodField()

    class Meta:
        model  = Serie
        fields = '__all__'

    def get_num_expedientes(self, obj):
        return obj.expedientes.count()


class ExpedienteDocumentoSerializer(serializers.ModelSerializer):
    documento_numero = serializers.CharField(source='documento.numero_documento', read_only=True)
    documento_asunto = serializers.CharField(source='documento.asunto',           read_only=True)
    tramite_numero   = serializers.CharField(source='tramite.numero_tramite',     read_only=True)
    correo_numero    = serializers.CharField(source='correo.numero_registro',     read_only=True)
    agregado_por_nombre = serializers.CharField(source='agregado_por.nombre_completo', read_only=True)

    class Meta:
        model  = ExpedienteDocumento
        fields = '__all__'


class ExpedienteListSerializer(serializers.ModelSerializer):
    serie_nombre    = serializers.CharField(source='serie.nombre',   read_only=True)
    serie_codigo    = serializers.CharField(source='serie.codigo',   read_only=True)
    unidad_nombre   = serializers.CharField(source='unidad.nombre',  read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas',  read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    num_documentos  = serializers.SerializerMethodField()
    dias_para_expurgo = serializers.SerializerMethodField()

    class Meta:
        model  = Expediente
        fields = [
            'id', 'codigo_expediente', 'titulo', 'descripcion',
            'fecha_inicio', 'fecha_cierre', 'num_fojas',
            'soporte', 'ubicacion_fisica', 'estado', 'fecha_expurgo',
            'serie_nombre', 'serie_codigo',
            'unidad_nombre', 'unidad_siglas',
            'creado_por_nombre', 'num_documentos',
            'dias_para_expurgo', 'creado_en',
        ]

    def get_num_documentos(self, obj):
        return obj.documentos.count()

    def get_dias_para_expurgo(self, obj):
        if not obj.fecha_expurgo:
            return None
        from django.utils import timezone
        return (obj.fecha_expurgo - timezone.now().date()).days


class ExpedienteDetalleSerializer(serializers.ModelSerializer):
    serie_nombre      = serializers.CharField(source='serie.nombre',  read_only=True)
    unidad_nombre     = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas     = serializers.CharField(source='unidad.siglas', read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    documentos        = ExpedienteDocumentoSerializer(many=True, read_only=True)

    class Meta:
        model  = Expediente
        fields = '__all__'


class ExpedienteCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Expediente
        fields = [
            'serie', 'unidad', 'titulo', 'descripcion',
            'fecha_inicio', 'soporte', 'ubicacion_fisica',
        ]

    def create(self, validated_data):
        exp = Expediente(**validated_data)
        exp.generar_codigo()
        exp.save()
        return exp