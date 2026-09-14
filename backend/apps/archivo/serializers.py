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
    agregado_por_nombre = serializers.CharField(source='agregado_por.nombre_completo', read_only=True)

    class Meta:
        model  = ExpedienteDocumento
        fields = '__all__'

    def to_representation(self, instance):
        """
        Política de acceso del nodo del expediente (F3-A + microcierre F3-A.1).

        Solo se aplica cuando el contexto trae `documentos_visibles_ids`
        (conjunto de ids de Documento que el usuario puede consultar según la
        ACL central F2-E, `documentos_visibles_para`) — es decir, en el
        detalle de un Expediente. Fuera de ese contexto (p. ej. la respuesta
        de `agregar_documento`, donde el usuario acaba de vincular su propio
        documento) la representación es completa.

        Un nodo se ENMASCARA a `{id, acceso_restringido: true}` — **sin ningún
        otro metadato** (ni del documento, ni del trámite, ni de quién lo
        agregó, ni timestamps) — cuando:
          · apunta a un `Documento` fuera de la ACL de lectura del usuario, o
          · apunta a un `Tramite`. **No existe una ACL central de lectura de
            Tramite** (RF-TRAM-011 no implementado); F3-A.1 no la crea, así que
            el trámite se trata FAIL-CLOSED. Se resolverá en F3-B con la
            condición de acceso de Serie/Expediente.

        La pertenencia al expediente NUNCA concede acceso al Documento ni al
        Tramite. La estructura del expediente se conserva (el nodo sigue
        presente) pero no filtra información.
        """
        visibles = self.context.get('documentos_visibles_ids')
        if visibles is None:
            return super().to_representation(instance)

        doc_restringido = (instance.documento_id is not None
                           and instance.documento_id not in visibles)
        tramite_sin_acl = instance.tramite_id is not None  # sin ACL central: fail-closed

        if doc_restringido or tramite_sin_acl:
            return {'id': instance.id, 'acceso_restringido': True}

        data = super().to_representation(instance)
        data['acceso_restringido'] = False
        return data


class ExpedienteActualizarSerializer(serializers.ModelSerializer):
    """
    Update genérico (PUT/PATCH) del Expediente — F3-A.

    Solo expone campos ORDINARIOS editables por el usuario. Los campos de
    TRANSICIÓN de negocio (`estado`, `fecha_cierre`, `expurgado`,
    `fecha_expurgo`, `foliado`, `fecha_foliacion`, `categoria_actual`,
    `num_fojas`, `codigo_expediente`, `serie`, `unidad`) NO son modificables
    por esta vía: cambian únicamente a través de sus acciones dedicadas
    (`cerrar` / `expurgar` / `foliar` / `transferir`) o del alta.
    """
    class Meta:
        model  = Expediente
        fields = ['titulo', 'descripcion', 'fecha_inicio',
                  'soporte', 'ubicacion_fisica', 'numero_caja', 'numero_parte']


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
            'id', 'codigo_expediente', 'serie', 'unidad', 'titulo', 'descripcion',
            'fecha_inicio', 'soporte', 'ubicacion_fisica',
        ]
        # F3-A — la respuesta del alta debe traer `id` (y el código generado)
        # para que `VincularExpedienteModal` pueda encadenar la vinculación.
        read_only_fields = ['id', 'codigo_expediente']

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
            'conservacion_permanente', 'anos_gestion', 'anos_central', 'base_legal',
            'disposicion_final', 'tecnica_seleccion',
            'activo', 'creado_en',
            'total_expedientes', 'total_subseries', 'anos_total_acumulado',
        ]

    def get_total_expedientes(self, obj):
        return obj.expedientes.count()

    def get_total_subseries(self, obj):
        return obj.subseries.count()

    def get_anos_total_acumulado(self, obj):
        if obj.anos_gestion is None or obj.anos_central is None:
            return None
        return obj.anos_gestion + obj.anos_central

    def validate(self, data):
        def g(k, d=None):
            if k in data:
                return data[k]
            if self.instance is not None:
                return getattr(self.instance, k)
            return d

        permanente  = g('conservacion_permanente', False)
        disposicion = g('disposicion_final', 'conservacion')

        # El checkbox y la disposición "Conservación permanente" son equivalentes:
        # cualquiera de los dos activa el otro, para evitar estados contradictorios.
        if permanente or disposicion == 'conservacion':
            data['conservacion_permanente'] = True
            data['disposicion_final']       = 'conservacion'
            data['anos_gestion']            = None
            data['anos_central']            = None
        else:
            if g('anos_gestion') is None:
                raise serializers.ValidationError(
                    {'anos_gestion': 'Obligatorio cuando la serie no es de conservación permanente.'})
            if g('anos_central') is None:
                raise serializers.ValidationError(
                    {'anos_central': 'Obligatorio cuando la serie no es de conservación permanente.'})
        return data


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