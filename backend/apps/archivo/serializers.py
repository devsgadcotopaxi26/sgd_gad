from rest_framework import serializers
from .models import (
    Fondo, Seccion, Serie, Expediente, ExpedienteDocumento,
    Transferencia, TransferenciaExpediente,
    BajaDocumental, BajaExpediente,
    PrestamoDocumental, CopiaCertificada,
)


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


class FondoSerializer(serializers.ModelSerializer):
    total_secciones = serializers.SerializerMethodField()

    class Meta:
        model  = Fondo
        fields = ['id', 'nombre', 'descripcion', 'activo', 'creado_en', 'total_secciones']

    def get_total_secciones(self, obj):
        return obj.secciones.count()


class SeccionSerializer(serializers.ModelSerializer):
    unidad_nombre       = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas       = serializers.CharField(source='unidad.siglas', read_only=True)
    fondo_nombre        = serializers.CharField(source='fondo.nombre', read_only=True)
    seccion_padre_nombre = serializers.CharField(source='seccion_padre.nombre', read_only=True)
    total_series        = serializers.SerializerMethodField()
    total_subsecciones  = serializers.SerializerMethodField()

    class Meta:
        model  = Seccion
        fields = [
            'id', 'fondo', 'fondo_nombre', 'unidad', 'unidad_nombre', 'unidad_siglas',
            'codigo', 'nombre', 'seccion_padre', 'seccion_padre_nombre',
            'activo', 'total_series', 'total_subsecciones',
        ]

    def get_total_series(self, obj):
        return obj.series.count()

    def get_total_subsecciones(self, obj):
        return obj.subsecciones.count()


class SerieSerializer(serializers.ModelSerializer):
    seccion_nombre       = serializers.CharField(source='seccion.nombre', read_only=True)
    seccion_codigo       = serializers.CharField(source='seccion.codigo', read_only=True)
    serie_padre_nombre   = serializers.CharField(source='serie_padre.nombre', read_only=True)
    total_expedientes    = serializers.SerializerMethodField()
    total_subseries      = serializers.SerializerMethodField()
    anos_total_acumulado = serializers.SerializerMethodField()

    class Meta:
        model  = Serie
        fields = [
            'id', 'seccion', 'seccion_nombre', 'seccion_codigo',
            'serie_padre', 'serie_padre_nombre',
            'codigo', 'nombre', 'descripcion',
            'origen_documentacion', 'condicion_acceso',
            'anos_gestion', 'anos_central', 'base_legal',
            'disposicion_final', 'tecnica_seleccion',
            'activo', 'creado_en',
            'total_expedientes', 'total_subseries', 'anos_total_acumulado',
        ]

    def get_total_expedientes(self, obj):
        return obj.expedientes.count()

    def get_total_subseries(self, obj):
        return obj.subseries.count()

    def get_anos_total_acumulado(self, obj):
        return obj.anos_gestion + obj.anos_central


class ExpedienteSerializer(serializers.ModelSerializer):
    serie_nombre   = serializers.CharField(source='serie.nombre', read_only=True)
    serie_codigo   = serializers.CharField(source='serie.codigo', read_only=True)
    unidad_nombre  = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas  = serializers.CharField(source='unidad.siglas', read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    fecha_limite_categoria = serializers.ReadOnlyField()
    total_documentos = serializers.SerializerMethodField()

    class Meta:
        model  = Expediente
        fields = [
            'id', 'serie', 'serie_nombre', 'serie_codigo',
            'unidad', 'unidad_nombre', 'unidad_siglas',
            'codigo_expediente', 'titulo', 'descripcion',
            'fecha_inicio', 'fecha_cierre', 'num_fojas', 'soporte',
            'ubicacion_fisica', 'numero_caja', 'numero_parte',
            'estado', 'categoria_actual',
            'expurgado', 'fecha_expurgo', 'foliado', 'fecha_foliacion',
            'creado_por', 'creado_por_nombre', 'creado_en', 'modificado_en',
            'fecha_limite_categoria', 'total_documentos',
        ]
        read_only_fields = ['codigo_expediente', 'creado_por']

    def get_total_documentos(self, obj):
        return obj.documentos.count()


class TransferenciaSerializer(serializers.ModelSerializer):
    unidad_nombre        = serializers.CharField(source='unidad.nombre', read_only=True)
    solicitado_por_nombre = serializers.CharField(source='solicitado_por.nombre_completo', read_only=True)
    revisado_por_nombre   = serializers.CharField(source='revisado_por.nombre_completo', read_only=True)
    total_expedientes    = serializers.SerializerMethodField()

    class Meta:
        model  = Transferencia
        fields = [
            'id', 'tipo', 'unidad', 'unidad_nombre', 'estado',
            'numero_memorando', 'fecha_solicitud', 'fecha_revision', 'fecha_aceptacion',
            'solicitado_por', 'solicitado_por_nombre', 'revisado_por', 'revisado_por_nombre',
            'observaciones', 'creado_en', 'total_expedientes',
        ]

    def get_total_expedientes(self, obj):
        return obj.expedientes.count()


class BajaDocumentalSerializer(serializers.ModelSerializer):
    unidad_nombre        = serializers.CharField(source='unidad.nombre', read_only=True)
    solicitado_por_nombre = serializers.CharField(source='solicitado_por.nombre_completo', read_only=True)
    aprobado_por_nombre   = serializers.CharField(source='aprobado_por.nombre_completo', read_only=True)

    class Meta:
        model  = BajaDocumental
        fields = [
            'id', 'estado', 'unidad', 'unidad_nombre',
            'caracter_proceso', 'justificacion', 'normativa_legal',
            'numero_expedientes', 'numero_cajas', 'metros_lineales',
            'fecha_dictamen', 'fecha_ejecucion',
            'solicitado_por', 'solicitado_por_nombre',
            'aprobado_por', 'aprobado_por_nombre', 'creado_en',
        ]


class PrestamoDocumentalSerializer(serializers.ModelSerializer):
    expediente_codigo  = serializers.CharField(source='expediente.codigo_expediente', read_only=True)
    expediente_titulo  = serializers.CharField(source='expediente.titulo', read_only=True)
    solicitante_nombre = serializers.CharField(source='solicitante.nombre_completo', read_only=True)

    class Meta:
        model  = PrestamoDocumental
        fields = [
            'id', 'expediente', 'expediente_codigo', 'expediente_titulo',
            'solicitante', 'solicitante_nombre', 'autorizado_por',
            'fecha_prestamo', 'fecha_devolucion_esperada', 'fecha_devolucion_real',
            'estado', 'observaciones',
        ]


class CopiaCertificadaSerializer(serializers.ModelSerializer):
    expediente_codigo  = serializers.CharField(source='expediente.codigo_expediente', read_only=True)
    certificado_por_nombre = serializers.CharField(source='certificado_por.nombre_completo', read_only=True)

    class Meta:
        model  = CopiaCertificada
        fields = [
            'id', 'expediente', 'expediente_codigo',
            'solicitante_nombre', 'solicitante_cedula', 'motivo', 'numero_fojas',
            'certificado_por', 'certificado_por_nombre', 'fecha_emision',
        ]