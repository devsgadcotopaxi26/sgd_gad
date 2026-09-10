from rest_framework import serializers
from .models import Categoria, TipoTramite, Requisito, Persona, Tramite, Seguimiento


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Categoria
        fields = '__all__'


class RequisitoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Requisito
        fields = '__all__'


class TipoTramiteListSerializer(serializers.ModelSerializer):
    categoria_nombre          = serializers.CharField(source='categoria.nombre',          read_only=True)
    unidad_responsable_nombre = serializers.CharField(source='unidad_responsable.nombre', read_only=True)
    unidad_responsable_siglas = serializers.CharField(source='unidad_responsable.siglas', read_only=True)
    num_requisitos            = serializers.SerializerMethodField()

    class Meta:
        model  = TipoTramite
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'dias_plazo', 'costo',
            'requiere_inspeccion', 'en_linea', 'activo', 'unidad_responsable',
            'categoria_nombre', 'unidad_responsable_nombre',
            'unidad_responsable_siglas', 'num_requisitos',
        ]

    def get_num_requisitos(self, obj):
        return obj.requisitos.count()


class TipoTramiteDetalleSerializer(serializers.ModelSerializer):
    requisitos     = RequisitoSerializer(many=True, read_only=True)
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)

    class Meta:
        model  = TipoTramite
        fields = '__all__'


class PersonaResumenSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()

    class Meta:
        model  = Persona
        fields = [
            'id', 'tipo_persona', 'tipo_identificacion',
            'numero_identificacion', 'nombres', 'apellidos',
            'nombre_completo', 'email', 'telefono_movil', 'activo',
        ]


class PersonaDetalleSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()

    class Meta:
        model  = Persona
        fields = '__all__'


class PersonaCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Persona
        fields = [
            'tipo_persona', 'tipo_identificacion', 'numero_identificacion',
            'nombres', 'apellidos', 'nombre_comercial', 'representante_legal',
            'email', 'telefono_movil', 'telefono_fijo',
            'provincia', 'canton', 'parroquia', 'direccion',
            'fecha_nacimiento', 'genero', 'notificacion_email',
        ]

    def validate_numero_identificacion(self, value):
        qs = Persona.objects.filter(numero_identificacion=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe una persona con esa identificación.')
        return value


class PersonaSnapshotInlineSerializer(serializers.Serializer):
    """Valida los datos mínimos para crear una Persona nueva en línea desde
    el registro de un trámite (gestión de firmante/contacto).

    A propósito NO reutiliza PersonaCrearSerializer: su validate_numero_
    identificacion() rechaza identificaciones ya existentes, pero aquí el
    caso de "ya existe" debe reutilizarse silenciosamente (get_or_create en
    TramiteViewSet.perform_create), no rechazarse.
    """
    numero_identificacion = serializers.CharField(max_length=20)
    nombres               = serializers.CharField(max_length=150)
    apellidos             = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    telefono_movil        = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    email                 = serializers.EmailField(max_length=200, required=False, allow_blank=True, default='')


class SeguimientoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    unidad_nombre  = serializers.CharField(source='unidad.nombre',           read_only=True)

    class Meta:
        model  = Seguimiento
        fields = '__all__'
        read_only_fields = ['creado_en']


class TramiteListSerializer(serializers.ModelSerializer):
    persona_nombre            = serializers.SerializerMethodField()
    persona_identificacion    = serializers.SerializerMethodField()
    tipo_tramite_nombre       = serializers.SerializerMethodField()
    categoria_nombre          = serializers.SerializerMethodField()
    unidad_responsable_nombre = serializers.SerializerMethodField()
    unidad_responsable_siglas = serializers.SerializerMethodField()
    analista_nombre           = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True)
    dias_restantes            = serializers.SerializerMethodField()

    class Meta:
        model  = Tramite
        fields = [
            'id', 'uuid', 'numero_tramite', 'asunto', 'estado', 'prioridad',
            'canal_ingreso', 'numero_oficio', 'fecha_documento', 'procedencia',
            'firmante_oficio', 'telefono_contacto', 'correo_contacto',
            'fecha_ingreso', 'fecha_limite', 'fecha_resolucion',
            'dentro_plazo', 'calificacion',
            'persona_nombre', 'persona_identificacion',
            'tipo_tramite_nombre', 'categoria_nombre',
            'unidad_responsable_nombre', 'unidad_responsable_siglas',
            'analista_nombre', 'dias_restantes',
        ]

    def get_persona_nombre(self, obj):
        # El snapshot histórico (firmante_oficio) siempre tiene prioridad sobre
        # el dato actual de Persona — Persona puede cambiar de nombre/datos
        # con el tiempo y eso no debe alterar cómo se ve un trámite pasado.
        # Solo se recurre a Persona para trámites antiguos, previos a que
        # firmante_oficio fuera un campo obligatorio.
        return obj.firmante_oficio or (obj.persona.nombre_completo if obj.persona_id else None)

    def get_persona_identificacion(self, obj):
        return obj.cedula_firmante or (obj.persona.numero_identificacion if obj.persona_id else None)

    def get_tipo_tramite_nombre(self, obj):
        return obj.tipo_tramite.nombre if obj.tipo_tramite_id else None

    def get_categoria_nombre(self, obj):
        return obj.tipo_tramite.categoria.nombre if obj.tipo_tramite_id else None

    def get_unidad_responsable_nombre(self, obj):
        return obj.unidad_responsable.nombre if obj.unidad_responsable_id else None

    def get_unidad_responsable_siglas(self, obj):
        return obj.unidad_responsable.siglas if obj.unidad_responsable_id else None

    def get_dias_restantes(self, obj):
        if obj.estado in ('resuelto', 'archivado', 'rechazado', 'desistido'):
            return None
        from django.utils import timezone
        delta = obj.fecha_limite - timezone.now().date()
        return delta.days


