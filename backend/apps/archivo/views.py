from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.usuarios.permisos import PermisoModulo
from apps.documentos.acl_documentos import documentos_visibles_para
from .models import (
    Fondo, Seccion, Serie, Expediente, ExpedienteDocumento,
    Transferencia, TransferenciaExpediente,
    BajaDocumental, BajaExpediente,
    PrestamoDocumental, CopiaCertificada,
)
from .serializers import (
    FondoSerializer, SeccionSerializer, SerieSerializer, ExpedienteSerializer,
    ExpedienteListSerializer, ExpedienteDetalleSerializer, ExpedienteCrearSerializer,
    ExpedienteActualizarSerializer, ExpedienteDocumentoSerializer,
    TransferenciaSerializer, BajaDocumentalSerializer,
    PrestamoDocumentalSerializer, CopiaCertificadaSerializer,
)


class _ArchivoViewSetBase(viewsets.ModelViewSet):
    """F3-A — toda la API de `apps.archivo` exige el módulo de permisos
    `archivo` del catálogo central (`PERMISOS_ROL`), además de autenticación.
    La acción DRF se mapea al verbo (`ver`/`crear`/`editar`/`eliminar`)
    en `PermisoModulo`; el superusuario conserva su bypass."""
    permission_classes = [IsAuthenticated, PermisoModulo]
    modulo_permiso     = 'archivo'


class FondoViewSet(_ArchivoViewSetBase):
    queryset           = Fondo.objects.all()
    serializer_class   = FondoSerializer


class SeccionViewSet(_ArchivoViewSetBase):
    serializer_class   = SeccionSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['fondo', 'seccion_padre', 'activo']
    search_fields      = ['nombre', 'codigo']

    def get_queryset(self):
        return Seccion.objects.select_related('unidad', 'fondo', 'seccion_padre').all()

    @action(detail=False, methods=['get'], url_path='arbol')
    def arbol(self, request):
        raices = self.get_queryset().filter(seccion_padre__isnull=True)

        def construir(seccion):
            return {
                'id':            seccion.id,
                'codigo':        seccion.codigo,
                'nombre':        seccion.nombre,
                'unidad_siglas': seccion.unidad.siglas,
                'activo':        seccion.activo,
                'total_series':  seccion.series.count(),
                'hijos':         [construir(h) for h in seccion.subsecciones.all()],
            }

        return Response([construir(r) for r in raices])


class SerieViewSet(_ArchivoViewSetBase):
    serializer_class   = SerieSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['seccion', 'serie_padre', 'condicion_acceso', 'disposicion_final', 'activo']
    search_fields      = ['nombre', 'codigo', 'descripcion']

    def get_queryset(self):
        return Serie.objects.select_related('seccion', 'serie_padre').all()

    def perform_create(self, serializer):
        if not serializer.validated_data.get('codigo'):
            ultimo = Serie.objects.count()
            serializer.validated_data['codigo'] = f'SER-{str(ultimo + 1).zfill(3)}'
        serializer.save()


