from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Nivel, Funcion, Unidad
from .serializers import (
    NivelSerializer, FuncionSerializer,
    UnidadListSerializer, UnidadDetalleSerializer,
    UnidadArbolSerializer, UnidadCrearSerializer, UnidadResumenSerializer,
)


class NivelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Nivel.objects.filter(activo=True)
    serializer_class   = NivelSerializer
    permission_classes = [IsAuthenticated]


class FuncionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Funcion.objects.filter(activo=True)
    serializer_class   = FuncionSerializer
    permission_classes = [IsAuthenticated]


class UnidadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['tipo', 'activo', 'nivel']
    search_fields      = ['nombre', 'codigo', 'siglas', 'email_oficial']
    ordering_fields    = ['orden_display', 'nombre', 'codigo']
    ordering           = ['orden_display']

    def get_queryset(self):
        return Unidad.objects.select_related('padre', 'nivel', 'funcion')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UnidadCrearSerializer
        if self.action == 'retrieve':
            return UnidadDetalleSerializer
        if self.action == 'select':
            return UnidadResumenSerializer
        return UnidadListSerializer

    @action(detail=False, methods=['get'], url_path='arbol')
    def arbol(self, request):
        raices = Unidad.objects.filter(
            padre__isnull=True, activo=True
        ).select_related('nivel').order_by('orden_display')
        return Response(UnidadArbolSerializer(raices, many=True).data)

    @action(detail=False, methods=['get'], url_path='select')
    def select(self, request):
        qs   = Unidad.objects.filter(activo=True).order_by('orden_display', 'nombre')
        tipo = request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)
        return Response(UnidadResumenSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], url_path='activar')
    def activar(self, request, pk=None):
        u = self.get_object()
        u.activo = True
        u.save(update_fields=['activo'])
        return Response({'detail': f'{u.nombre} activada.'})

    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar(self, request, pk=None):
        u = self.get_object()
        if u.hijos.filter(activo=True).exists():
            return Response(
                {'detail': 'No se puede desactivar una unidad con dependencias activas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        u.activo = False
        u.save(update_fields=['activo'])
        return Response({'detail': f'{u.nombre} desactivada.'})