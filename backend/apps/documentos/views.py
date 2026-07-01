from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from .models import BandejaDocumento, SeguimientoDocumento, Tarea, DestinatarioExterno
from .models import TipoDocumento, Documento, FlujoAprobacion, VersionDocumento, AdjuntoDocumento
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse, FileResponse
from apps.auditoria.reportes import generar_pdf, html_base
from .serializers import (
    TipoDocumentoSerializer,
    DocumentoListSerializer, DocumentoDetalleSerializer, DocumentoCrearSerializer,
    FlujoSerializer, VersionSerializer,
)


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    serializer_class   = TipoDocumentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Desde ajustes se pide todos; desde el resto solo activos
        todos = self.request.query_params.get('todos', 'false')
        if todos == 'true':
            return TipoDocumento.objects.all().order_by('orden')
        return TipoDocumento.objects.filter(activo=True).order_by('orden')


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
        if self.action in ('create', 'update', 'partial_update'):
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

    @action(detail=True, methods=['post'], url_path='registrar_firma')
    def registrar_firma(self, request, pk=None):
        doc = self.get_object()
        info_firma = request.data.get('firma_info', {})
        if not info_firma:
            return Response({'detail': 'Se requiere información de firma.'}, status=400)
        doc.firma_bce_info = {
            'firmado_por':    info_firma.get('firmado_por', ''),
            'cedula':         info_firma.get('cedula', ''),
            'entidad_cert':   info_firma.get('entidad_cert', ''),
            'fecha_firma':    info_firma.get('fecha_firma', ''),
            'algoritmo':      info_firma.get('algoritmo', 'SHA256withRSA'),
            'valido_hasta':   info_firma.get('valido_hasta', ''),
        }
        doc.estado     = 'firmado'
        doc.fecha_firma = timezone.now()
        doc.firmado_por = request.user
        doc.save(update_fields=['firma_bce_info', 'estado', 'fecha_firma', 'firmado_por'])
        return Response({
            'detail': 'Documento firmado correctamente.',
            'firma_bce_info': doc.firma_bce_info,
        })
    @action(detail=True, methods=['post'], url_path='enviar_email')
    def enviar_email(self, request, pk=None):
        from django.core.mail import EmailMessage
        from .plantillas import html_documento_oficial
        from apps.auditoria.reportes import generar_pdf
        import io

        doc = self.get_object()

        destinatarios = request.data.get('destinatarios', [])
        asunto_email  = request.data.get('asunto_email', f'{doc.tipo_documento.nombre} {doc.numero_documento or ""} — {doc.asunto}')
        cuerpo_email  = request.data.get('cuerpo_email', '')
        adjuntar_pdf  = request.data.get('adjuntar_pdf', True)

        if not destinatarios:
            return Response({'detail': 'Debe especificar al menos un destinatario.'}, status=400)

        for email in destinatarios:
            if '@' not in str(email):
                return Response({'detail': f'Dirección inválida: {email}'}, status=400)

        try:
            msg = EmailMessage(
                subject = asunto_email,
                body    = cuerpo_email or f"""
Estimado/a:

Adjunto encontrará el {doc.tipo_documento.nombre} N.° {doc.numero_documento or '(por asignar)'}.

Asunto: {doc.asunto}

Atentamente,
{doc.creado_por.nombre_completo}
{doc.unidad_origen.nombre}
Gobierno Autónomo Descentralizado Provincial de Cotopaxi
                """.strip(),
                from_email = f'SGD GAD Cotopaxi <sgd@cotopaxi.gob.ec>',
                to         = destinatarios,
            )

            if adjuntar_pdf:
                html     = html_documento_oficial(doc)
                pdf_resp = generar_pdf(html, 'temp.pdf')
                pdf_bytes = pdf_resp.content
                filename = f'{doc.numero_documento or f"doc_{doc.id}"}.pdf'.replace('/', '-')
                msg.attach(filename, pdf_bytes, 'application/pdf')

            msg.send(fail_silently=False)

            # Registrar en seguimiento
            from .models import SeguimientoDocumento
            SeguimientoDocumento.objects.create(
                documento   = doc,
                etapa       = 'enviado',
                usuario     = request.user,
                observacion = f'Enviado por email a: {", ".join(destinatarios)}',
            )

            return Response({
                'detail': f'Documento enviado correctamente a {len(destinatarios)} destinatario(s).',
                'destinatarios': destinatarios,
            })

        except Exception as e:
            return Response({'detail': f'Error al enviar el email: {str(e)}'}, status=500)
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
            from django.db.models import Q
            qs = qs.filter(
                Q(documento__asunto__icontains=search) |
                Q(documento__numero_documento__icontains=search)
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

    @action(detail=True, methods=['post'], url_path='agregar_imprimir')
    def agregar_imprimir(self, request, pk=None):
        item = self.get_object()
        BandejaDocumento.objects.get_or_create(
            documento = item.documento,
            usuario   = request.user,
            bandeja   = 'por_imprimir',
        )
        return Response({'detail': 'Documento agregado a la cola de impresión.'})

    @action(detail=True, methods=['post'], url_path='marcar_impreso')
    def marcar_impreso(self, request, pk=None):
        item               = self.get_object()
        item.accion_tomada = 'impreso'
        item.save()
        SeguimientoDocumento.objects.create(
            documento   = item.documento,
            etapa       = 'comentado',
            usuario     = request.user,
            observacion = 'Documento impreso',
        )
        return Response({'detail': 'Marcado como impreso.'})


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

        # Mover la entrada del remitente de en_elaboracion/no_enviados → enviados
        moved = BandejaDocumento.objects.filter(
            documento   = doc,
            usuario     = request.user,
            bandeja__in = ['en_elaboracion', 'no_enviados'],
        ).update(bandeja='enviados', accion_tomada='enviado')
        if not moved:
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
        from .plantillas import html_documento_oficial

        try:
            doc = Documento.objects.select_related(
                'tipo_documento', 'unidad_origen', 'unidad_destino',
                'creado_por', 'firmado_por'
            ).get(pk=pk)
        except Documento.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)

        html     = html_documento_oficial(doc)
        filename = f'{doc.numero_documento or f"doc_{doc.id}"}.pdf'.replace('/', '-')
        return generar_pdf(html, filename)

class AdjuntoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = AdjuntoDocumento.objects.select_related('subido_por')
        doc_id     = self.request.query_params.get('documento')
        tramite_id = self.request.query_params.get('tramite')
        if doc_id:     qs = qs.filter(documento_id=doc_id)
        if tramite_id: qs = qs.filter(tramite_id=tramite_id)
        return qs

    def get_serializer_class(self):
        from .serializers import AdjuntoSerializer
        return AdjuntoSerializer

    def perform_create(self, serializer):
        import hashlib
        import threading
        from .ocr import procesar_adjunto

        archivo    = self.request.FILES.get('archivo')
        nombre     = archivo.name if archivo else 'sin nombre'
        tamanio    = archivo.size if archivo else 0
        mime_type  = archivo.content_type if archivo else ''

        hash_sha256 = ''
        if archivo:
            hasher = hashlib.sha256()
            for chunk in archivo.chunks():
                hasher.update(chunk)
            hash_sha256 = hasher.hexdigest()
            archivo.seek(0)

        origen = self.request.data.get('origen_digitalizacion') or None
        extra  = {}
        if origen:
            extra['origen_digitalizacion'] = origen
            extra['resolucion_ppp']        = self.request.data.get('resolucion_ppp') or None
            extra['formato_archivo']       = self.request.data.get('formato_archivo', '')
            extra['fecha_digitalizacion']  = timezone.now()
            extra['digitalizado_por']      = self.request.user
            extra['numero_folios']         = self.request.data.get('numero_folios') or None
            extra['hoja_testigo']          = self.request.data.get('hoja_testigo') in ('true', 'True', True)
            extra['ubicacion_fisica']      = self.request.data.get('ubicacion_fisica', '')

        adjunto = serializer.save(
            subido_por      = self.request.user,
            nombre          = nombre,
            tamanio         = tamanio,
            mime_type       = mime_type,
            hash_integridad = hash_sha256,
            **extra,
        )

        # Procesar OCR en hilo separado para no bloquear la respuesta
        def procesar_en_background(adjunto_id):
            from .models import AdjuntoDocumento
            try:
                adj = AdjuntoDocumento.objects.get(pk=adjunto_id)
                procesar_adjunto(adj)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f'OCR background error: {e}')

        hilo = threading.Thread(
            target=procesar_en_background,
            args=(adjunto.id,),
            daemon=True,
        )
        hilo.start()

    @action(detail=True, methods=['post'], url_path='control-calidad')
    def control_calidad(self, request, pk=None):
        adjunto = self.get_object()
        resultado = request.data.get('resultado')
        if resultado not in ('aprobado', 'rechazado'):
            return Response({'detail': 'Resultado debe ser aprobado o rechazado.'}, status=400)
        adjunto.calidad_control        = resultado
        adjunto.calidad_observacion    = request.data.get('observacion', '')
        adjunto.calidad_revisado_por   = request.user
        adjunto.calidad_revisado_en    = timezone.now()
        adjunto.save()
        from .serializers import AdjuntoSerializer
        return Response(AdjuntoSerializer(adjunto).data)
    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        from django.db import connection
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 3:
            return Response({'detail': 'La búsqueda debe tener al menos 3 caracteres.'}, status=400)

        documento_id = request.query_params.get('documento')
        tramite_id   = request.query_params.get('tramite')

        with connection.cursor() as cursor:
            filtro_extra = ''
            params = [query, query]
            if documento_id:
                filtro_extra += ' AND a.documento_id = %s'
                params.append(documento_id)
            if tramite_id:
                filtro_extra += ' AND a.tramite_id = %s'
                params.append(tramite_id)

            cursor.execute(f"""
                SELECT
                    a.id,
                    a.nombre,
                    a.mime_type,
                    a.tamanio,
                    a.creado_en,
                    a.documento_id,
                    a.tramite_id,
                    a.ocr_confianza,
                    a.paginas,
                    ts_rank(a.contenido_busqueda, plainto_tsquery('spanish', %s)) AS relevancia,
                    ts_headline(
                        'spanish',
                        a.contenido_texto,
                        plainto_tsquery('spanish', %s),
                        'MaxWords=20, MinWords=10, StartSel=<mark>, StopSel=</mark>'
                    ) AS fragmento
                FROM doc_adjunto a
                WHERE a.contenido_busqueda @@ plainto_tsquery('spanish', %s)
                {filtro_extra}
                ORDER BY relevancia DESC
                LIMIT 50
            """, [query, query] + ([documento_id] if documento_id else []) + ([tramite_id] if tramite_id else []))

            columnas = [col[0] for col in cursor.description]
            resultados = [dict(zip(columnas, fila)) for fila in cursor.fetchall()]

        # Corregir: el query correcto tiene 3 params base
        return Response({
            'query':      query,
            'total':      len(resultados),
            'resultados': resultados,
        })
    @action(detail=True, methods=['get'], url_path='descargar')
    def descargar(self, request, pk=None):
        adjunto = self.get_object()
        try:
            return FileResponse(
                adjunto.archivo.open('rb'),
                as_attachment=True,
                filename=adjunto.nombre,
            )
        except Exception:
            return Response({'detail': 'Archivo no encontrado.'}, status=404)
    