class TramiteDetalleSerializer(serializers.ModelSerializer):
    persona            = PersonaResumenSerializer(read_only=True)
    seguimientos       = SeguimientoSerializer(many=True, read_only=True)
    tipo_tramite_nombre       = serializers.SerializerMethodField()
    unidad_responsable_nombre = serializers.SerializerMethodField()
    # Sección "Gestión" del panel de detalle (frontend) — nombres legibles de
    # unidad_receptora/usuario_receptor, que el modelo solo trae como FK/id.
    unidad_receptora_nombre   = serializers.SerializerMethodField()
    receptor_nombre           = serializers.CharField(source='usuario_receptor.nombre_completo', read_only=True, default=None)
    analista_nombre           = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True, default=None)
    # Sección "Gestión" del panel de detalle también necesita días restantes
    # (antes solo la traía el listado) — misma lógica que TramiteListSerializer.
    dias_restantes            = serializers.SerializerMethodField()

    class Meta:
        model  = Tramite
        fields = '__all__'

    def get_tipo_tramite_nombre(self, obj):
        return obj.tipo_tramite.nombre if obj.tipo_tramite_id else None

    def get_unidad_responsable_nombre(self, obj):
        return obj.unidad_responsable.nombre if obj.unidad_responsable_id else None

    def get_unidad_receptora_nombre(self, obj):
        return obj.unidad_receptora.nombre if obj.unidad_receptora_id else None

    def get_dias_restantes(self, obj):
        if obj.estado in ('resuelto', 'archivado', 'rechazado', 'desistido'):
            return None
        from django.utils import timezone
        delta = obj.fecha_limite - timezone.now().date()
        return delta.days


