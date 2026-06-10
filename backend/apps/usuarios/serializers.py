from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Rol, UsuarioRol

Usuario = get_user_model()


class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']     = user.email
        token['nombres']   = user.nombres
        token['apellidos'] = user.apellidos
        token['tipo']      = user.tipo
        token['unidad_id'] = user.unidad_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.bloqueado:
            raise serializers.ValidationError('Cuenta bloqueada. Contacte al administrador.')
        if not user.activo:
            raise serializers.ValidationError('Cuenta inactiva.')
        user.registrar_acceso()
        data['usuario'] = UsuarioResumenSerializer(user).data
        return data


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    unidad_nombre   = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas', read_only=True)

    class Meta:
        model  = Usuario
        fields = [
            'id', 'uuid', 'tipo', 'cedula', 'nombres', 'apellidos',
            'nombre_completo', 'email', 'email_institucional',
            'unidad_id', 'unidad_nombre', 'unidad_siglas',
            'cargo', 'firma_electronica', 'activo', 'ultimo_acceso',
        ]


class UsuarioListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    unidad_nombre   = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas', read_only=True)

    class Meta:
        model  = Usuario
        fields = [
            'id', 'uuid', 'tipo', 'cedula', 'nombre_completo',
            'email', 'email_institucional', 'unidad_id',
            'unidad_nombre', 'unidad_siglas', 'cargo',
            'firma_electronica', 'activo', 'bloqueado', 'creado_en',
        ]


class UsuarioDetalleSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    unidad_nombre   = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas', read_only=True)
    roles           = serializers.SerializerMethodField()

    class Meta:
        model  = Usuario
        fields = [
            'id', 'uuid', 'tipo', 'cedula', 'nombres', 'apellidos',
            'nombre_completo', 'email', 'email_institucional',
            'telefono_movil', 'telefono_fijo',
            'unidad_id', 'unidad_nombre', 'unidad_siglas',
            'cargo', 'fecha_ingreso', 'firma_electronica',
            'cert_bce_serial', 'cert_bce_expira',
            'activo', 'bloqueado', 'motivo_bloqueo',
            'ultimo_acceso', 'creado_en', 'roles',
        ]
        read_only_fields = ['uuid', 'ultimo_acceso', 'creado_en']

    def get_roles(self, obj):
        return [
            {
                'rol_id':   ur.rol.id,
                'codigo':   ur.rol.codigo,
                'nombre':   ur.rol.nombre,
                'unidad_id': ur.unidad_id,
            }
            for ur in obj.roles.filter(activo=True).select_related('rol')
        ]


class UsuarioCrearSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = Usuario
        fields = [
            'cedula', 'nombres', 'apellidos', 'email',
            'email_institucional', 'telefono_movil', 'telefono_fijo',
            'unidad', 'cargo', 'fecha_ingreso', 'tipo', 'password',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user     = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nuevo  = serializers.CharField(write_only=True, min_length=8)

    def validate_password_actual(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Contraseña actual incorrecta.')
        return value


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Rol
        fields = '__all__'


class AsignarRolSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UsuarioRol
        fields = ['rol', 'unidad', 'desde', 'hasta']