class DigitalizacionMasivaView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        import hashlib
        import threading
        from .ocr import procesar_adjunto
        from apps.archivo.models import Expediente, ExpedienteDocumento

        archivos       = request.FILES.getlist('archivos')
        expediente_id  = request.data.get('expediente_id')
        serie_id       = request.data.get('serie_id')
        anio_doc       = request.data.get('anio_documento')
        origen         = request.data.get('origen_digitalizacion', 'institucional')
        resolucion_ppp = request.data.get('resolucion_ppp', 300)

        if not archivos:
            return Response({'detail': 'No se enviaron archivos.'}, status=400)

        if len(archivos) > 50:
            return Response({'detail': 'Máximo 50 archivos por lote.'}, status=400)

        resultados = []

        for archivo in archivos:
            try:
                hasher = hashlib.sha256()
                for chunk in archivo.chunks():
                    hasher.update(chunk)
                hash_sha256 = hasher.hexdigest()
                archivo.seek(0)

                adjunto = AdjuntoDocumento.objects.create(
                    nombre              = archivo.name,
                    archivo             = archivo,
                    tipo                = 'documento',
                    tamanio             = archivo.size,
                    mime_type           = archivo.content_type,
                    subido_por          = request.user,
                    hash_integridad     = hash_sha256,
                    origen_digitalizacion = origen,
                    resolucion_ppp      = int(resolucion_ppp),
                    fecha_digitalizacion = timezone.now(),
                    digitalizado_por    = request.user,
                    idioma_ocr          = 'spa',
                )

                # Vincular a expediente si se especificó
                if expediente_id:
                    try:
                        exp = Expediente.objects.get(pk=expediente_id)
                        ExpedienteDocumento.objects.create(
                            expediente   = exp,
                            agregado_por = request.user,
                        )
                        exp.num_fojas = exp.documentos.count()
                        exp.save(update_fields=['num_fojas'])
                    except Expediente.DoesNotExist:
                        pass

                resultados.append({
                    'id':     adjunto.id,
                    'nombre': archivo.name,
                    'estado': 'subido',
                    'ocr':    'pendiente',
                })

                # OCR en background
                def ocr_background(adjunto_id):
                    from .models import AdjuntoDocumento as Adj
                    from .ocr import procesar_adjunto as proc
                    try:
                        adj = Adj.objects.get(pk=adjunto_id)
                        proc(adj)
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).error(f'OCR masivo error {adjunto_id}: {e}')

                threading.Thread(
                    target=ocr_background,
                    args=(adjunto.id,),
                    daemon=True,
                ).start()

            except Exception as e:
                resultados.append({
                    'nombre': archivo.name,
                    'estado': 'error',
                    'error':  str(e),
                })

        exitosos = sum(1 for r in resultados if r['estado'] == 'subido')
        return Response({
            'total':     len(archivos),
            'exitosos':  exitosos,
            'errores':   len(archivos) - exitosos,
            'resultados': resultados,
        }, status=201)

    def get(self, request):
        """Estado de procesamiento OCR de adjuntos pendientes."""
        pendientes = AdjuntoDocumento.objects.filter(
            ocr_procesado=False,
            mime_type='application/pdf',
        ).count()
        procesados = AdjuntoDocumento.objects.filter(ocr_procesado=True).count()
        sin_texto  = AdjuntoDocumento.objects.filter(
            ocr_procesado=True,
            contenido_texto='',
        ).count()

        return Response({
            'pendientes': pendientes,
            'procesados': procesados,
            'sin_texto':  sin_texto,
        })


