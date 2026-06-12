from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from .models import BandejaDocumento, SeguimientoDocumento, Tarea, DestinatarioExterno
from .models import TipoDocumento, Documento, FlujoAprobacion, VersionDocumento
from django.http import HttpResponse
from apps.auditoria.reportes import generar_pdf, html_base
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

class BandejaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BandejaDocumento.objects.filter(
            usuario=self.request.user
        ).select_related('documento__tipo_documento', 'documento__unidad_origen', 'unidad')

    def get_serializer_class(self):
        from .serializers import BandejaSerializer
        return BandejaSerializer

    @action(detail=False, methods=['get'], url_path='conteos')
    def conteos(self, request):
        qs = BandejaDocumento.objects.filter(usuario=request.user)
        from django.db.models import Count
        resultado = {}
        for bandeja, _ in BandejaDocumento.BANDEJA_CHOICES:
            total   = qs.filter(bandeja=bandeja).count()
            no_leidos = qs.filter(bandeja=bandeja, leido=False).count()
            resultado[bandeja] = {'total': total, 'no_leidos': no_leidos}
        return Response(resultado)

    @action(detail=False, methods=['get'], url_path='por_bandeja')
    def por_bandeja(self, request):
        bandeja = request.query_params.get('bandeja', 'recibidos')
        tipo    = request.query_params.get('tipo', '')
        leido   = request.query_params.get('leido', '')
        search  = request.query_params.get('search', '')

        qs = BandejaDocumento.objects.filter(
            usuario=request.user, bandeja=bandeja
        ).select_related(
            'documento__tipo_documento',
            'documento__unidad_origen',
            'documento__creado_por',
        ).order_by('-creado_en')

        if tipo:
            qs = qs.filter(documento__tipo_documento__codigo=tipo)
        if leido == 'false':
            qs = qs.filter(leido=False)
        if search:
            qs = qs.filter(
                documento__asunto__icontains=search
            ) | qs.filter(
                documento__numero_documento__icontains=search
            )

        from .serializers import BandejaSerializer
        return Response({
            'count':   qs.count(),
            'results': BandejaSerializer(qs, many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='marcar_leido')
    def marcar_leido(self, request, pk=None):
        item = self.get_object()
        item.leido    = True
        item.leido_en = timezone.now()
        item.save()
        return Response({'detail': 'Marcado como leído.'})

    @action(detail=True, methods=['post'], url_path='reasignar')
    def reasignar(self, request, pk=None):
        item         = self.get_object()
        usuario_id   = request.data.get('usuario_id')
        unidad_id    = request.data.get('unidad_id')
        instrucciones = request.data.get('instrucciones', '')

        nueva_bandeja = BandejaDocumento.objects.create(
            documento     = item.documento,
            usuario_id    = usuario_id,
            unidad_id     = unidad_id,
            bandeja       = 'recibidos',
            instrucciones = instrucciones,
            es_urgente    = item.es_urgente,
            fecha_limite  = item.fecha_limite,
        )

        item.accion_tomada = 'reasignado'
        item.save()

        SeguimientoDocumento.objects.create(
            documento   = item.documento,
            etapa       = 'reasignado',
            usuario     = request.user,
            unidad_id   = unidad_id,
            observacion = instrucciones,
        )
        return Response({'detail': 'Documento reasignado.'})

    @action(detail=True, methods=['post'], url_path='archivar')
    def archivar(self, request, pk=None):
        item               = self.get_object()
        item.bandeja       = 'archivados'
        item.accion_tomada = 'archivado'
        item.save()

        SeguimientoDocumento.objects.create(
            documento   = item.documento,
            etapa       = 'archivado',
            usuario     = request.user,
            observacion = request.data.get('observacion', ''),
        )
        return Response({'detail': 'Documento archivado.'})

    @action(detail=True, methods=['post'], url_path='comentar')
    def comentar(self, request, pk=None):
        item = self.get_object()
        obs  = request.data.get('comentario', '')

        SeguimientoDocumento.objects.create(
            documento   = item.documento,
            etapa       = 'comentado',
            usuario     = request.user,
            observacion = obs,
        )
        item.accion_tomada = 'comentado'
        item.save()
        return Response({'detail': 'Comentario registrado.'})

    @action(detail=True, methods=['post'], url_path='nueva_tarea')
    def nueva_tarea(self, request, pk=None):
        item = self.get_object()
        tarea = Tarea.objects.create(
            documento      = item.documento,
            asignada_por   = request.user,
            asignada_a_id  = request.data.get('usuario_id'),
            unidad_destino_id = request.data.get('unidad_id'),
            descripcion    = request.data.get('descripcion', ''),
            prioridad      = request.data.get('prioridad', 'normal'),
            fecha_limite   = request.data.get('fecha_limite'),
        )
        BandejaDocumento.objects.create(
            documento    = item.documento,
            usuario_id   = request.data.get('usuario_id'),
            bandeja      = 'tareas_recibidas',
            instrucciones = request.data.get('descripcion', ''),
        )
        BandejaDocumento.objects.get_or_create(
            documento = item.documento,
            usuario   = request.user,
            bandeja   = 'tareas_enviadas',
        )
        return Response({'detail': 'Tarea creada.', 'tarea_id': tarea.id})


class EnviarDocumentoView(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        from .models import Documento
        doc = Documento.objects.get(pk=pk)

        destinatarios_internos  = request.data.get('destinatarios_internos', [])
        destinatarios_externos  = request.data.get('destinatarios_externos', [])
        instrucciones           = request.data.get('instrucciones', '')
        es_urgente              = request.data.get('es_urgente', False)
        fecha_limite            = request.data.get('fecha_limite')
        numero_referencia       = request.data.get('numero_referencia', '')

        doc.estado      = 'enviado'
        doc.fecha_envio = timezone.now()
        doc.save()

        for dest in destinatarios_internos:
            BandejaDocumento.objects.get_or_create(
                documento    = doc,
                usuario_id   = dest.get('usuario_id'),
                bandeja      = 'recibidos',
                defaults={
                    'unidad_id':         dest.get('unidad_id'),
                    'instrucciones':     instrucciones,
                    'es_urgente':        es_urgente,
                    'fecha_limite':      fecha_limite,
                    'numero_referencia': numero_referencia,
                }
            )

        for dest in destinatarios_externos:
            DestinatarioExterno.objects.create(
                documento   = doc,
                tipo        = dest.get('tipo', 'institucion'),
                nombre      = dest.get('nombre', ''),
                institucion = dest.get('institucion', ''),
                email       = dest.get('email', ''),
                cedula_ruc  = dest.get('cedula_ruc', ''),
            )

        BandejaDocumento.objects.get_or_create(
            documento = doc,
            usuario   = request.user,
            bandeja   = 'enviados',
        )

        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'enviado',
            usuario     = request.user,
            observacion = instrucciones,
        )

        return Response({'detail': f'Documento {doc.numero_documento} enviado correctamente.'})

class DocumentoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Documento.objects.select_related(
                'tipo_documento', 'unidad_origen', 'unidad_destino',
                'creado_por', 'firmado_por'
            ).get(pk=pk)
        except Documento.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)

        fecha_doc = doc.fecha_elaboracion.strftime('%d de %B de %Y') if doc.fecha_elaboracion else '—'
        destino   = doc.unidad_destino.nombre if doc.unidad_destino else 'A quien corresponda'
        firmado   = doc.firmado_por.nombre_completo if doc.firmado_por else doc.creado_por.nombre_completo

        contenido = f"""
        <div style="margin-bottom:20px">
            <table style="width:100%;font-size:10pt;border:none">
                <tr>
                    <td style="width:50%">
                        <strong>{doc.tipo_documento.nombre} No. {doc.numero_documento or '(por asignar)'}</strong>
                    </td>
                    <td style="width:50%;text-align:right;color:#666">
                        Latacunga, {fecha_doc}
                    </td>
                </tr>
            </table>
        </div>

        <div style="margin-bottom:20px;font-size:10pt">
            <p>Señores</p>
            <p><strong>{destino}</strong></p>
            <p>Presente.-</p>
        </div>

        <div style="margin-bottom:10px;font-size:10pt">
            <p><strong>ASUNTO:</strong> {doc.asunto}</p>
        </div>

        <div style="font-size:10pt;line-height:1.8;margin-bottom:40px;text-align:justify">
            {doc.cuerpo or '<p style="color:#999;font-style:italic">[Sin contenido]</p>'}
        </div>

        <div style="margin-top:60px;font-size:10pt">
            <p>Atentamente,</p>
            <br><br>
            <p><strong>{firmado}</strong></p>
            <p>{doc.creado_por.cargo if hasattr(doc.creado_por, 'cargo') else ''}</p>
            <p>{doc.unidad_origen.nombre}</p>
            {'<p style="color:#0f6e56;font-size:9pt">✓ Documento firmado electrónicamente — BCE</p>' if doc.firma_bce_info else ''}
        </div>

        {'<div style="margin-top:20px;padding:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:8pt;color:#15803d"><strong>Firma digital verificada</strong> — ' + str(doc.firma_bce_info) + '</div>' if doc.firma_bce_info else ''}
        """

        html = html_base(
            f'{doc.tipo_documento.nombre} — {doc.numero_documento or "Borrador"}',
            f'{doc.unidad_origen.nombre} · {fecha_doc}',
            contenido
        )

        filename = f'{doc.numero_documento or f"doc_{doc.id}"}.pdf'.replace('/', '-')
        return generar_pdf(html, filename)