from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Serie, Expediente, ExpedienteDocumento
from .serializers import (
    SerieSerializer,
    ExpedienteListSerializer, ExpedienteDetalleSerializer,
    ExpedienteCrearSerializer, ExpedienteDocumentoSerializer,
)


class SerieViewSet(viewsets.ModelViewSet):
    queryset           = Serie.objects.filter(activo=True)
    serializer_class   = SerieSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [SearchFilter]
    search_fields      = ['codigo', 'nombre']


class ExpedienteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['estado', 'soporte', 'serie', 'unidad']
    search_fields      = ['codigo_expediente', 'titulo', 'descripcion']
    ordering_fields    = ['creado_en', 'fecha_inicio', 'codigo_expediente']
    ordering           = ['-creado_en']

    def get_queryset(self):
        return Expediente.objects.select_related('serie', 'unidad', 'creado_por')

    def get_serializer_class(self):
        if self.action == 'create':
            return ExpedienteCrearSerializer
        if self.action == 'retrieve':
            return ExpedienteDetalleSerializer
        return ExpedienteListSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=['post'], url_path='agregar_documento')
    def agregar_documento(self, request, pk=None):
        exp          = self.get_object()
        documento_id = request.data.get('documento_id')
        tramite_id   = request.data.get('tramite_id')
        correo_id    = request.data.get('correo_id')
        orden_foja   = request.data.get('orden_foja')

        if not any([documento_id, tramite_id, correo_id]):
            return Response({'detail': 'Debe especificar documento_id, tramite_id o correo_id.'}, status=400)

        item = ExpedienteDocumento.objects.create(
            expediente   = exp,
            documento_id = documento_id,
            tramite_id   = tramite_id,
            correo_id    = correo_id,
            orden_foja   = orden_foja,
            agregado_por = request.user,
        )
        exp.num_fojas = exp.documentos.count()
        exp.save(update_fields=['num_fojas'])
        return Response(ExpedienteDocumentoSerializer(item).data, status=201)

    @action(detail=True, methods=['post'], url_path='cerrar')
    def cerrar(self, request, pk=None):
        exp = self.get_object()
        if exp.estado != 'abierto':
            return Response({'detail': 'Solo se pueden cerrar expedientes abiertos.'}, status=400)
        exp.estado       = 'cerrado'
        exp.fecha_cierre = timezone.now().date()
        exp.save()
        return Response(ExpedienteListSerializer(exp).data)

    @action(detail=True, methods=['post'], url_path='transferir')
    def transferir(self, request, pk=None):
        exp = self.get_object()
        exp.estado = 'transferido'
        exp.save(update_fields=['estado'])
        return Response({'detail': f'Expediente {exp.codigo_expediente} transferido al archivo central.'})

    @action(detail=False, methods=['get'], url_path='estadisticas')
    def estadisticas(self, request):
        qs = self.get_queryset()
        return Response({
            'total':        qs.count(),
            'abiertos':     qs.filter(estado='abierto').count(),
            'cerrados':     qs.filter(estado='cerrado').count(),
            'transferidos': qs.filter(estado='transferido').count(),
            'por_vencer':   qs.filter(
                fecha_expurgo__lte=timezone.now().date(),
                estado__in=['abierto', 'cerrado']
            ).count(),
            'digital':      qs.filter(soporte='digital').count(),
            'fisico':        qs.filter(soporte='fisico').count(),
            'mixto':         qs.filter(soporte='mixto').count(),
        })