class ExpedienteViewSet(_ArchivoViewSetBase):
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['serie', 'unidad', 'estado', 'categoria_actual', 'soporte']
    search_fields      = ['titulo', 'codigo_expediente', 'descripcion']
    acciones_permiso   = {
        'agregar_documento': 'editar',
        'cerrar':            'editar',
        'expurgar':          'editar',
        'foliar':            'editar',
        'transferir':        'transferir',
    }

    def get_queryset(self):
        return Expediente.objects.select_related('serie', 'unidad', 'creado_por').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ExpedienteCrearSerializer
        if self.action in ('update', 'partial_update'):
            return ExpedienteActualizarSerializer
        if self.action == 'retrieve':
            return ExpedienteDetalleSerializer
        return ExpedienteListSerializer

    def perform_create(self, serializer):
        expediente = serializer.save(creado_por=self.request.user)
        if not expediente.codigo_expediente:
            expediente.generar_codigo()
            expediente.save()

    def retrieve(self, request, *args, **kwargs):
        """ACL documental (F3-A): calcula qué Documentos de este expediente
        puede consultar el usuario (F2-E, `documentos_visibles_para`) y lo pasa
        al serializer para enmascarar los no visibles sin filtrar metadata."""
        exp = self.get_object()
        doc_ids = list(
            exp.documentos.filter(documento__isnull=False)
            .values_list('documento_id', flat=True)
        )
        visibles = set(
            documentos_visibles_para(request.user)
            .filter(pk__in=doc_ids).values_list('pk', flat=True)
        )
        ctx = self.get_serializer_context()
        ctx['documentos_visibles_ids'] = visibles
        ser = self.get_serializer_class()(exp, context=ctx)
        return Response(ser.data)

    @action(detail=True, methods=['post'], url_path='agregar_documento')
    def agregar_documento(self, request, pk=None):
        exp          = self.get_object()
        documento_id = request.data.get('documento_id')
        tramite_id   = request.data.get('tramite_id')
        orden_foja   = request.data.get('orden_foja')

        if not any([documento_id, tramite_id]):
            return Response({'detail': 'Debe especificar documento_id o tramite_id.'}, status=400)

        # F3-A / §11 — no se agregan documentos a un expediente que no está
        # abierto. Antes solo lo impedía la UI (lista `elegibles`).
        if exp.estado != 'abierto':
            return Response(
                {'detail': f'El expediente está {exp.get_estado_display().lower()}; '
                           'no admite nuevos documentos.'},
                status=409,
            )

        # F3-A / §3-§5 — ACL documental: no se puede vincular un Documento que
        # el usuario no puede consultar (reutiliza F2-E). 404: no se revela si
        # el documento existe o solo está fuera de su alcance.
        if documento_id and not documentos_visibles_para(request.user).filter(pk=documento_id).exists():
            return Response({'detail': 'Documento no encontrado o sin acceso.'}, status=404)

        item = ExpedienteDocumento.objects.create(
            expediente   = exp,
            documento_id = documento_id,
            tramite_id   = tramite_id,
            orden_foja   = orden_foja,
            agregado_por = request.user,
        )
        exp.num_fojas = exp.documentos.count()
        exp.save(update_fields=['num_fojas'])
        return Response(ExpedienteDocumentoSerializer(item).data, status=201)

    @action(detail=False, methods=['get'], url_path='elegibles')
    def elegibles(self, request):
        serie_id = request.query_params.get('serie')
        search   = request.query_params.get('search', '')
        qs = self.get_queryset().filter(estado='abierto')
        if serie_id:
            qs = qs.filter(serie_id=serie_id)
        if search:
            qs = qs.filter(titulo__icontains=search)
        return Response(ExpedienteSerializer(qs[:20], many=True).data)

    @action(detail=True, methods=['post'], url_path='cerrar')
    def cerrar(self, request, pk=None):
        expediente = self.get_object()
        if not expediente.expurgado or not expediente.foliado:
            return Response({'detail': 'El expediente debe ser expurgado y foliado antes de cerrarse.'}, status=400)
        expediente.estado       = 'cerrado'
        expediente.fecha_cierre = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)

    @action(detail=True, methods=['post'], url_path='expurgar')
    def expurgar(self, request, pk=None):
        expediente = self.get_object()
        expediente.expurgado     = True
        expediente.fecha_expurgo = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)

    @action(detail=True, methods=['post'], url_path='foliar')
    def foliar(self, request, pk=None):
        expediente = self.get_object()
        num_fojas  = request.data.get('num_fojas')
        if num_fojas is not None:
            expediente.num_fojas = num_fojas
        expediente.foliado         = True
        expediente.fecha_foliacion = timezone.now().date()
        expediente.save()
        return Response(ExpedienteSerializer(expediente).data)

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
            'fisico':       qs.filter(soporte='fisico').count(),
            'mixto':        qs.filter(soporte='mixto').count(),
        })


class TransferenciaViewSet(_ArchivoViewSetBase):
    serializer_class   = TransferenciaSerializer
    filterset_fields   = ['tipo', 'unidad', 'estado']

    def get_queryset(self):
        return Transferencia.objects.select_related('unidad', 'solicitado_por', 'revisado_por').all()

    def perform_create(self, serializer):
        expedientes_ids = self.request.data.get('expedientes_ids', [])
        transferencia   = serializer.save(solicitado_por=self.request.user)
        for exp_id in expedientes_ids:
            TransferenciaExpediente.objects.create(
                transferencia=transferencia,
                expediente_id=exp_id,
            )


class BajaDocumentalViewSet(_ArchivoViewSetBase):
    serializer_class   = BajaDocumentalSerializer
    filterset_fields   = ['unidad', 'estado']

    def get_queryset(self):
        return BajaDocumental.objects.select_related('unidad', 'solicitado_por', 'aprobado_por').all()

    def perform_create(self, serializer):
        expedientes_ids = self.request.data.get('expedientes_ids', [])
        baja = serializer.save(solicitado_por=self.request.user)
        for exp_id in expedientes_ids:
            BajaExpediente.objects.create(baja=baja, expediente_id=exp_id)


class PrestamoDocumentalViewSet(_ArchivoViewSetBase):
    serializer_class   = PrestamoDocumentalSerializer
    filterset_fields   = ['expediente', 'solicitante', 'estado']

    def get_queryset(self):
        return PrestamoDocumental.objects.select_related('expediente', 'solicitante', 'autorizado_por').all()

    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)


class CopiaCertificadaViewSet(_ArchivoViewSetBase):
    serializer_class   = CopiaCertificadaSerializer

    def get_queryset(self):
        return CopiaCertificada.objects.select_related('expediente', 'certificado_por').all()

    def perform_create(self, serializer):
        serializer.save(certificado_por=self.request.user)