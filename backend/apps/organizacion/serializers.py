from rest_framework import serializers
from .models import Nivel, Funcion, Unidad


class NivelSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Nivel
        fields = '__all__'


class FuncionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Funcion
        fields = '__all__'


class UnidadResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Unidad
        fields = ['id', 'codigo', 'nombre', 'nombre_corto', 'siglas', 'tipo', 'activo']


class UnidadListSerializer(serializers.ModelSerializer):
    nivel_nombre = serializers.CharField(source='nivel.nombre', read_only=True)
    padre_nombre = serializers.CharField(source='padre.nombre', read_only=True)
    padre_siglas = serializers.CharField(source='padre.siglas', read_only=True)
    num_hijos    = serializers.SerializerMethodField()

    class Meta:
        model  = Unidad
        fields = [
            'id', 'codigo', 'nombre', 'nombre_corto', 'siglas', 'tipo',
            'nivel_nombre', 'padre_nombre', 'padre_siglas',
            'email_oficial', 'telefono', 'activo', 'orden_display', 'num_hijos',
        ]

    def get_num_hijos(self, obj):
        return obj.hijos.filter(activo=True).count()


class UnidadArbolSerializer(serializers.ModelSerializer):
    hijos        = serializers.SerializerMethodField()
    nivel_nombre = serializers.CharField(source='nivel.nombre', read_only=True)

    class Meta:
        model  = Unidad
        fields = ['id', 'codigo', 'nombre', 'nombre_corto', 'siglas', 'tipo',
                  'nivel_nombre', 'email_oficial', 'activo', 'orden_display', 'hijos']

    def get_hijos(self, obj):
        return UnidadArbolSerializer(
            obj.hijos.filter(activo=True).order_by('orden_display'), many=True
        ).data


class UnidadDetalleSerializer(serializers.ModelSerializer):
    nivel_nombre   = serializers.CharField(source='nivel.nombre',   read_only=True)
    funcion_nombre = serializers.CharField(source='funcion.nombre', read_only=True)
    padre_detalle  = UnidadResumenSerializer(source='padre',         read_only=True)
    hijos          = serializers.SerializerMethodField()
    ruta           = serializers.SerializerMethodField()

    class Meta:
        model  = Unidad
        fields = '__all__'

    def get_hijos(self, obj):
        return UnidadResumenSerializer(
            obj.hijos.filter(activo=True).order_by('orden_display'), many=True
        ).data

    def get_ruta(self, obj):
        return obj.get_ruta()


class UnidadCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Unidad
        fields = [
            'padre', 'nivel', 'funcion', 'codigo', 'nombre', 'nombre_corto',
            'siglas', 'tipo', 'mision', 'email_oficial', 'telefono',
            'piso_ubicacion', 'activo', 'orden_display',
        ]

    def validate_codigo(self, value):
        qs = Unidad.objects.filter(codigo=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'Ya existe una unidad con el código "{value}".')
        return value.upper()