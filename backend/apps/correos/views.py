from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Correo, SeguimientoCorreo
from .serializers import (
    CorreoListSerializer, CorreoDetalleSerializer,
    CorreoCrearSerializer, SeguimientoCorreoSerializer,
)


def registrar_seguimiento(correo, etapa, estado_anterior, estado_nuevo, usuario, observacion=''):
    SeguimientoCorreo.objects.create(
        correo=correo, etapa=etapa,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        usuario=usuario, observacion=observacion,
    )


class CorreoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['tipo', 'estado', 'prioridad', 'unidad_destino', 'respondido', 'leido']
    search_fields      = ['numero_registro', 'asunto', 'remitente_email',
                          'remitente_nombre', 'remitente_entidad', 'cuerpo']
    ordering_fields    = ['fecha_recepcion', 'estado', 'prioridad', 'fecha_limite_resp']
    ordering           = ['-fecha_recepcion']

    def get_queryset(self):
        return Correo.objects.select_related(
            'unidad_destino', 'usuario_asignado', 'registrado_por'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CorreoCrearSerializer
        if self.action == 'retrieve':
            return CorreoDetalleSerializer
        return CorreoListSerializer

    def perform_create(self, serializer):
        correo = serializer.save(registrado_por=self.request.user)
        correo.generar_numero()
        correo.save(update_fields=['numero_registro'])
        registrar_seguimiento(
            correo, 'recibido', '', 'nuevo',
            self.request.user, 'Correo recibido y registrado en el sistema.'
        )
        registrar_seguimiento(
            correo, 'registrado', 'nuevo', 'registrado',
            self.request.user, f'Número asignado: {correo.numero_registro}'
        )

    @action(detail=True, methods=['post'], url_path='asignar')
    def asignar(self, request, pk=None):
        correo    = self.get_object()
        usuario_id = request.data.get('usuario_id')
        unidad_id  = request.data.get('unidad_id')
        obs        = request.data.get('observacion', '')

        estado_anterior = correo.estado
        if usuario_id:
            correo.usuario_asignado_id = usuario_id
        if unidad_id:
            correo.unidad_destino_id = unidad_id
        correo.estado = 'asignado'
        correo.save()

        registrar_seguimiento(
            correo, 'asignado', estado_anterior, 'asignado',
            request.user, obs or 'Correo asignado a funcionario.'
        )
        return Response(CorreoListSerializer(correo).data)

    @action(detail=True, methods=['post'], url_path='responder')
    def responder(self, request, pk=None):
        correo = self.get_object()
        obs    = request.data.get('observacion', 'Respuesta enviada.')

        estado_anterior    = correo.estado
        correo.respondido  = True
        correo.estado      = 'respondido'
        correo.fecha_respuesta = timezone.now()
        correo.save()

        registrar_seguimiento(
            correo, 'respuesta', estado_anterior, 'respondido',
            request.user, obs
        )
        return Response(CorreoListSerializer(correo).data)

    @action(detail=True, methods=['post'], url_path='archivar')
    def archivar(self, request, pk=None):
        correo = self.get_object()
        obs    = request.data.get('observacion', 'Correo archivado.')

        estado_anterior    = correo.estado
        correo.estado      = 'archivado'
        correo.archivado_en = timezone.now()
        correo.save()

        registrar_seguimiento(
            correo, 'archivado', estado_anterior, 'archivado',
            request.user, obs
        )
        return Response(CorreoListSerializer(correo).data)

    @action(detail=True, methods=['post'], url_path='marcar_leido')
    def marcar_leido(self, request, pk=None):
        correo = self.get_object()
        if not correo.leido:
            correo.leido    = True
            correo.leido_en = timezone.now()
            if correo.estado == 'nuevo':
                correo.estado = 'registrado'
            correo.save()
        return Response(CorreoListSerializer(correo).data)

    @action(detail=True, methods=['post'], url_path='crear_tramite')
    def crear_tramite(self, request, pk=None):
        correo = self.get_object()
        return Response({
            'detail': 'Redirigir a formulario de trámite con datos precargados.',
            'correo_id':  correo.id,
            'asunto':     correo.asunto,
            'remitente':  correo.remitente_nombre,
        })

    @action(detail=True, methods=['post'], url_path='generar_oficio')
    def generar_oficio(self, request, pk=None):
        correo = self.get_object()
        return Response({
            'detail': 'Redirigir a nuevo documento con datos precargados.',
            'correo_id': correo.id,
            'asunto':    f'RE: {correo.asunto}',
        })

    @action(detail=False, methods=['get'], url_path='sin_responder')
    def sin_responder(self, request):
        qs = self.get_queryset().filter(
            respondido=False,
            estado__in=['nuevo', 'registrado', 'asignado', 'en_proceso']
        )
        return Response(CorreoListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='por_vencer')
    def por_vencer(self, request):
        from datetime import timedelta
        limite = timezone.now().date() + timedelta(days=3)
        qs = self.get_queryset().filter(
            respondido=False,
            fecha_limite_resp__lte=limite,
            fecha_limite_resp__gte=timezone.now().date(),
        )
        return Response(CorreoListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request):
        qs = self.get_queryset()
        return Response({
            'total':         qs.count(),
            'nuevos':        qs.filter(estado='nuevo').count(),
            'en_proceso':    qs.filter(estado__in=['asignado','en_proceso']).count(),
            'respondidos':   qs.filter(respondido=True).count(),
            'sin_responder': qs.filter(respondido=False).count(),
            'vencidos':      qs.filter(
                respondido=False,
                fecha_limite_resp__lt=timezone.now().date()
            ).count(),
            'por_vencer':    qs.filter(
                respondido=False,
                fecha_limite_resp__lte=timezone.now().date(),
            ).count(),
        })