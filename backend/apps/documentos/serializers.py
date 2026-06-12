from rest_framework import serializers
from .models import TipoDocumento, Documento, Destinatario, FlujoAprobacion, VersionDocumento
from .models import BandejaDocumento, SeguimientoDocumento, Tarea, DestinatarioExterno

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


class SeguimientoDocumentoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    unidad_nombre  = serializers.CharField(source='unidad.nombre',           read_only=True)
    unidad_siglas  = serializers.CharField(source='unidad.siglas',           read_only=True)

    class Meta:
        model  = SeguimientoDocumento
        fields = '__all__'


class BandejaSerializer(serializers.ModelSerializer):
    numero_documento      = serializers.CharField(source='documento.numero_documento', read_only=True)
    asunto                = serializers.CharField(source='documento.asunto',           read_only=True)
    tipo_nombre           = serializers.CharField(source='documento.tipo_documento.nombre', read_only=True)
    tipo_codigo           = serializers.CharField(source='documento.tipo_documento.codigo', read_only=True)
    tipo_prefijo          = serializers.CharField(source='documento.tipo_documento.prefijo_numeracion', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='documento.unidad_origen.nombre', read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='documento.unidad_origen.siglas', read_only=True)
    creado_por_nombre     = serializers.CharField(source='documento.creado_por.nombre_completo', read_only=True)
    estado_documento      = serializers.CharField(source='documento.estado', read_only=True)
    fecha_documento       = serializers.DateTimeField(source='documento.creado_en', read_only=True)
    prioridad             = serializers.CharField(source='documento.prioridad', read_only=True)

    class Meta:
        model  = BandejaDocumento
        fields = [
            'id', 'bandeja', 'accion_tomada', 'leido', 'leido_en',
            'es_urgente', 'numero_referencia', 'instrucciones',
            'fecha_limite', 'creado_en',
            'numero_documento', 'asunto', 'tipo_nombre', 'tipo_codigo',
            'tipo_prefijo', 'unidad_origen_nombre', 'unidad_origen_siglas',
            'creado_por_nombre', 'estado_documento', 'fecha_documento', 'prioridad',
        ]


class TareaSerializer(serializers.ModelSerializer):
    asignada_por_nombre = serializers.CharField(source='asignada_por.nombre_completo', read_only=True)
    asignada_a_nombre   = serializers.CharField(source='asignada_a.nombre_completo',   read_only=True)

    class Meta:
        model  = Tarea
        fields = '__all__'