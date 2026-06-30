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


class SeguimientoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    unidad_nombre  = serializers.CharField(source='unidad.nombre',           read_only=True)

    class Meta:
        model  = Seguimiento
        fields = '__all__'
        read_only_fields = ['creado_en']


class TramiteListSerializer(serializers.ModelSerializer):
    persona_nombre            = serializers.CharField(source='persona.nombre_completo',       read_only=True)
    persona_identificacion    = serializers.CharField(source='persona.numero_identificacion',  read_only=True)
    tipo_tramite_nombre       = serializers.CharField(source='tipo_tramite.nombre',            read_only=True)
    categoria_nombre          = serializers.CharField(source='tipo_tramite.categoria.nombre',  read_only=True)
    unidad_responsable_nombre = serializers.CharField(source='unidad_responsable.nombre',      read_only=True)
    unidad_responsable_siglas = serializers.CharField(source='unidad_responsable.siglas',      read_only=True)
    analista_nombre           = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True)
    dias_restantes            = serializers.SerializerMethodField()

    class Meta:
        model  = Tramite
        fields = [
            'id', 'uuid', 'numero_tramite', 'asunto', 'estado', 'prioridad',
            'canal_ingreso', 'fecha_ingreso', 'fecha_limite', 'fecha_resolucion',
            'dentro_plazo', 'calificacion',
            'persona_nombre', 'persona_identificacion',
            'tipo_tramite_nombre', 'categoria_nombre',
            'unidad_responsable_nombre', 'unidad_responsable_siglas',
            'analista_nombre', 'dias_restantes',
        ]

    def get_dias_restantes(self, obj):
        if obj.estado in ('resuelto', 'archivado', 'rechazado', 'desistido'):
            return None
        from django.utils import timezone
        delta = obj.fecha_limite - timezone.now().date()
        return delta.days


class TramiteDetalleSerializer(serializers.ModelSerializer):
    persona            = PersonaResumenSerializer(read_only=True)
    seguimientos       = SeguimientoSerializer(many=True, read_only=True)
    tipo_tramite_nombre       = serializers.CharField(source='tipo_tramite.nombre',   read_only=True)
    unidad_responsable_nombre = serializers.CharField(source='unidad_responsable.nombre', read_only=True)
    analista_nombre           = serializers.CharField(source='usuario_asignado.nombre_completo', read_only=True)

    class Meta:
        model  = Tramite
        fields = '__all__'


class TramiteCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tramite
        fields = [
            'tipo_tramite', 'persona', 'canal_ingreso',
            'unidad_receptora', 'unidad_responsable',
            'usuario_receptor', 'asunto', 'detalle', 'prioridad',
        ]