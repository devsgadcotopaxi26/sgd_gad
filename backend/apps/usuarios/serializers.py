from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Rol, UsuarioRol

Usuario = get_user_model()


class LoginSerializer(TokenObtainPairSerializer):
    # Aceptar campo genérico 'username' (puede ser cédula o email)
    username_field = 'username'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Quitar el campo 'email' que SimpleJWT agrega por USERNAME_FIELD
        self.fields.pop('email', None)
        # Agregar campo 'username' para aceptar cédula o correo
        if 'username' not in self.fields:
            self.fields['username'] = serializers.CharField(
                label='Cédula o correo electrónico',
            )

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
        # SimpleJWT espera el campo del USERNAME_FIELD del modelo (email).
        # Mapeamos 'username' al flujo de autenticación via el backend personalizado.
        username = attrs.get('username', '')
        password = attrs.get('password', '')

        from django.contrib.auth import authenticate
        self.user = authenticate(
            request=self.context.get('request'),
            username=username,
            password=password,
        )

        if self.user is None or not self.user.is_active:
            raise serializers.ValidationError(
                'Credenciales inválidas. Verifica tu cédula/correo y contraseña.'
            )

        if self.user.bloqueado:
            raise serializers.ValidationError('Cuenta bloqueada. Contacte al administrador.')
        if not self.user.activo:
            raise serializers.ValidationError('Cuenta inactiva.')

        # Generar tokens JWT
        refresh = self.get_token(self.user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

        self.user.registrar_acceso()
        data['usuario'] = UsuarioResumenSerializer(self.user).data
        return data


class UsuarioResumenSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    unidad_nombre   = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas', read_only=True)
    is_admin        = serializers.SerializerMethodField()

    class Meta:
        model  = Usuario
        fields = [
            'id', 'uuid', 'tipo', 'cedula', 'nombres', 'apellidos',
            'nombre_completo', 'email', 'email_institucional',
            'unidad_id', 'unidad_nombre', 'unidad_siglas',
            'cargo', 'titulo', 'cargo_tipo',
            'firma_electronica', 'activo', 'ultimo_acceso', 'is_admin',
        ]

    def get_is_admin(self, obj):
        return obj.is_superuser or obj.roles.filter(rol__codigo__in=['ADMIN', 'ARCHIVO'], activo=True).exists()


class UsuarioListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    unidad_nombre   = serializers.CharField(source='unidad.nombre', read_only=True)
    unidad_siglas   = serializers.CharField(source='unidad.siglas', read_only=True)
    roles           = serializers.SerializerMethodField()

    class Meta:
        model  = Usuario
        fields = [
            'id', 'uuid', 'tipo', 'cedula', 'nombre_completo',
            'email', 'email_institucional', 'unidad_id',
            'unidad_nombre', 'unidad_siglas', 'cargo', 'titulo', 'cargo_tipo',
            'firma_electronica', 'activo', 'bloqueado', 'creado_en', 'roles',
        ]

    def get_roles(self, obj):
        return [
            {'id': ur.id, 'rol': ur.rol_id, 'rol_codigo': ur.rol.codigo,
             'rol_nombre': ur.rol.nombre, 'activo': ur.activo}
            for ur in obj.roles.filter(activo=True).select_related('rol')
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
            'cargo', 'titulo', 'cargo_tipo', 'fecha_ingreso', 'firma_electronica',
            'cert_bce_serial', 'cert_bce_expira',
            'activo', 'bloqueado', 'motivo_bloqueo',
            'ultimo_acceso', 'creado_en', 'is_superuser', 'roles',
        ]
        read_only_fields = ['uuid', 'ultimo_acceso', 'creado_en', 'is_superuser']

    def get_roles(self, obj):
        return [
            {'id': ur.id, 'rol': ur.rol_id, 'rol_codigo': ur.rol.codigo,
             'rol_nombre': ur.rol.nombre, 'activo': ur.activo}
            for ur in obj.roles.select_related('rol')
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


class PerfilUpdateSerializer(serializers.ModelSerializer):
    """Solo los campos que el propio usuario puede actualizar en su perfil."""
    class Meta:
        model  = Usuario
        fields = ['email', 'email_institucional', 'telefono_movil', 'telefono_fijo']


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