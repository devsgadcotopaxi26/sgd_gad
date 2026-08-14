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
            'creado_por', 'firmado_por', 'remitente',
        )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DocumentoCrearSerializer
        if self.action == 'retrieve':
            return DocumentoDetalleSerializer
        return DocumentoListSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
        doc = serializer.instance
        dest_nombres = getattr(doc, '_dest_nombres_actualizados', None)
        obs = 'Documento modificado'
        if dest_nombres:
            obs += f' — Destinatario(s) actualizados: {", ".join(dest_nombres)}'
        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'elaborado',
            usuario     = self.request.user,
            unidad      = getattr(self.request.user, 'unidad', None),
            observacion = obs,
        )

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

        _estado_a_etapa = {
            'enviado':    'enviado',
            'archivado':  'archivado',
            'firmado':    'firmado',
            'recibido':   'recibido',
            'en_revision': 'elaborado',
            'borrador':   'elaborado',
            'aprobado':   'elaborado',
        }
        etapa = _estado_a_etapa.get(nuevo_estado)
        if etapa:
            SeguimientoDocumento.objects.create(
                documento   = doc,
                etapa       = etapa,
                usuario     = request.user,
                unidad      = getattr(request.user, 'unidad', None),
                observacion = request.data.get('observacion') or f'Estado cambiado a {nuevo_estado}',
            )
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
        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'firmado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = (
                f"Firma electrónica — {info_firma.get('firmado_por', '')} "
                f"({info_firma.get('entidad_cert', 'BCE')})"
            ).strip(),
        )
        return Response({
            'detail': 'Documento firmado correctamente.',
            'firma_bce_info': doc.firma_bce_info,
        })

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        doc = self.get_object()
        if doc.estado == 'enviado':
            return Response({'detail': 'El documento ya fue enviado.'}, status=400)
        doc.estado     = 'enviado'
        doc.fecha_envio = timezone.now()
        doc.save(update_fields=['estado', 'fecha_envio'])
        # Mover bandeja del titular (remitente o creador) a 'enviados'
        titular = doc.remitente or doc.creado_por
        BandejaDocumento.objects.filter(
            documento=doc, usuario=titular, bandeja='en_elaboracion'
        ).update(bandeja='enviados')
        # Si el creador es distinto del titular, también darle visibilidad en 'enviados'
        if doc.creado_por and doc.creado_por != titular:
            BandejaDocumento.objects.get_or_create(
                documento=doc,
                usuario=doc.creado_por,
                defaults={'bandeja': 'enviados'},
            )
            BandejaDocumento.objects.filter(
                documento=doc, usuario=doc.creado_por, bandeja='en_elaboracion'
            ).update(bandeja='enviados')
        # Crear entradas en recibidos para cada destinatario al momento del envío
        dest_names = []
        for d in doc.destinatarios.select_related('usuario').all():
            if d.usuario:
                BandejaDocumento.objects.get_or_create(
                    documento=doc,
                    usuario=d.usuario,
                    bandeja='recibidos',
                    defaults={'es_urgente': doc.prioridad != 'normal'},
                )
                dest_names.append(d.usuario.nombre_completo)
        obs = f'Enviado a: {", ".join(dest_names)}' if dest_names else 'Enviado'
        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'enviado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = obs,
        )
        return Response({'detail': 'Documento enviado correctamente.'})

    @action(detail=True, methods=['post'], url_path='reasignar_a')
    def reasignar_a(self, request, pk=None):
        """
        Reasigna el documento a un usuario diferente (el remitente/DE indicado).
        El documento pasa a la bandeja 'en_elaboracion' del destinatario para que
        él lo firme y envíe. El ítem del creador queda marcado como 'reasignado'.
        """
        doc        = self.get_object()
        usuario_id = request.data.get('usuario_id')
        unidad_id  = request.data.get('unidad_id')

        if not usuario_id:
            return Response({'error': 'usuario_id requerido'}, status=400)

        # Marcar mi ítem como reasignado
        my_item = BandejaDocumento.objects.filter(
            documento=doc, usuario=request.user
        ).first()
        if my_item:
            my_item.accion_tomada = 'reasignado'
            my_item.save()

        # Crear ítem en 'en_elaboracion' del remitente designado
        BandejaDocumento.objects.get_or_create(
            documento  = doc,
            usuario_id = usuario_id,
            bandeja    = 'en_elaboracion',
            defaults={
                'unidad_id':    unidad_id,
                'es_urgente':   my_item.es_urgente if my_item else False,
                'fecha_limite': my_item.fecha_limite if my_item else None,
            },
        )

        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'reasignado',
            usuario     = request.user,
            unidad_id   = unidad_id,
            observacion = f'Reasignado a usuario {usuario_id} para firma y envío',
        )
        return Response({'detail': 'Documento reasignado al remitente designado.'})

    @action(detail=True, methods=['post'], url_path='recuperar')
    def recuperar(self, request, pk=None):
        """
        Permite al creador o remitente recuperar un documento enviado/reasignado
        dentro de los 10 minutos posteriores al envío.
        Elimina el documento de las bandejas de destinatarios y lo regresa a
        'en_elaboracion' del solicitante.
        """
        from django.utils import timezone
        doc = self.get_object()
        VENTANA_MIN = 10

        # Solo creador o remitente designado pueden recuperar
        if doc.creado_por != request.user and doc.remitente != request.user:
            return Response({'error': 'Solo el creador o el remitente puede recuperar este documento.'}, status=403)

        # Buscar el seguimiento de envío o reasignación más reciente
        ultimo = SeguimientoDocumento.objects.filter(
            documento=doc, etapa__in=['enviado', 'reasignado']
        ).order_by('-creado_en').first()

        if not ultimo:
            return Response({'error': 'Este documento no fue enviado por el sistema SGD.'}, status=400)

        elapsed_min = (timezone.now() - ultimo.creado_en).total_seconds() / 60
        if elapsed_min > VENTANA_MIN:
            return Response(
                {'error': f'La ventana de recuperación de {VENTANA_MIN} minutos ya expiró '
                          f'(pasaron {int(elapsed_min)} min).'},
                status=400,
            )

        # Eliminar bandejas de destinatarios (todos excepto el solicitante)
        BandejaDocumento.objects.filter(documento=doc).exclude(usuario=request.user).delete()

        # Restaurar la bandeja del solicitante a en_elaboracion
        mi_item = BandejaDocumento.objects.filter(documento=doc, usuario=request.user).first()
        if mi_item:
            mi_item.bandeja = 'en_elaboracion'
            mi_item.accion_tomada = 'pendiente'
            mi_item.save()
        else:
            BandejaDocumento.objects.create(
                documento=doc, usuario=request.user, bandeja='en_elaboracion'
            )

        # Revertir estado del documento
        doc.estado = 'borrador'
        doc.fecha_envio = None
        doc.save(update_fields=['estado', 'fecha_envio'])

        SeguimientoDocumento.objects.create(
            documento=doc, etapa='recuperado', usuario=request.user,
            unidad=getattr(request.user, 'unidad', None),
            observacion='Documento recuperado para corrección.',
        )
        return Response({'detail': 'Documento recuperado. Ya puede editarlo en "En elaboración".'})

    @action(detail=True, methods=['post'], url_path='eliminar_borrador')
    def eliminar_borrador(self, request, pk=None):
        """
        Envía un borrador (bandeja 'en_elaboracion') a la papelera ('eliminados').
        Permitido para el autor del documento o un administrador.
        """
        doc = self.get_object()
        if request.user.id != doc.creado_por_id and not _es_admin_bandeja(request.user):
            return Response({'detail': 'No tiene permiso para eliminar este borrador.'}, status=403)

        comentario = (request.data.get('comentario') or '').strip()
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        item = BandejaDocumento.objects.filter(documento=doc, usuario_id=doc.creado_por_id).first()
        if not item or item.bandeja != 'en_elaboracion':
            return Response({'detail': 'Solo se pueden eliminar borradores en "En elaboración".'}, status=400)

        item.bandeja       = 'eliminados'
        item.accion_tomada = 'eliminado'
        item.save()

        doc.eliminado_en       = timezone.now()
        doc.eliminado_por      = request.user
        doc.motivo_eliminacion = comentario
        doc.save(update_fields=['eliminado_en', 'eliminado_por', 'motivo_eliminacion'])

        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'eliminado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = comentario,
        )
        return Response({'detail': 'Borrador enviado a la papelera.'})

    @action(detail=True, methods=['post'], url_path='restaurar_eliminado')
    def restaurar_eliminado(self, request, pk=None):
        """
        Restaura un documento desde la papelera ('eliminados') a 'en_elaboracion'.
        Permitido para el autor del documento o un administrador.
        """
        doc = self.get_object()
        if request.user.id != doc.creado_por_id and not _es_admin_bandeja(request.user):
            return Response({'detail': 'No tiene permiso para restaurar este documento.'}, status=403)

        comentario = (request.data.get('comentario') or '').strip()
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        item = BandejaDocumento.objects.filter(documento=doc, usuario_id=doc.creado_por_id).first()
        if not item or item.bandeja != 'eliminados':
            return Response({'detail': 'Este documento no está en la papelera.'}, status=400)

        item.bandeja       = 'en_elaboracion'
        item.accion_tomada = 'pendiente'
        item.save()

        doc.estado             = 'borrador'
        doc.eliminado_en       = None
        doc.eliminado_por      = None
        doc.motivo_eliminacion = ''
        doc.save(update_fields=['estado', 'eliminado_en', 'eliminado_por', 'motivo_eliminacion'])

        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'restaurado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = comentario,
        )
        return Response({'detail': 'Documento restaurado a "En elaboración".'})

    @action(detail=True, methods=['post'], url_path='eliminar_definitivo')
    def eliminar_definitivo(self, request, pk=None):
        """
        Hard-delete definitivo de un borrador en papelera. Solo el autor del
        documento puede ejecutarlo — sin excepción para administradores, y
        sin importar si el autor está activo o inactivo.
        """
        doc = self.get_object()
        if request.user.id != doc.creado_por_id:
            return Response(
                {'detail': 'Solo el autor del documento puede eliminarlo definitivamente.'}, status=403
            )

        comentario = (request.data.get('comentario') or '').strip()
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        item = BandejaDocumento.objects.filter(documento=doc, usuario_id=doc.creado_por_id).first()
        if not item or item.bandeja != 'eliminados':
            return Response(
                {'detail': 'Solo se pueden eliminar definitivamente documentos en la papelera.'}, status=400
            )

        from apps.archivo.models import ExpedienteDocumento
        if ExpedienteDocumento.objects.filter(documento=doc).exists():
            return Response(
                {'detail': 'Este documento está vinculado a un expediente de archivo y no puede eliminarse definitivamente.'},
                status=400,
            )

        # Capturar referencias a los archivos físicos ANTES del borrado en cascada
        # (AdjuntoDocumento.archivo no se elimina del storage automáticamente).
        archivos_a_borrar = [a.archivo for a in doc.archivos_adjuntos.all() if a.archivo]

        doc.delete()  # cascada: Destinatario, FlujoAprobacion, VersionDocumento,
                      # BandejaDocumento, SeguimientoDocumento, Tarea,
                      # DestinatarioExterno, AdjuntoDocumento

        for f in archivos_a_borrar:
            f.delete(save=False)

        return Response({'detail': 'Documento eliminado definitivamente.'})

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
        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'elaborado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = (
                f'Versión {version.numero_version} guardada'
                + (f' — {version.comentario}' if version.comentario else '')
            ),
        )
        return Response(VersionSerializer(version).data)

    @action(detail=True, methods=['get'], url_path='bandeja')
    def bandeja(self, request):
        docs = self.get_queryset().filter(
            destinatarios__usuario=request.user,
            destinatarios__accion_tomada='pendiente',
        ).distinct()
        return Response(DocumentoListSerializer(docs, many=True).data)

