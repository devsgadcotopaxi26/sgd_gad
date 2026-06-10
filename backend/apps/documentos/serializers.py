from rest_framework import serializers
from .models import TipoDocumento, Documento, Destinatario, FlujoAprobacion, VersionDocumento


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TipoDocumento
        fields = '__all__'


class DestinatarioSerializer(serializers.ModelSerializer):
    unidad_nombre  = serializers.CharField(source='unidad.nombre',          read_only=True)
    unidad_siglas  = serializers.CharField(source='unidad.siglas',          read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)

    class Meta:
        model  = Destinatario
        fields = '__all__'


class FlujoSerializer(serializers.ModelSerializer):
    asignado_nombre = serializers.CharField(source='asignado_a.nombre_completo', read_only=True)

    class Meta:
        model  = FlujoAprobacion
        fields = '__all__'


class VersionSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model  = VersionDocumento
        fields = '__all__'


class DocumentoListSerializer(serializers.ModelSerializer):
    tipo_nombre      = serializers.CharField(source='tipo_documento.nombre',  read_only=True)
    tipo_prefijo     = serializers.CharField(source='tipo_documento.prefijo_numeracion', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='unidad_origen.nombre',  read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='unidad_origen.siglas',  read_only=True)
    unidad_destino_nombre = serializers.CharField(source='unidad_destino.nombre', read_only=True)
    unidad_destino_siglas = serializers.CharField(source='unidad_destino.siglas', read_only=True)
    creado_por_nombre     = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    firmado_por_nombre    = serializers.CharField(source='firmado_por.nombre_completo', read_only=True)

    class Meta:
        model  = Documento
        fields = [
            'id', 'uuid', 'numero_documento', 'anio', 'asunto', 'estado',
            'prioridad', 'confidencial', 'requiere_respuesta', 'fecha_limite_resp',
            'fecha_elaboracion', 'fecha_firma', 'fecha_envio',
            'tipo_nombre', 'tipo_prefijo',
            'unidad_origen_nombre', 'unidad_origen_siglas',
            'unidad_destino_nombre', 'unidad_destino_siglas',
            'creado_por_nombre', 'firmado_por_nombre',
            'vistas', 'creado_en',
        ]


class DocumentoDetalleSerializer(serializers.ModelSerializer):
    tipo_nombre           = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='unidad_origen.nombre',  read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='unidad_origen.siglas',  read_only=True)
    unidad_destino_nombre = serializers.CharField(source='unidad_destino.nombre', read_only=True)
    creado_por_nombre     = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    firmado_por_nombre    = serializers.CharField(source='firmado_por.nombre_completo', read_only=True)
    destinatarios         = DestinatarioSerializer(many=True, read_only=True)
    flujo                 = FlujoSerializer(many=True, read_only=True)
    versiones             = VersionSerializer(many=True, read_only=True)

    class Meta:
        model  = Documento
        fields = '__all__'


class DocumentoCrearSerializer(serializers.ModelSerializer):
    destinatarios_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model  = Documento
        fields = [
            'tipo_documento', 'asunto', 'cuerpo', 'resumen',
            'palabras_clave', 'unidad_origen', 'unidad_destino',
            'prioridad', 'confidencial', 'requiere_respuesta',
            'fecha_limite_resp', 'responde_a', 'relacionado_con',
            'destinatarios_ids',
        ]

    def create(self, validated_data):
        from django.utils import timezone
        destinatarios_ids = validated_data.pop('destinatarios_ids', [])
        doc = Documento(**validated_data)
        doc.anio = timezone.now().year
        doc.generar_numero()
        doc.save()
        for uid in destinatarios_ids:
            Destinatario.objects.create(documento=doc, unidad_id=uid)
        return doc