# ─────────────────────────────────────────────────────────
# FirmaEC — integración con la app de firma del gobierno EC
# ─────────────────────────────────────────────────────────

import jwt as pyjwt
import base64
import os as _os

_FIRMAEC_SISTEMA  = _os.environ.get('FIRMAEC_SISTEMA',  'sgdGadCotopaxi')
_FIRMAEC_SECRET   = _os.environ.get('FIRMAEC_SECRET',   'sgd-gad-cotopaxi-firmaec-2026-secreto')
# URL pública que FirmaEC usará para bajar/subir documentos.
# Debe ser accesible desde la PC del firmante (HTTPS recomendado para FirmaEC 5.x).
# Ejemplo: FIRMAEC_BASE_URL=https://sgd.cotopaxi.gob.ec/api/v1/documentos/firmaec
# Si no se configura, se usa la URL del request (funciona en localhost con HTTP).
_FIRMAEC_BASE_URL = _os.environ.get('FIRMAEC_BASE_URL', '')


class GenerarTokenFirmaECView(APIView):
    """Autenticado — genera el URL firmaec:// para abrir la app FirmaEC."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        from datetime import datetime, timedelta

        doc = get_object_or_404(Documento, pk=pk)
        cedula = getattr(request.user, 'cedula', '') or str(request.user.id)

        payload = {
            'cedula':  cedula,
            'sistema': _FIRMAEC_SISTEMA,
            'ids':     str(pk),
            'exp':     datetime.utcnow() + timedelta(minutes=30),
        }
        token = pyjwt.encode(payload, _FIRMAEC_SECRET, algorithm='HS512')

        # Usar FIRMAEC_BASE_URL si está configurada; si no, construir desde el request.
        # NO hacer quote() — FirmaEC espera la URL sin codificar (igual que Quipux).
        if _FIRMAEC_BASE_URL:
            api_url = _FIRMAEC_BASE_URL.rstrip('/')
        else:
            api_url = request.build_absolute_uri('/api/v1/documentos/firmaec')

        firmaec_url = (
            f"firmaec://{_FIRMAEC_SISTEMA}/firmar"
            f"?token={token}"
            f"&tipo_certificado=2"
            f"&llx=222&lly=85&urx=422&ury=49"
            f"&url={api_url}"
        )
        return Response({'firmaec_url': firmaec_url, 'token': token, 'api_url': api_url})


class BajarDocumentoFirmaECView(APIView):
    """
    Sin autenticación JWT — FirmaEC descarga el PDF a firmar.
    GET /api/v1/documentos/firmaec/bajar_documento/?sistema=...&tokenJwt=...
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        token = request.query_params.get('tokenJwt') or request.query_params.get('token')
        if not token:
            return Response({'error': 'Token requerido'}, status=400)
        try:
            payload = pyjwt.decode(token, _FIRMAEC_SECRET, algorithms=['HS512'])
        except pyjwt.ExpiredSignatureError:
            return Response({'error': 'Token expirado'}, status=401)
        except pyjwt.InvalidTokenError:
            return Response({'error': 'Token inválido'}, status=401)

        doc_id = payload.get('ids')
        try:
            doc = Documento.objects.select_related(
                'tipo_documento', 'unidad_origen', 'creado_por', 'firmado_por'
            ).get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'error': 'Documento no encontrado'}, status=404)

        from .plantillas import html_documento_oficial
        from apps.auditoria.reportes import generar_pdf as _generar_pdf
        html = html_documento_oficial(doc)
        pdf_response = _generar_pdf(html, f'{doc.id}.pdf')
        pdf_bytes = pdf_response.content

        # FirmaEC no puede insertar firma digital en PDFs con /ObjStm (object streams
        # comprimidos que genera WeasyPrint). Re-escribir con pypdf produce un PDF
        # con tabla xref clasica que FirmaEC puede procesar.
        try:
            import pypdf as _pypdf
            import io as _io2
            _reader = _pypdf.PdfReader(_io2.BytesIO(pdf_bytes))
            _writer = _pypdf.PdfWriter()
            for _page in _reader.pages:
                _writer.add_page(_page)
            _out = _io2.BytesIO()
            _writer.write(_out)
            pdf_bytes = _out.getvalue()
        except Exception:
            pass  # si falla, enviar PDF original

        doc_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
        return Response({
            'documentos_recibidos': [{
                'id':        str(doc.id),
                'nombre':    f'{doc.numero_documento or f"doc_{doc.id}"}.pdf',
                'documento': doc_b64,
            }]
        })