class TramiteCrearSerializer(serializers.ModelSerializer):
    """Registro inicial de un trámite en una sola pantalla (p. ej. Ventanilla).

    tipo_tramite y persona son opcionales — se clasifican/relacionan después.
    unidad_receptora, unidad_responsable, usuario_receptor, numero_tramite,
    fecha_limite y uuid los asigna perform_create(), no llegan del cliente.
    id y numero_tramite se exponen de solo lectura: el frontend los necesita
    en la respuesta para mostrar el número asignado y adjuntar archivos al
    trámite recién creado, todo dentro de la misma pantalla.

    fecha_documento y firmante_oficio son obligatorias (RN-TRAM-003 y
    RN-TRAM-006) — se declaran explícitas aquí porque el modelo las mantiene
    null=True/blank=True (o solo blank=True) para no invalidar trámites
    históricos que se registraron antes de que estos campos existieran.
    firmante_oficio aplica igual sin importar el canal (ventanilla/email/web),
    porque los tres comparten este mismo serializer de creación.
    """
    fecha_documento = serializers.DateField(
        required=True, allow_null=False,
        error_messages={
            'required': 'La fecha del documento es obligatoria.',
            'null':     'La fecha del documento es obligatoria.',
            'invalid':  'La fecha del documento no es válida.',
        },
    )
    firmante_oficio = serializers.CharField(
        required=True, allow_blank=False, allow_null=False, trim_whitespace=True,
        error_messages={
            'required': 'El firmante del oficio es obligatorio.',
            'blank':    'El firmante del oficio es obligatorio.',
            'null':     'El firmante del oficio es obligatorio.',
        },
    )

    # Gestión de firmante/contacto (opcional, no bloquea el registro):
    # - persona: ya viene del ModelSerializer (FK opcional a una Persona ya
    #   encontrada por el frontend).
    # - persona_datos: datos para crear/reutilizar una Persona nueva cuando
    #   se dio una identificación que no existía todavía. Solo se usa si
    #   `persona` no llegó ya resuelto.
    # - actualizar_persona: opt-in explícito para volcar telefono_contacto/
    #   correo_contacto a los datos maestros de la Persona vinculada. Nunca
    #   ocurre por defecto — ver perform_create().
    persona_datos = serializers.DictField(required=False, write_only=True, allow_null=True)
    actualizar_persona = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model  = Tramite
        fields = [
            'id', 'numero_tramite',
            'tipo_tramite', 'persona', 'persona_datos', 'actualizar_persona', 'canal_ingreso',
            'numero_oficio', 'fecha_documento', 'procedencia', 'firmante_oficio', 'cedula_firmante', 'cargo_firmante',
            'telefono_contacto', 'correo_contacto',
            'asunto', 'detalle', 'prioridad',
        ]
        read_only_fields = ['id', 'numero_tramite']


class TramiteEditarSerializer(TramiteCrearSerializer):
    """Edición (RF-TRAM-009) de un trámite ya registrado.

    Hereda de TramiteCrearSerializer para reutilizar la misma obligatoriedad
    de fecha_documento/firmante_oficio y el mismo mecanismo de resolución de
    Persona (persona/persona_datos/actualizar_persona) — ver perform_update()
    en TramiteViewSet, que aplica además la regla de consistencia cédula↔
    persona (RF-TRAM-009 sección 10).

    Deliberadamente NO incluye 'canal_ingreso' ni 'tipo_tramite': el canal es
    inmutable durante edición (define de qué permiso depende poder editar) y
    tipo_tramite queda fuera del alcance de esta tarea. numero_tramite,
    fecha_ingreso, uuid, usuario_receptor/asignado y toda la trazabilidad
    existente tampoco se exponen aquí — no forman parte de los campos
    editables definidos.
    """
    class Meta(TramiteCrearSerializer.Meta):
        fields = [
            'id', 'numero_tramite',
            'persona', 'persona_datos', 'actualizar_persona',
            'numero_oficio', 'fecha_documento', 'procedencia', 'firmante_oficio', 'cedula_firmante', 'cargo_firmante',
            'telefono_contacto', 'correo_contacto',
            'asunto', 'detalle',
        ]
        read_only_fields = ['id', 'numero_tramite']