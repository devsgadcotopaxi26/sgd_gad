from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Fondo, Seccion, Serie, Expediente,
    Transferencia, BajaDocumental,
    PrestamoDocumental, CopiaCertificada,
)
from .serializers import (
    FondoSerializer, SeccionSerializer, SerieSerializer, ExpedienteSerializer,
    TransferenciaSerializer, BajaDocumentalSerializer,
    PrestamoDocumentalSerializer, CopiaCertificadaSerializer,
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

class FondoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset            = Fondo.objects.all()
    serializer_class     = FondoSerializer


class SeccionViewSet(viewsets.ModelViewSet):
    permission_classes   = [IsAuthenticated]
    serializer_class      = SeccionSerializer
    filter_backends       = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields      = ['fondo', 'seccion_padre', 'activo']
    search_fields         = ['nombre', 'codigo']

    def get_queryset(self):
        return Seccion.objects.select_related('unidad', 'fondo', 'seccion_padre').all()

    @action(detail=False, methods=['get'], url_path='arbol')
    def arbol(self, request):
        """Devuelve las secciones en estructura jerárquica (igual que el organigrama)."""
        raices = self.get_queryset().filter(seccion_padre__isnull=True)

        def construir(seccion):
            return {
                'id': seccion.id,
                'codigo': seccion.codigo,
                'nombre': seccion.nombre,
                'unidad_siglas': seccion.unidad.siglas,
                'activo': seccion.activo,
                'total_series': seccion.series.count(),
                'hijos': [construir(h) for h in seccion.subsecciones.all()],
            }

        return Response([construir(r) for r in raices])


class SerieViewSet(viewsets.ModelViewSet):
    permission_classes   = [IsAuthenticated]
    serializer_class      = SerieSerializer
    filter_backends       = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields      = ['seccion', 'serie_padre', 'condicion_acceso', 'disposicion_final', 'activo']
    search_fields         = ['nombre', 'codigo', 'descripcion']

    def get_queryset(self):
        return Serie.objects.select_related('seccion', 'serie_padre').all()

    def perform_create(self, serializer):
        # Auto-generar código si no se especifica
        if not serializer.validated_data.get('codigo'):
            ultimo = Serie.objects.count()
            serializer.validated_data['codigo'] = f'SER-{str(ultimo + 1).zfill(3)}'
        serializer.save()


class ExpedienteViewSet(viewsets.ModelViewSet):
    permission_classes   = [IsAuthenticated]
    serializer_class      = ExpedienteSerializer
    filter_backends       = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields      = ['serie', 'unidad', 'estado', 'categoria_actual', 'soporte']
    search_fields         = ['titulo', 'codigo_expediente', 'descripcion']

    def get_queryset(self):
        return Expediente.objects.select_related('serie', 'unidad', 'creado_por').all()

    def perform_create(self, serializer):
        expediente = serializer.save(creado_por=self.request.user)
        if not expediente.codigo_expediente:
            expediente.generar_codigo()
            expediente.save()

    @action(detail=True, methods=['post'], url_path='cerrar')
    def cerrar(self, request, pk=None):
        """Cierra el expediente: requiere expurgo y foliación previos (Art. 33)."""
        expediente = self.get_object()
        if not expediente.expurgado or not expediente.foliado:
            return Response(
                {'detail': 'El expediente debe ser expurgado y foliado antes de cerrarse.'},
                status=400
            )
        from django.utils import timezone
        expediente.estado       = 'cerrado'
        expediente.fecha_cierre = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)

    @action(detail=True, methods=['post'], url_path='expurgar')
    def expurgar(self, request, pk=None):
        from django.utils import timezone
        expediente = self.get_object()
        expediente.expurgado     = True
        expediente.fecha_expurgo = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)

    @action(detail=True, methods=['post'], url_path='foliar')
    def foliar(self, request, pk=None):
        from django.utils import timezone
        expediente = self.get_object()
        num_fojas  = request.data.get('num_fojas')
        if num_fojas is not None:
            expediente.num_fojas = num_fojas
        expediente.foliado         = True
        expediente.fecha_foliacion = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)


class TransferenciaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class     = TransferenciaSerializer
    filterset_fields     = ['tipo', 'unidad', 'estado']

    def get_queryset(self):
        return Transferencia.objects.select_related('unidad', 'solicitado_por', 'revisado_por').all()

    def perform_create(self, serializer):
        expedientes_ids = self.request.data.get('expedientes_ids', [])
        transferencia = serializer.save(solicitado_por=self.request.user)

        from .models import TransferenciaExpediente, Expediente
        for exp_id in expedientes_ids:
            TransferenciaExpediente.objects.create(
                transferencia=transferencia,
                expediente_id=exp_id,
            )



class BajaDocumentalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class     = BajaDocumentalSerializer
    filterset_fields     = ['unidad', 'estado']

    def get_queryset(self):
        return BajaDocumental.objects.select_related('unidad', 'solicitado_por', 'aprobado_por').all()

    def perform_create(self, serializer):
        serializer.save(solicitado_por=self.request.user)


class PrestamoDocumentalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class     = PrestamoDocumentalSerializer
    filterset_fields     = ['expediente', 'solicitante', 'estado']

    def get_queryset(self):
        return PrestamoDocumental.objects.select_related('expediente', 'solicitante', 'autorizado_por').all()

    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)


class CopiaCertificadaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class     = CopiaCertificadaSerializer

    def get_queryset(self):
        return CopiaCertificada.objects.select_related('expediente', 'certificado_por').all()

    def perform_create(self, serializer):
        serializer.save(certificado_por=self.request.user)