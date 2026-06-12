from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .permisos import get_permisos_usuario
from .models import Rol, UsuarioRol
from rest_framework.decorators import api_view, permission_classes
from .serializers import (
    LoginSerializer, UsuarioResumenSerializer, UsuarioListSerializer,
    UsuarioDetalleSerializer, UsuarioCrearSerializer,
    CambiarPasswordSerializer, RolSerializer, AsignarRolSerializer,
)

Usuario = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class   = LoginSerializer
    permission_classes = [AllowAny]


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response({'detail': 'Sesión cerrada.'})
        except Exception:
            return Response({'detail': 'Token inválido.'}, status=status.HTTP_400_BAD_REQUEST)


class MiPerfilView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = UsuarioDetalleSerializer

    def get_object(self):
        return self.request.user

    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        serializer = CambiarPasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['password_nuevo'])
        request.user.save()
        return Response({'detail': 'Contraseña actualizada.'})


class UsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['tipo', 'activo', 'bloqueado', 'unidad']
    search_fields      = ['nombres', 'apellidos', 'email', 'cedula', 'cargo']
    ordering_fields    = ['apellidos', 'creado_en', 'ultimo_acceso']
    ordering           = ['apellidos']

    def get_queryset(self):
        return Usuario.objects.select_related('unidad').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCrearSerializer
        if self.action in ['retrieve', 'update', 'partial_update']:
            return UsuarioDetalleSerializer
        return UsuarioListSerializer

    @action(detail=True, methods=['post'])
    def bloquear(self, request, pk=None):
        u = self.get_object()
        u.bloqueado      = True
        u.motivo_bloqueo = request.data.get('motivo', 'Bloqueado por administrador')
        u.save(update_fields=['bloqueado', 'motivo_bloqueo'])
        return Response({'detail': f'{u.email} bloqueado.'})

    @action(detail=True, methods=['post'])
    def desbloquear(self, request, pk=None):
        u = self.get_object()
        u.bloqueado        = False
        u.motivo_bloqueo   = ''
        u.intentos_fallidos = 0
        u.save(update_fields=['bloqueado', 'motivo_bloqueo', 'intentos_fallidos'])
        return Response({'detail': f'{u.email} desbloqueado.'})

    @action(detail=True, methods=['post'])
    def asignar_rol(self, request, pk=None):
        serializer = AsignarRolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UsuarioRol.objects.update_or_create(
            usuario=self.get_object(),
            rol=serializer.validated_data['rol'],
            unidad=serializer.validated_data.get('unidad'),
            defaults={
                'activo':       True,
                'asignado_por': request.user,
                'hasta':        serializer.validated_data.get('hasta'),
            }
        )
        return Response({'detail': 'Rol asignado.'})

    @action(detail=True, methods=['post'])
    def revocar_rol(self, request, pk=None):
        UsuarioRol.objects.filter(
            usuario=self.get_object(),
            rol_id=request.data.get('rol_id')
        ).update(activo=False)
        return Response({'detail': 'Rol revocado.'})


class RolViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset           = Rol.objects.filter(activo=True).order_by('nivel')
    serializer_class   = RolSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_permisos(request):
    permisos = get_permisos_usuario(request.user)
    roles    = list(request.user.roles.filter(activo=True).values_list('rol__codigo', flat=True))
    return Response({
        'usuario_id': request.user.id,
        'es_admin':   request.user.is_superuser,
        'roles':      roles,
        'permisos':   permisos,
    })