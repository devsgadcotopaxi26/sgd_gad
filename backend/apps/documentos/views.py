from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import TipoDocumento, Documento, FlujoAprobacion, VersionDocumento
from .serializers import (
    TipoDocumentoSerializer,
    DocumentoListSerializer, DocumentoDetalleSerializer, DocumentoCrearSerializer,
    FlujoSerializer, VersionSerializer,
)


class TipoDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = TipoDocumento.objects.filter(activo=True).order_by('orden')
    serializer_class   = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated]


class DocumentoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['estado', 'prioridad', 'tipo_documento',
                          'unidad_origen', 'unidad_destino', 'anio']
    search_fields      = ['numero_documento', 'asunto', 'cuerpo', 'resumen']
    ordering_fields    = ['creado_en', 'fecha_elaboracion', 'numero_secuencial']
    ordering           = ['-creado_en']

    def get_queryset(self):
        return Documento.objects.select_related(
            'tipo_documento', 'unidad_origen', 'unidad_destino',
            'creado_por', 'firmado_por',
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentoCrearSerializer
        if self.action == 'retrieve':
            return DocumentoDetalleSerializer
        return DocumentoListSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=['post'], url_path='cambiar_estado')
    def cambiar_estado(self, request, pk=None):
        doc          = self.get_object()
        nuevo_estado = request.data.get('estado')
        estados      = [e[0] for e in Documento.ESTADO_CHOICES]
        if nuevo_estado not in estados:
            return Response({'detail': 'Estado inválido.'}, status=400)

        doc.estado = nuevo_estado
        if nuevo_estado == 'enviado'  and not doc.fecha_envio:
            doc.fecha_envio = timezone.now()
        if nuevo_estado == 'archivado' and not doc.fecha_archivo:
            doc.fecha_archivo = timezone.now()
        doc.save()
        return Response(DocumentoListSerializer(doc).data)

    @action(detail=True, methods=['post'], url_path='anular')
    def anular(self, request, pk=None):
        doc = self.get_object()
        if doc.estado == 'anulado':
            return Response({'detail': 'El documento ya está anulado.'}, status=400)
        doc.estado          = 'anulado'
        doc.anulado_en      = timezone.now()
        doc.anulado_por     = request.user
        doc.motivo_anulacion = request.data.get('motivo', '')
        doc.save()
        return Response({'detail': 'Documento anulado.'})

    @action(detail=True, methods=['post'], url_path='nueva_version')
    def nueva_version(self, request, pk=None):
        doc     = self.get_object()
        ultimo  = doc.versiones.count()
        version = VersionDocumento.objects.create(
            documento      = doc,
            numero_version = ultimo + 1,
            cuerpo         = request.data.get('cuerpo', doc.cuerpo),
            creado_por     = request.user,
            comentario     = request.data.get('comentario', ''),
        )
        doc.cuerpo        = version.cuerpo
        doc.modificado_en = timezone.now()
        doc.save(update_fields=['cuerpo', 'modificado_en'])
        return Response(VersionSerializer(version).data)

    @action(detail=True, methods=['get'], url_path='bandeja')
    def bandeja(self, request):
        docs = self.get_queryset().filter(
            destinatarios__usuario=request.user,
            destinatarios__accion_tomada='pendiente',
        ).distinct()
        return Response(DocumentoListSerializer(docs, many=True).data)