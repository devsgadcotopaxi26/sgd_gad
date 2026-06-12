import uuid
from datetime import date, timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
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
        if tramite.persona.notificacion_email and tramite.persona.email:
            from apps.auditoria.emails import email_notificacion_ciudadano
            email_notificacion_ciudadano(
                tramite.persona.email,
                tramite.persona.nombre_completo,
                tramite.numero_tramite,
                tramite.asunto,
                dict(Tramite.ESTADO_CHOICES).get(nuevo_estado, nuevo_estado),
            )

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

class PortalCiudadanoView(APIView):
    permission_classes = []  # público

    def get(self, request):
        numero = request.query_params.get('numero', '').strip()
        cedula = request.query_params.get('cedula', '').strip()

        if not numero and not cedula:
            return Response({'detail': 'Ingresa el número de trámite o tu cédula.'}, status=400)

        try:
            if numero:
                tramite = Tramite.objects.select_related(
                    'tipo_tramite__categoria', 'persona', 'unidad_responsable'
                ).get(numero_tramite=numero)
            else:
                tramites = Tramite.objects.select_related(
                    'tipo_tramite__categoria', 'persona', 'unidad_responsable'
                ).filter(persona__numero_identificacion=cedula).order_by('-fecha_ingreso')

                if not tramites.exists():
                    return Response({'detail': 'No se encontraron trámites con esa cédula.'}, status=404)

                return Response({
                    'tipo': 'lista',
                    'tramites': [
                        {
                            'numero_tramite':  t.numero_tramite,
                            'asunto':          t.asunto,
                            'estado':          t.get_estado_display(),
                            'estado_key':      t.estado,
                            'categoria':       t.tipo_tramite.categoria.nombre,
                            'fecha_ingreso':   t.fecha_ingreso.strftime('%d/%m/%Y'),
                            'fecha_limite':    t.fecha_limite.strftime('%d/%m/%Y'),
                            'fecha_resolucion': t.fecha_resolucion.strftime('%d/%m/%Y %H:%M') if t.fecha_resolucion else None,
                        }
                        for t in tramites[:10]
                    ]
                })

            from django.utils import timezone
            hoy = timezone.now().date()
            seguimientos = tramite.seguimientos.filter(
                visible_ciudadano=True
            ).order_by('creado_en').values('estado_nuevo', 'observacion', 'creado_en')

            dias_restantes = None
            if tramite.estado not in ('resuelto', 'archivado', 'rechazado', 'desistido'):
                dias_restantes = (tramite.fecha_limite - hoy).days

            return Response({
                'tipo':            'detalle',
                'numero_tramite':  tramite.numero_tramite,
                'asunto':          tramite.asunto,
                'tipo_tramite':    tramite.tipo_tramite.nombre,
                'categoria':       tramite.tipo_tramite.categoria.nombre,
                'estado':          tramite.get_estado_display(),
                'estado_key':      tramite.estado,
                'prioridad':       tramite.prioridad,
                'canal_ingreso':   tramite.canal_ingreso,
                'unidad':          tramite.unidad_responsable.nombre,
                'unidad_siglas':   tramite.unidad_responsable.siglas,
                'fecha_ingreso':   tramite.fecha_ingreso.strftime('%d/%m/%Y %H:%M'),
                'fecha_limite':    tramite.fecha_limite.strftime('%d/%m/%Y'),
                'fecha_resolucion': tramite.fecha_resolucion.strftime('%d/%m/%Y %H:%M') if tramite.fecha_resolucion else None,
                'dentro_plazo':    tramite.dentro_plazo,
                'dias_restantes':  dias_restantes,
                'calificacion':    tramite.calificacion,
                'seguimientos': [
                    {
                        'estado':      s['estado_nuevo'],
                        'observacion': s['observacion'],
                        'fecha':       s['creado_en'].strftime('%d/%m/%Y %H:%M'),
                    }
                    for s in seguimientos
                ],
            })
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado. Verifica el número ingresado.'}, status=404)


class CalificarTramiteView(APIView):
    permission_classes = []  # público

    def post(self, request):
        numero      = request.data.get('numero_tramite', '').strip()
        calificacion = request.data.get('calificacion')
        comentario  = request.data.get('comentario', '')

        if not numero or not calificacion:
            return Response({'detail': 'Número de trámite y calificación son obligatorios.'}, status=400)

        try:
            tramite = Tramite.objects.get(numero_tramite=numero, estado='resuelto')
            if tramite.calificacion:
                return Response({'detail': 'Este trámite ya fue calificado.'}, status=400)
            tramite.calificacion         = int(calificacion)
            tramite.comentario_ciudadano = comentario
            tramite.save(update_fields=['calificacion', 'comentario_ciudadano'])
            return Response({'detail': 'Gracias por tu calificación.'})
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado o no está resuelto.'}, status=404)