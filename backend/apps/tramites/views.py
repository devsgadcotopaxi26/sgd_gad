import uuid
from datetime import date, timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Categoria, TipoTramite, Persona, Tramite, Seguimiento
from .serializers import (
    CategoriaSerializer, TipoTramiteListSerializer, TipoTramiteDetalleSerializer,
    PersonaResumenSerializer, PersonaDetalleSerializer, PersonaCrearSerializer,
    TramiteListSerializer, TramiteDetalleSerializer, TramiteCrearSerializer,
    SeguimientoSerializer,
)


def generar_numero_tramite():
    anio = timezone.now().year
    ultimo = Tramite.objects.filter(
        numero_tramite__startswith=f'T-{anio}-'
    ).count()
    return f'T-{anio}-{str(ultimo + 1).zfill(6)}'


def calcular_fecha_limite(dias_plazo: int) -> date:
    fecha = timezone.now().date()
    dias  = 0
    while dias < dias_plazo:
        fecha += timedelta(days=1)
        if fecha.weekday() < 5:
            dias += 1
    return fecha


class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Categoria.objects.filter(activo=True)
    serializer_class   = CategoriaSerializer
    permission_classes = [IsAuthenticated]


class TipoTramiteViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter]
    filterset_fields   = ['categoria', 'activo', 'en_linea']
    search_fields      = ['nombre', 'codigo', 'descripcion']

    def get_queryset(self):
        return TipoTramite.objects.select_related(
            'categoria', 'unidad_responsable'
        ).filter(activo=True)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TipoTramiteDetalleSerializer
        return TipoTramiteListSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['tipo_persona', 'tipo_identificacion', 'activo']
    search_fields      = ['nombres', 'apellidos', 'numero_identificacion', 'email']
    ordering           = ['apellidos', 'nombres']

    def get_queryset(self):
        return Persona.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return PersonaCrearSerializer
        if self.action in ['update', 'partial_update']:
            return PersonaCrearSerializer
        if self.action == 'retrieve':
            return PersonaDetalleSerializer
        return PersonaResumenSerializer

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        identificacion = request.query_params.get('identificacion', '').strip()
        if not identificacion:
            return Response({'detail': 'Parámetro identificacion requerido.'}, status=400)
        try:
            persona = Persona.objects.get(numero_identificacion=identificacion)
            return Response(PersonaResumenSerializer(persona).data)
        except Persona.DoesNotExist:
            return Response({'detail': 'Persona no encontrada.'}, status=404)


class TramiteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['estado', 'prioridad', 'canal_ingreso',
                          'unidad_responsable', 'usuario_asignado']
    search_fields      = ['numero_tramite', 'asunto', 'persona__nombres',
                          'persona__apellidos', 'persona__numero_identificacion']
    ordering_fields    = ['fecha_ingreso', 'fecha_limite', 'estado']
    ordering           = ['-fecha_ingreso']

    def get_queryset(self):
        return Tramite.objects.select_related(
            'persona', 'tipo_tramite__categoria',
            'unidad_responsable', 'usuario_asignado',
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return TramiteCrearSerializer
        if self.action == 'retrieve':
            return TramiteDetalleSerializer
        return TramiteListSerializer

    def perform_create(self, serializer):
        tipo    = serializer.validated_data['tipo_tramite']
        numero  = generar_numero_tramite()
        limite  = calcular_fecha_limite(tipo.dias_plazo)
        tramite = serializer.save(
            uuid=uuid.uuid4(),
            numero_tramite=numero,
            fecha_limite=limite,
            usuario_receptor=self.request.user,
        )
        Seguimiento.objects.create(
            tramite=tramite,
            estado_anterior='',
            estado_nuevo='ingresado',
            observacion='Trámite ingresado al sistema.',
            usuario=self.request.user,
            unidad=tramite.unidad_receptora,
        )

    @action(detail=True, methods=['post'], url_path='cambiar_estado')
    def cambiar_estado(self, request, pk=None):
        tramite        = self.get_object()
        nuevo_estado   = request.data.get('estado')
        observacion    = request.data.get('observacion', '')
        estados_validos = [e[0] for e in Tramite.ESTADO_CHOICES]

        if nuevo_estado not in estados_validos:
            return Response({'detail': 'Estado inválido.'}, status=400)

        estado_anterior = tramite.estado
        tramite.estado  = nuevo_estado

        if nuevo_estado == 'resuelto':
            tramite.fecha_resolucion = timezone.now()
            tramite.dias_resolucion  = (timezone.now().date() - tramite.fecha_ingreso.date()).days
            tramite.dentro_plazo     = timezone.now().date() <= tramite.fecha_limite
            tramite.tipo_resolucion  = request.data.get('tipo_resolucion', 'favorable')
            tramite.resolucion_texto = request.data.get('resolucion_texto', '')

        if nuevo_estado == 'asignado' and not tramite.fecha_asignacion:
            tramite.fecha_asignacion  = timezone.now()
            if request.data.get('usuario_asignado'):
                tramite.usuario_asignado_id = request.data['usuario_asignado']

        tramite.save()

        Seguimiento.objects.create(
            tramite=tramite,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            observacion=observacion,
            usuario=request.user,
            unidad=tramite.unidad_responsable,
        )
        return Response(TramiteListSerializer(tramite).data)

    @action(detail=False, methods=['get'], url_path='seguimiento_publico')
    def seguimiento_publico(self, request):
        numero = request.query_params.get('numero', '').strip()
        if not numero:
            return Response({'detail': 'Número de trámite requerido.'}, status=400)
        try:
            tramite     = Tramite.objects.get(numero_tramite=numero)
            seguimientos = tramite.seguimientos.filter(
                visible_ciudadano=True
            ).order_by('creado_en')
            return Response({
                'numero_tramite': tramite.numero_tramite,
                'asunto':         tramite.asunto,
                'estado':         tramite.get_estado_display(),
                'fecha_ingreso':  tramite.fecha_ingreso,
                'fecha_limite':   tramite.fecha_limite,
                'fecha_resolucion': tramite.fecha_resolucion,
                'seguimientos': [
                    {
                        'estado': s.get_estado_nuevo_display() if hasattr(s, 'get_estado_nuevo_display') else s.estado_nuevo,
                        'observacion': s.observacion,
                        'fecha': s.creado_en,
                    }
                    for s in seguimientos
                ],
            })
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado.'}, status=404)