def _es_admin_bandeja(user):
    return user.is_superuser or user.roles.filter(
        rol__codigo__in=['ADMIN_GENERAL', 'ADMIN_ARCHIVO'], activo=True
    ).exists()


def _resolver_usuario_bandeja(request):
    """
    Devuelve el usuario cuya bandeja se debe mostrar.
    Admin puede pasar ?usuario_id=N para ver la bandeja de otro usuario.
    """
    usuario_id = request.query_params.get('usuario_id', '').strip()
    if usuario_id and _es_admin_bandeja(request.user):
        from django.contrib.auth import get_user_model
        Usuario = get_user_model()
        try:
            return Usuario.objects.get(id=int(usuario_id))
        except (Usuario.DoesNotExist, ValueError):
            pass
    return request.user


class BandejaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario = _resolver_usuario_bandeja(self.request)
        return BandejaDocumento.objects.filter(
            usuario=usuario
        ).select_related('documento__tipo_documento', 'documento__unidad_origen', 'unidad')

    def get_serializer_class(self):
        from .serializers import BandejaSerializer
        return BandejaSerializer

    @action(detail=False, methods=['get'], url_path='conteos')
    def conteos(self, request):
        usuario = _resolver_usuario_bandeja(request)
        qs = BandejaDocumento.objects.filter(usuario=usuario)
        resultado = {}
        for bandeja, _ in BandejaDocumento.BANDEJA_CHOICES:
            if bandeja == 'en_elaboracion':
                # Excluir reasignados del conteo de en_elaboracion
                sub = qs.filter(bandeja=bandeja).exclude(accion_tomada='reasignado')
            else:
                sub = qs.filter(bandeja=bandeja)
            resultado[bandeja] = {'total': sub.count(), 'no_leidos': sub.filter(leido=False).count()}
        # Bandeja virtual reasignados
        rea = qs.filter(accion_tomada='reasignado')
        resultado['reasignados'] = {'total': rea.count(), 'no_leidos': rea.filter(leido=False).count()}
        return Response(resultado)

    @action(detail=False, methods=['get'], url_path='por_bandeja')
    def por_bandeja(self, request):
        usuario = _resolver_usuario_bandeja(request)
        bandeja = request.query_params.get('bandeja', 'recibidos')
        tipo    = request.query_params.get('tipo', '')
        leido   = request.query_params.get('leido', '')
        search  = request.query_params.get('search', '')

        # 'reasignados' es una bandeja virtual: ítems con accion_tomada=reasignado
        if bandeja == 'reasignados':
            qs = BandejaDocumento.objects.filter(
                usuario=usuario, accion_tomada='reasignado'
            )
        else:
            qs = BandejaDocumento.objects.filter(
                usuario=usuario, bandeja=bandeja
            )
            # En elaboración excluye los ya reasignados (esos aparecen en 'reasignados')
            if bandeja == 'en_elaboracion':
                qs = qs.exclude(accion_tomada='reasignado')

        qs = qs.select_related(
            'documento__tipo_documento',
            'documento__unidad_origen',
            'documento__creado_por',
            'documento__remitente',
        ).prefetch_related(
            'documento__seguimiento_quipux',
        ).order_by('-creado_en')

        if tipo:
            qs = qs.filter(documento__tipo_documento__prefijo_numeracion=tipo)
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

        BandejaDocumento.objects.get_or_create(
            documento  = item.documento,
            usuario_id = usuario_id,
            bandeja    = 'recibidos',
            defaults={
                'unidad_id':     unidad_id,
                'instrucciones': instrucciones,
                'es_urgente':    item.es_urgente,
                'fecha_limite':  item.fecha_limite,
            },
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
        BandejaDocumento.objects.get_or_create(
            documento    = item.documento,
            usuario_id   = request.data.get('usuario_id'),
            bandeja      = 'tareas_recibidas',
            defaults={'instrucciones': request.data.get('descripcion', '')},
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

        from apps.usuarios.models import Usuario as _Usuario
        _dest_nombres = []
        for d in destinatarios_internos:
            try:
                _u = _Usuario.objects.get(pk=d.get('usuario_id'))
                _dest_nombres.append(_u.nombre_completo)
            except Exception:
                pass
        _obs_envio = (
            ('Enviado a: ' + ', '.join(_dest_nombres) if _dest_nombres else 'Enviado')
            + (f' — {instrucciones}' if instrucciones else '')
        )
        SeguimientoDocumento.objects.create(
            documento   = doc,
            etapa       = 'enviado',
            usuario     = request.user,
            unidad      = getattr(request.user, 'unidad', None),
            observacion = _obs_envio,
        )

        return Response({'detail': f'Documento {doc.numero_documento} enviado correctamente.'})

class DocumentoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .plantillas import html_documento_oficial

        try:
            doc = Documento.objects.select_related(
                'tipo_documento', 'unidad_origen', 'unidad_destino',
                'creado_por', 'firmado_por', 'remitente',
            ).prefetch_related(
                'destinatarios__usuario__unidad'
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
# FirmaEC — integración vía FirmaDigital service stack
# ─────────────────────────────────────────────────────────
#
# Flujo:
#  1. SGD llama POST /servicio/documentos → recibe JWT token
#  2. SGD genera deep-link firmaec:// apuntando al API proxy (puerto 8089)
#  3. FirmaEC descarga PDF vía API proxy → usuario firma con P12
#  4. FirmaEC envía PDF firmado al API proxy → servicio llama callback
#  5. Django FirmaECCallbackView recibe el PDF firmado y lo guarda
# ─────────────────────────────────────────────────────────

import base64
import os as _os
import requests as _requests

_FIRMAEC_SISTEMA        = _os.environ.get('FIRMAEC_SISTEMA',       'sgd-gad')
_FIRMAEC_API_KEY        = _os.environ.get('FIRMAEC_API_KEY',       'sgd-gad-firma2026')
_FIRMAEC_CALLBACK_KEY   = _os.environ.get('FIRMAEC_CALLBACK_KEY',  'sgd-gad-callback-2026')
# URL interna del FirmaDigital servicio (dentro de la red Docker)
_FIRMAEC_SERVICIO_URL   = _os.environ.get('FIRMAEC_SERVICIO_URL',  'http://firmadigital_servicio:8080/servicio')
# URL pública del FirmaDigital API proxy — accesible desde la PC del firmante
_FIRMAEC_API_URL        = _os.environ.get('FIRMAEC_API_URL',       'http://localhost:8089/api')


def _pdf_limpio(pdf_bytes: bytes) -> bytes:
    """Convierte PDF de WeasyPrint (con /ObjStm) a xref clásico que FirmaEC puede firmar."""
    try:
        import pypdf as _pypdf
        import io as _io2
        reader = _pypdf.PdfReader(_io2.BytesIO(pdf_bytes))
        writer = _pypdf.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        out = _io2.BytesIO()
        writer.write(out)
        return out.getvalue()
    except Exception:
        return pdf_bytes


class GenerarTokenFirmaECView(APIView):
    """
    Autenticado — genera el URL firmaec:// para abrir la app FirmaEC.
    POST /api/v1/documentos/{id}/firmaec/generar-token/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        from .plantillas import html_documento_oficial
        from apps.auditoria.reportes import generar_pdf as _generar_pdf

        doc = (
            Documento.objects
            .select_related('tipo_documento', 'unidad_origen', 'unidad_destino',
                            'creado_por', 'firmado_por', 'remitente')
            .prefetch_related('destinatarios__usuario__unidad')
            .filter(pk=pk).first()
        )
        if not doc:
            return Response({'error': 'Documento no encontrado.'}, status=404)
        cedula = getattr(request.user, 'cedula', '') or str(request.user.id)

        # 1. Generar PDF limpio (sin /ObjStm); pre_firma=True incluye la leyenda
        #    "Documento firmado electrónicamente" antes de que FirmaEC lo firme
        html      = html_documento_oficial(doc, pre_firma=True)
        pdf_bytes = _pdf_limpio(_generar_pdf(html, f'doc_{doc.id}.pdf').content)
        pdf_b64   = base64.b64encode(pdf_bytes).decode('utf-8')
        nombre    = f'doc_{doc.id}.pdf'

        # 2. Registrar documento en FirmaDigital servicio
        payload = {
            'cedula':    cedula,
            'sistema':   _FIRMAEC_SISTEMA,
            'documentos': [{'nombre': nombre, 'documento': pdf_b64}],
        }
        try:
            resp = _requests.post(
                f'{_FIRMAEC_SERVICIO_URL}/documentos',
                json=payload,
                headers={'X-API-KEY': _FIRMAEC_API_KEY},
                timeout=30,
            )
            resp.raise_for_status()
            token = resp.text.strip()
        except Exception as exc:
            return Response(
                {'error': f'No se pudo registrar documento en FirmaDigital: {exc}'},
                status=502,
            )

        # 3. Generar deep-link para FirmaEC
        # iText 7 Rectangle(x, y, width, height):
        #   llx = x origen (desde borde izq, en pts PDF)
        #   lly = y origen (desde borde inf, en pts PDF)
        #   urx = ANCHO del sello  (no es la coord superior-derecha)
        #   ury = ALTO del sello
        # A4 = 595x842 pts. Sello derecho: 175x65 pts ≈ 6.2x2.3 cm
        firmaec_url = (
            f'firmaec://{_FIRMAEC_SISTEMA}/firmar'
            f'?token={token}'
            f'&tipo_certificado=2'
            f'&llx=360&lly=80&urx=175&ury=65'
            f'&url={_FIRMAEC_API_URL}'
        )
        return Response({'firmaec_url': firmaec_url, 'token': token, 'api_url': _FIRMAEC_API_URL})


class FirmaECCallbackView(APIView):
    """
    Sin autenticación JWT — FirmaDigital servicio llama aquí con el PDF firmado.
    POST /api/v1/documentos/firmaec/callback/
    Header X-API-KEY debe coincidir con FIRMAEC_CALLBACK_KEY.
    Body JSON: {cedula, nombreDocumento, archivo(b64), certificado:[...], firmasValidas, ...}
    Responde "OK" o "ERROR" (texto plano, tal como espera FirmaDigital).
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from django.http import HttpResponse
        from apps.usuarios.models import Usuario
        from django.core.files.base import ContentFile

        api_key = request.headers.get('X-API-KEY', '')
        if api_key != _FIRMAEC_CALLBACK_KEY:
            return HttpResponse('ERROR', content_type='text/plain', status=403)

        cedula           = request.data.get('cedula', '')
        nombre_documento = request.data.get('nombreDocumento', '')
        archivo_b64      = request.data.get('archivo', '')
        certificados     = request.data.get('certificado', [])
        firmas_validas   = request.data.get('firmasValidas', True)
        integridad_doc   = request.data.get('integridadDocumento', True)

        if not archivo_b64:
            return HttpResponse('ERROR', content_type='text/plain', status=400)

        # Validar integridad de la firma reportada por FirmaDigital
        if not firmas_validas or not integridad_doc:
            return HttpResponse('ERROR', content_type='text/plain', status=422)

        # Validar que la cédula del certificado coincida con la cédula registrada
        cert_info = certificados[0] if certificados else {}
        cedula_cert = cert_info.get('cedula', '')
        if cedula_cert and cedula and cedula_cert != cedula:
            # El certificado usado no pertenece al usuario que inició la firma
            return HttpResponse('ERROR', content_type='text/plain', status=403)

        # Extraer doc_id del nombre del archivo: "doc_123.pdf" → 123
        doc_id = None
        try:
            partes = nombre_documento.replace('.pdf', '').split('_')
            doc_id = int(partes[-1])
        except (ValueError, IndexError):
            pass

        if not doc_id:
            return HttpResponse('ERROR', content_type='text/plain', status=400)

        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return HttpResponse('ERROR', content_type='text/plain', status=404)

        try:
            pdf_bytes = base64.b64decode(archivo_b64)
        except Exception:
            return HttpResponse('ERROR', content_type='text/plain', status=400)

        usuario = None
        if cedula:
            try:
                usuario = Usuario.objects.get(cedula=cedula)
            except Usuario.DoesNotExist:
                pass

        # Eliminar versiones firmadas anteriores (re-firma o reintento)
        doc.archivos_adjuntos.filter(tipo='documento').delete()

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

        doc.estado      = 'firmado'
        doc.fecha_firma = timezone.now()
        doc.firma_bce_info = {
            'metodo':       'firmaec',
            'cedula':       cedula,
            'fecha_firma':  timezone.now().isoformat(),
            'firmado_por':  usuario.nombre_completo if usuario else cedula,
            'nombre':       cert_info.get('nombre', ''),
            'apellido':     cert_info.get('apellido', ''),
            'cargo':        cert_info.get('cargo', ''),
            'institucion':  cert_info.get('institucion', ''),
            'entidad_cert': cert_info.get('entidadCertificadora', ''),
            'serial':       cert_info.get('serial', ''),
            'valido_hasta': cert_info.get('validoHasta', ''),
        }
        if usuario:
            doc.firmado_por = usuario
        doc.save(update_fields=['estado', 'fecha_firma', 'firma_bce_info', 'firmado_por'])

        if usuario:
            SeguimientoDocumento.objects.create(
                documento   = doc,
                etapa       = 'firmado',
                usuario     = usuario,
                observacion = 'Firmado con FirmaEC (FirmaDigital)',
            )

        return HttpResponse('OK', content_type='text/plain')


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


class ListaDistribucionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import ListaDistribucion
        qs = ListaDistribucion.objects.filter(activo=True).prefetch_related(
            'miembros__usuario__unidad'
        )
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs

    def get_serializer_class(self):
        from .serializers import ListaDistribucionSerializer
        return ListaDistribucionSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        from .models import ListaDistribucion
        from .serializers import ListaDistribucionSerializer
        search = request.query_params.get('q', '').strip()
        qs = ListaDistribucion.objects.filter(activo=True).prefetch_related(
            'miembros__usuario__unidad'
        )
        if search:
            qs = qs.filter(nombre__icontains=search)
        return Response(ListaDistribucionSerializer(qs[:20], many=True).data)