class GuardarDocumentoFirmaECView(APIView):
    """
    Sin autenticación JWT — FirmaEC envía el PDF firmado.
    POST /api/v1/documentos/firmaec/guardar_documento/
    Body JSON: { tokenJwt, sistema, documentos_firmados: [{id, nombre, documento (b64)}] }
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        token = request.data.get('tokenJwt') or request.data.get('token')
        documentos_firmados = request.data.get('documentos_firmados', [])

        if not token:
            return Response({'error': 'Token requerido'}, status=400)
        try:
            payload = pyjwt.decode(token, _FIRMAEC_SECRET, algorithms=['HS512'])
        except pyjwt.ExpiredSignatureError:
            return Response({'error': 'Token expirado'}, status=401)
        except pyjwt.InvalidTokenError:
            return Response({'error': 'Token inválido'}, status=401)

        doc_id = payload.get('ids')
        cedula = payload.get('cedula', '')

        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'error': 'Documento no encontrado'}, status=404)

        from apps.usuarios.models import Usuario
        from django.core.files.base import ContentFile

        usuario = None
        if cedula:
            try:
                usuario = Usuario.objects.get(cedula=cedula)
            except Usuario.DoesNotExist:
                pass

        for item in documentos_firmados:
            contenido_b64 = item.get('documento') or item.get('contenido', '')
            if not contenido_b64:
                continue
            try:
                pdf_bytes = base64.b64decode(contenido_b64)
            except Exception:
                continue

            nombre_archivo = f'{doc.numero_documento or f"doc_{doc.id}"}_firmado_firmaec.pdf'
            adjunto = AdjuntoDocumento(
                documento  = doc,
                nombre     = nombre_archivo,
                tipo       = 'documento',
                mime_type  = 'application/pdf',
                tamanio    = len(pdf_bytes),
                subido_por = usuario,
                origen_digitalizacion = 'nativo_digital',
            )
            adjunto.archivo.save(nombre_archivo, ContentFile(pdf_bytes))
            adjunto.save()

        doc.estado     = 'firmado'
        doc.fecha_firma = timezone.now()
        doc.firma_bce_info = {
            'metodo':      'firmaec',
            'cedula':      cedula,
            'fecha_firma': timezone.now().isoformat(),
            'firmado_por': usuario.nombre_completo if usuario else cedula,
        }
        if usuario:
            doc.firmado_por = usuario
        doc.save(update_fields=['estado', 'fecha_firma', 'firma_bce_info', 'firmado_por'])

        if usuario:
            SeguimientoDocumento.objects.create(
                documento   = doc,
                etapa       = 'firmado',
                usuario     = usuario,
                observacion = 'Firmado con FirmaEC',
            )
        return Response({'mensaje': 'Documento firmado y guardado correctamente.'})


class FirmaFisicaView(APIView):
    """Autenticado — registra que el documento fue firmado físicamente (papel)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        doc = get_object_or_404(Documento, pk=pk)
        observacion = request.data.get('observacion', 'Firma física manuscrita')

        doc.estado     = 'firmado'
        doc.fecha_firma = timezone.now()
        doc.firmado_por = request.user
        doc.firma_bce_info = {
            'metodo':      'fisica',
            'firmado_por': request.user.nombre_completo,
            'cedula':      request.user.cedula or '',
            'fecha_firma': timezone.now().isoformat(),
            'observacion': observacion,
        }
        doc.save(update_fields=['estado', 'fecha_firma', 'firmado_por', 'firma_bce_info'])

        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'firmado',
            usuario     = request.user,
            observacion = f'Firma física: {observacion}',
        )
        return Response({'detail': 'Documento registrado con firma física.'})