from django.db import transaction
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
from .servicios import DocumentoInvalidoError, marcar_documento_enviado, validar_documento_minimo, validar_documento_enviable, validar_lista_destinatarios
from .servicios_bandeja import (
    BandejaAccionError, validar_restauracion, aplicar_restauracion,
    validar_reasignacion_bandeja, aplicar_reasignacion_bandeja,
    aplicar_comentario_bandeja, aplicar_marcar_leido_bandeja,
    validar_archivado_bandeja, aplicar_archivado_bandeja,
    validar_desarchivado, aplicar_desarchivado,
    aplicar_informar, aplicar_quitar_informado,
)
from .servicios_tarea import (
    TareaError, crear_tarea, iniciar_tarea, completar_tarea, cancelar_tarea,
)
from .servicios_documento_asoc import (
    AsociacionError, cadena_ascendente, validar_asociacion,
    aplicar_asociacion, aplicar_desasociacion, crear_respuesta,
)
from .acl_documentos import (
    documentos_visibles_para, puede_ver_documento, filtro_visibilidad_documento,
)
from .servicios_carpeta import (
    CarpetaError, crear_carpeta, renombrar_carpeta, mover_carpeta,
    desactivar_carpeta, activar_carpeta,
    arbol_unidad, documentos_de_carpeta, clasificar_documentos, quitar_de_carpeta,
    unidades_visibles, es_admin_carpetas,
)
from .numeracion import NumeracionError
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse, FileResponse
from apps.auditoria.reportes import generar_pdf, html_base
from .serializers import (
    TipoDocumentoSerializer,
    DocumentoListSerializer, DocumentoDetalleSerializer, DocumentoCrearSerializer,
    FlujoSerializer, VersionSerializer,
)


def _es_responsable_actual(user, doc):
    """
    Único responsable actual = quien tiene el documento en su bandeja
    'en_elaboracion' sin haberlo reasignado (BandejaDocumento es la fuente
    real de "quién puede seguir trabajándolo" — no `creado_por`/`remitente`,
    que no cambian al reasignar y por tanto no sirven para esto: tras
    reasignar, el creador original pierde este derecho aunque siga figurando
    como creado_por). Precondición común para editar, guardar, enviar,
    eliminar borrador y reasignar — no para firmar (ver
    `_puede_firmar_documento`: firmar no debe heredar el bypass
    administrativo de esta función).
    """
    if user.is_superuser or user.roles.filter(rol__codigo='ADMIN_GENERAL', activo=True).exists():
        return True
    return BandejaDocumento.objects.filter(
        documento=doc, usuario=user, bandeja='en_elaboracion',
    ).exclude(accion_tomada='reasignado').exists()


def _puede_firmar_documento(user, doc):
    """
    Regla A (responsabilidad) para firmar: el usuario debe seguir siendo el
    responsable actual del documento — misma condición que
    `_es_responsable_actual`, pero SIN el bypass administrativo. Ser
    ADMIN_GENERAL (o superusuario) es una facultad de administración
    técnica del sistema, no una habilitación para firmar documentalmente en
    nombre de otro funcionario — la firma representa legalmente a una
    persona específica. Esta función solo cubre la Regla A; no sustituye
    ninguna Regla B (identidad/competencia real del firmante) — hoy el
    backend no implementa ninguna Regla B propia (auditado: ningún endpoint
    de firma verificaba nada antes de esta corrección), así que por ahora
    esta es la única verificación real del lado servidor para firmar.
    """
    return BandejaDocumento.objects.filter(
        documento=doc, usuario=user, bandeja='en_elaboracion',
    ).exclude(accion_tomada='reasignado').exists()


# ── Enviar a papelera (soft-delete) — operación de dominio única ──────────
# Reutilizada por el endpoint individual (`eliminar_borrador`) y el masivo
# (`enviar_papelera`). NO borra nada físicamente: mueve el ítem de bandeja a
# 'eliminados', marca `Documento.eliminado_*` y deja rastro en seguimiento.
class PapeleraError(Exception):
    """El documento no puede enviarse a la papelera. `code` = HTTP status."""
    def __init__(self, mensaje, code=400):
        super().__init__(mensaje)
        self.code = code


def _validar_envio_papelera(doc, usuario, comentario):
    """Comprueba que `doc` puede ir a la papelera por `usuario`. Devuelve el
    BandejaDocumento a mover. Lanza PapeleraError si no procede."""
    if not (comentario or '').strip():
        raise PapeleraError('El comentario es obligatorio.', 400)
    if doc.eliminado_en:
        raise PapeleraError('El documento ya está en la papelera.', 409)
    if doc.estado == 'anulado':
        raise PapeleraError('Un documento anulado no puede enviarse a la papelera.', 409)
    if not (_es_responsable_actual(usuario, doc) or _es_admin_bandeja(usuario)):
        raise PapeleraError('El documento ya no se encuentra bajo su responsabilidad.', 403)
    item = BandejaDocumento.objects.filter(
        documento=doc, bandeja='en_elaboracion',
    ).exclude(accion_tomada='reasignado').first()
    if not item:
        raise PapeleraError('Solo se pueden enviar a la papelera borradores en "En elaboración".', 409)
    return item


def _aplicar_envio_papelera(doc, item, usuario, comentario):
    """Aplica el soft-delete. Debe llamarse dentro de transaction.atomic().

    Un documento puede tener VARIOS ítems de bandeja activos a la vez (p. ej.
    creado por A con remitente/DE B: ambos tienen un ítem en 'en_elaboracion').
    Se mueven TODOS los ítems activos a 'eliminados' — de lo contrario el
    documento seguiría apareciendo en "En elaboración" de otro usuario. Los
    ítems 'reasignado' se dejan como trazabilidad (la bandeja activa ya los
    oculta por `Documento.eliminado_en`).

    Los ítems de tareas (`tareas_recibidas` / `tareas_enviadas`) NO se tocan:
    la tarea es de otro usuario y su ciclo de vida es independiente; el doc en
    papelera igual queda oculto de esas bandejas por `_excluir_eliminados`, y
    al restaurar reaparece intacto (el ítem nunca cambió de bandeja)."""
    _TAREAS = ('tareas_recibidas', 'tareas_enviadas')
    BandejaDocumento.objects.filter(documento=doc).exclude(
        bandeja__in=('eliminados',) + _TAREAS,
    ).exclude(accion_tomada='reasignado').update(
        bandeja='eliminados', accion_tomada='eliminado',
    )
    doc.eliminado_en       = timezone.now()
    doc.eliminado_por      = usuario
    doc.motivo_eliminacion = comentario.strip()
    doc.save(update_fields=['eliminado_en', 'eliminado_por', 'motivo_eliminacion'])
    SeguimientoDocumento.objects.create(
        documento=doc, etapa='eliminado', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None), observacion=comentario.strip(),
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
        qs = Documento.objects.select_related(
            'tipo_documento', 'unidad_origen', 'unidad_destino',
            'creado_por', 'firmado_por', 'remitente',
        )
        # ── ACL de lectura (fuente única: acl_documentos) ──
        # Un usuario solo ve documentos con los que tiene relación (creador /
        # remitente / firmante / Destinatario de cualquier tipo / documento en
        # alguna de sus bandejas). Admin de bandeja ve todos. Las @actions que
        # además exigen ser responsable actual (`enviar`, `reasignar_a`…)
        # siguen aplicando su propia verificación, más estricta, encima de esto.
        if not _es_admin_bandeja(self.request.user):
            qs = qs.filter(filtro_visibilidad_documento(self.request.user)).distinct()
        if self.action == 'retrieve':
            from django.db.models import Prefetch
            qs = qs.prefetch_related(
                Prefetch('seguimiento_quipux', queryset=SeguimientoDocumento.objects.select_related(
                    'usuario', 'unidad', 'tarea',
                )),
                'destinatarios__usuario', 'destinatarios__unidad',
            )
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return DocumentoCrearSerializer
        if self.action == 'retrieve':
            return DocumentoDetalleSerializer
        return DocumentoListSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        doc = serializer.instance
        if not _es_responsable_actual(self.request.user, doc):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                'Ya no tienes este documento en tu bandeja "En elaboración": '
                'fue reasignado a otro responsable.'
            )
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
        if not _es_responsable_actual(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
        nuevo_estado = request.data.get('estado')
        estados      = [e[0] for e in Documento.ESTADO_CHOICES]
        if nuevo_estado not in estados:
            return Response({'detail': 'Estado inválido.'}, status=400)

        # Oficializar (enviar/firmar) exige "Para" — misma regla que enviar/firma.
        if nuevo_estado in ('enviado', 'firmado') and doc.estado not in ('enviado', 'recibido', 'archivado', 'firmado'):
            try:
                validar_documento_enviable(doc)
            except DocumentoInvalidoError as e:
                return Response({'detail': str(e)}, status=400)

        # FASE 0A — Si esta transición oficializa el documento (-> enviado)
        # desde un estado no oficial, congelar el PDF antes de guardar el
        # nuevo estado. Idempotente; respeta un PDF firmado preexistente.
        if nuevo_estado in ('enviado', 'firmado') and doc.estado not in ('enviado', 'recibido', 'archivado', 'firmado'):
            from .pdf_oficial import congelar_pdf_oficial_seguro
            from .numeracion import asignar_numero_definitivo
            with transaction.atomic():
                asignar_numero_definitivo(doc)
                with congelar_pdf_oficial_seguro(doc, request.user, motivo='cambiar_estado'):
                    doc.estado = nuevo_estado
                    if nuevo_estado == 'enviado' and not doc.fecha_envio:
                        doc.fecha_envio = timezone.now()
                    doc.save()
        else:
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
        if not _es_responsable_actual(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
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
        if not _puede_firmar_documento(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
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
        # FASE 0A — El flujo P12 en navegador sube el PDF firmado como adjunto
        # tipo='documento' ANTES de llamar aquí, así que esto normalmente es
        # un no-op. Se deja como red de seguridad: si por algún motivo no hay
        # artefacto, se congela el render actual (con `firma_bce_info` ya
        # asignado en memoria → refleja la firma). No sustituye un PDF firmado.
        from .pdf_oficial import congelar_pdf_oficial_seguro
        from .numeracion import asignar_numero_definitivo
        with transaction.atomic():
            asignar_numero_definitivo(doc)
            doc.save(update_fields=['firma_bce_info', 'estado', 'fecha_firma', 'firmado_por'])
            with congelar_pdf_oficial_seguro(doc, request.user, motivo='registrar_firma'):
                pass
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
        # Estado incompatible (ya oficializado) → 409, ANTES de evaluar
        # responsabilidad: reenviar un documento ya enviado no es "falta de
        # permiso" (403) sino un conflicto con el estado actual del recurso.
        if doc.estado in ('enviado', 'recibido', 'archivado'):
            return Response({'detail': 'El documento ya fue enviado.'}, status=409)
        if not _es_responsable_actual(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
        try:
            with transaction.atomic():
                # NUMERACIÓN — Asignar el número DEFINITIVO (consume la
                # secuencia oficial de la unidad/tipo) antes de congelar el
                # PDF, para que el artefacto congelado lleve el número final
                # y no el provisional "…-TEMP". Idempotente si ya es definitivo.
                from .numeracion import asignar_numero_definitivo
                asignar_numero_definitivo(doc)

                # FASE 0A — Congelar el PDF oficial ANTES de cambiar el estado,
                # con limpieza garantizada del archivo físico si algo del resto
                # de este bloque (bandejas, seguimiento, marcar_documento_enviado)
                # falla después (§0A.1 Parte B — FileSystemStorage no participa
                # del rollback SQL). Idempotente: si ya existe el PDF (p. ej.
                # firmado), no lo toca y no crea nada que limpiar.
                from .pdf_oficial import congelar_pdf_oficial_seguro
                from contextlib import nullcontext
                cm = (
                    congelar_pdf_oficial_seguro(doc, request.user, motivo='envio')
                    if doc.estado != 'enviado' else nullcontext(None)
                )
                with cm as adj_oficial:
                    # Regla única BORRADOR -> ENVIADO: no repetido, tipo, asunto
                    # y >=1 destinatario. Si falla, la excepción revierte
                    # cualquier escritura hecha en este bloque (incluido el
                    # archivo recién escrito, vía congelar_pdf_oficial_seguro).
                    marcar_documento_enviado(doc)

                    # Mover bandeja del titular (remitente o creador) a 'enviados'
                    titular = doc.remitente or doc.creado_por
                    BandejaDocumento.objects.filter(
                        documento=doc, usuario=titular, bandeja__in=['en_elaboracion', 'no_enviados'],
                    ).update(bandeja='enviados')
                    # Si el creador es distinto del titular, también darle visibilidad en 'enviados'
                    if doc.creado_por and doc.creado_por != titular:
                        BandejaDocumento.objects.get_or_create(
                            documento=doc,
                            usuario=doc.creado_por,
                            defaults={'bandeja': 'enviados'},
                        )
                        BandejaDocumento.objects.filter(
                            documento=doc, usuario=doc.creado_por, bandeja__in=['en_elaboracion', 'no_enviados'],
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
                    if adj_oficial is not None:
                        obs += (
                            f' · PDF oficial congelado '
                            f'({adj_oficial.hash_integridad[:12]}, {adj_oficial.tamanio} bytes)'
                        )
                    SeguimientoDocumento.objects.create(
                        documento   = doc,
                        etapa       = 'enviado',
                        usuario     = request.user,
                        unidad      = getattr(request.user, 'unidad', None),
                        observacion = obs,
                    )
        except DocumentoInvalidoError as e:
            return Response({'detail': str(e)}, status=400)
        except NumeracionError as e:
            return Response({'detail': str(e)}, status=409)
        return Response({'detail': 'Documento enviado correctamente.'})

    @action(detail=True, methods=['post'], url_path='reasignar_a')
    def reasignar_a(self, request, pk=None):
        """
        Transfiere la responsabilidad de elaboración del documento a otro
        usuario (el remitente/DE indicado) — mismo Documento.id, sin crear
        copias. El documento pasa a la bandeja 'en_elaboracion' del
        destinatario para que él lo firme y envíe; el ítem de quien reasigna
        queda marcado como 'reasignado' (deja de poder editarlo, ver
        `_es_responsable_actual` / `perform_update`) y pasa a mostrarse en
        su bandeja virtual 'reasignados' — nunca dos responsables activos a
        la vez. NO modifica `Documento.remitente` (el "De" del documento):
        reasignar responsabilidad y cambiar remitente son operaciones
        distintas.
        """
        doc        = self.get_object()
        usuario_id = request.data.get('usuario_id')
        unidad_id  = request.data.get('unidad_id')

        if not usuario_id:
            return Response({'error': 'usuario_id requerido'}, status=400)

        if not _es_responsable_actual(request.user, doc):
            return Response(
                {'error': 'Ya no eres responsable de este documento: fue reasignado a otro usuario.'},
                status=403,
            )

        from apps.usuarios.models import Usuario
        try:
            destino = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario destino no existe.'}, status=400)

        with transaction.atomic():
            # Marcar mi ítem como reasignado — deja de estar en 'en_elaboracion'
            # activo (aunque el campo `bandeja` no cambie), pasa a "reasignados".
            my_item = BandejaDocumento.objects.filter(
                documento=doc, usuario=request.user
            ).first()
            if my_item:
                my_item.accion_tomada = 'reasignado'
                my_item.save()

            # Crear ítem en 'en_elaboracion' del remitente designado — único
            # responsable activo a partir de ahora.
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
                observacion = f'Reasignado a {destino.nombre_completo} para firma y envío',
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

        # FASE 0A — El documento vuelve a borrador: deja de estar oficializado,
        # así que su PDF congelado deja de aplicar (se regenerará al volver a
        # enviarlo tras la corrección). `descongelar_pdf_oficial` NO borra nada
        # si el documento tiene firma registrada.
        from .pdf_oficial import descongelar_pdf_oficial
        descongelar_pdf_oficial(doc)

        SeguimientoDocumento.objects.create(
            documento=doc, etapa='recuperado', usuario=request.user,
            unidad=getattr(request.user, 'unidad', None),
            observacion='Documento recuperado para corrección.',
        )
        return Response({'detail': 'Documento recuperado. Ya puede editarlo en "En elaboración".'})

    @action(detail=True, methods=['post'], url_path='eliminar_borrador')
    def eliminar_borrador(self, request, pk=None):
        """
        Envía un borrador ('en_elaboracion') a la papelera ('eliminados') —
        soft-delete. Responsable actual o admin de archivo; NO para quien ya
        lo reasignó. Misma operación de dominio que `enviar_papelera` (masivo).
        """
        doc = self.get_object()
        comentario = request.data.get('comentario') or ''
        try:
            item = _validar_envio_papelera(doc, request.user, comentario)
            with transaction.atomic():
                _aplicar_envio_papelera(doc, item, request.user, comentario)
        except PapeleraError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Borrador enviado a la papelera.'})

    @action(detail=False, methods=['post'], url_path='enviar_papelera')
    def enviar_papelera(self, request):
        """
        Envío MASIVO a la papelera desde la selección de "En elaboración".
        Body: {documentos: [ids], comentario}. Todo-o-nada (§10): si algún
        documento no puede moverse, se informa cuáles y NO se aplica ninguno.
        """
        ids = request.data.get('documentos') or []
        comentario = request.data.get('comentario') or ''
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if not (comentario or '').strip():
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        docs = {d.id: d for d in Documento.objects.filter(pk__in=ids)}
        validos, errores = [], []
        for did in ids:
            doc = docs.get(did)
            if doc is None:
                errores.append({'documento_id': did, 'detalle': 'Documento no encontrado.'})
                continue
            try:
                item = _validar_envio_papelera(doc, request.user, comentario)
                validos.append((doc, item))
            except PapeleraError as e:
                errores.append({'documento_id': did, 'detalle': str(e)})

        if errores:
            return Response({
                'detail': 'Ningún documento fue movido: algunos no pueden enviarse a la papelera.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for doc, item in validos:
                _aplicar_envio_papelera(doc, item, request.user, comentario)

        n = len(validos)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} enviado{"s" if n != 1 else ""} a la papelera.',
            'movidos': [doc.id for doc, _ in validos],
        })

    @action(detail=True, methods=['post'], url_path='restaurar_eliminado')
    def restaurar_eliminado(self, request, pk=None):
        """
        Restaura un documento desde la papelera ('eliminados') a 'en_elaboracion'.
        Permitido para quien tiene el documento en SU papelera, o un
        administrador. (Un documento eliminado no tiene "responsable
        actual" en el sentido de `_es_responsable_actual` — ya no está en
        en_elaboracion de nadie — por eso aquí se verifica sobre el ítem de
        papelera real, no sobre `creado_por`, que puede no coincidir si
        quien lo eliminó fue un responsable posterior a una reasignación.)
        """
        doc = self.get_object()
        comentario = (request.data.get('comentario') or '').strip()
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)
        try:
            items = validar_restauracion(
                doc, request.user, es_admin_bandeja=_es_admin_bandeja(request.user),
            )
            with transaction.atomic():
                aplicar_restauracion(doc, request.user, comentario, items=items)
        except BandejaAccionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Documento restaurado a "En elaboración".'})

    @action(detail=False, methods=['post'], url_path='restaurar_eliminados')
    def restaurar_eliminados(self, request):
        """
        Restauración MASIVA desde la papelera desde la selección de "Eliminados".
        Body: {documentos: [ids], comentario}. Todo-o-nada (igual que
        `enviar_papelera`): si algún documento no puede restaurarse se informa
        cuáles y NO se aplica ninguno. Reutiliza EXACTAMENTE la misma lógica de
        dominio que la acción individual (`validar_restauracion` /
        `aplicar_restauracion`).
        """
        ids = request.data.get('documentos') or []
        comentario = (request.data.get('comentario') or '').strip()
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        es_admin = _es_admin_bandeja(request.user)
        docs = {d.id: d for d in Documento.objects.filter(pk__in=ids)}
        validos, errores = [], []
        for did in ids:
            doc = docs.get(did)
            if doc is None:
                errores.append({'documento_id': did, 'detalle': 'Documento no encontrado.'})
                continue
            try:
                items = validar_restauracion(doc, request.user, es_admin_bandeja=es_admin)
                validos.append((doc, items))
            except BandejaAccionError as e:
                errores.append({'documento_id': did, 'detalle': str(e)})

        if errores:
            return Response({
                'detail': 'Ningún documento fue restaurado: algunos ya no cumplen las condiciones actuales de restauración.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for doc, items in validos:
                aplicar_restauracion(doc, request.user, comentario, items=items)

        n = len(validos)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} restaurado{"s" if n != 1 else ""} a "En elaboración".',
            'restaurados': [doc.id for doc, _ in validos],
        })

    @action(detail=True, methods=['post'], url_path='informar')
    def informar(self, request, pk=None):
        """
        Pone el documento EN CONOCIMIENTO de otros usuarios (acción "Informar").
        Body: {usuarios: [ids], comentario?}. NO cambia responsable, NO saca el
        documento de la bandeja del emisor. Idempotente: quien ya estaba
        informado no genera un registro nuevo.
        """
        doc = self.get_object()
        usuario_ids = request.data.get('usuarios') or []
        comentario  = request.data.get('comentario', '')
        if not isinstance(usuario_ids, list) or not usuario_ids:
            return Response({'detail': 'Debe indicar al menos un usuario a informar.'}, status=400)
        if not _puede_informar(request.user, doc):
            return Response({'detail': 'No tiene acceso a este documento para informarlo.'}, status=403)
        with transaction.atomic():
            nuevos, ya = aplicar_informar(doc, request.user, usuario_ids, comentario)
        det = f'Documento puesto en conocimiento de {len(nuevos)} usuario(s).'
        if ya:
            det += f' {len(ya)} ya estaba(n) informado(s).'
        return Response({'detail': det, 'informados': nuevos, 'ya_informados': ya})

    @action(detail=False, methods=['post'], url_path='informar_lote')
    def informar_lote(self, request):
        """
        Informar MASIVO: los MISMOS usuarios y comentario sobre todos los
        documentos seleccionados. Body: {documentos:[ids], usuarios:[ids],
        comentario?}. TODO-O-NADA sobre existencia/acceso; IDEMPOTENTE al
        aplicar (no duplica relaciones de conocimiento ya existentes).
        Seguimiento individual por documento.
        """
        ids         = request.data.get('documentos') or []
        usuario_ids = request.data.get('usuarios') or []
        comentario  = request.data.get('comentario', '')
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if not isinstance(usuario_ids, list) or not usuario_ids:
            return Response({'detail': 'Debe indicar al menos un usuario a informar.'}, status=400)

        docs = {d.id: d for d in Documento.objects.filter(pk__in=ids)}
        validos, errores = [], []
        for did in ids:
            doc = docs.get(did)
            if doc is None:
                errores.append({'documento_id': did, 'detalle': 'Documento no encontrado.'})
            elif not _puede_informar(request.user, doc):
                errores.append({'documento_id': did, 'detalle': 'No tiene acceso a este documento.'})
            else:
                validos.append(doc)
        if errores:
            return Response({
                'detail': 'Ningún documento fue informado: hay documentos sin acceso o inexistentes.',
                'errores': errores,
            }, status=409)

        resumen, total_nuevos = [], 0
        with transaction.atomic():
            for doc in validos:
                nuevos, ya = aplicar_informar(doc, request.user, usuario_ids, comentario)
                total_nuevos += len(nuevos)
                resumen.append({'documento_id': doc.id, 'informados': nuevos, 'ya_informados': ya})

        return Response({
            'detail': f'{len(validos)} documento(s) puestos en conocimiento; '
                      f'{total_nuevos} relación(es) de conocimiento nueva(s).',
            'resumen': resumen,
        })

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

        # No se filtra por usuario_id: la verificación de arriba ya exige
        # ser el autor; solo falta confirmar que el documento sigue en
        # papelera (el ítem puede pertenecer a otro usuario si quien lo
        # eliminó fue un responsable posterior a una reasignación).
        item = BandejaDocumento.objects.filter(documento=doc, bandeja='eliminados').first()
        if not item:
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

    # ── Documentos asociados (antecedente ↔ consecuente) ──────────────────
    @action(detail=True, methods=['post'], url_path='responder')
    def responder(self, request, pk=None):
        """
        Crea un borrador que RESPONDE a este documento. El borrador nace con
        `responde_a` = este documento (asociación automática). `a_todos=true`
        precarga también a los demás destinatarios principales — sigue siendo
        UN solo Documento.
        """
        original = self.get_object()
        tipo_id  = request.data.get('tipo_documento_id')
        tipo = None
        if tipo_id:
            tipo = TipoDocumento.objects.filter(pk=tipo_id).first()
            if tipo is None:
                return Response({'detail': 'Tipo de documento no encontrado.'}, status=404)
        else:
            tipo = original.tipo_documento
        try:
            with transaction.atomic():
                doc, sin_dest = crear_respuesta(
                    original, request.user,
                    asunto=request.data.get('asunto') or f'RE: {original.asunto}',
                    tipo_documento=tipo,
                    cuerpo=request.data.get('cuerpo', ''),
                    a_todos=bool(request.data.get('a_todos')),
                )
        except AsociacionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({
            'detail': 'Borrador de respuesta creado en "En elaboración".',
            'documento_id': doc.id, 'numero': doc.numero_documento,
            'sin_destinatario_auto': sin_dest,
        }, status=201)

    def _puede_editar_asociacion(self, request, doc):
        # `asociar`/`desasociar` modifican metadata relacional (`responde_a`),
        # NO contenido firmado / PDF / numeración / destinatarios. Autorizado:
        # el responsable actual (típicamente su borrador en elaboración) o un
        # admin de bandeja (corrección de metadata de un documento ya enviado).
        # Cualquier otro rol (p. ej. un receptor de un documento enviado) es
        # DECISIÓN DE NEGOCIO PENDIENTE — no habilitado por ahora.
        return _es_responsable_actual(request.user, doc) or _es_admin_bandeja(request.user)

    @action(detail=True, methods=['post'], url_path='asociar')
    def asociar(self, request, pk=None):
        """Fija manualmente el antecedente de este documento. Body: {antecedente_id, observacion?}."""
        doc = self.get_object()
        if not self._puede_editar_asociacion(request, doc):
            return Response({'detail': 'No tiene permiso para modificar la asociación de este documento.'}, status=403)
        ant_id = request.data.get('antecedente_id')
        # El antecedente debe ser VISIBLE para el usuario (no se puede asociar a
        # un documento que no puede consultar).
        antecedente = (documentos_visibles_para(request.user).filter(pk=ant_id).first()
                       if ant_id else None)
        if ant_id and antecedente is None:
            return Response({'detail': 'El documento antecedente no existe o no tiene acceso a él.'}, status=404)
        try:
            validar_asociacion(doc, antecedente)
            with transaction.atomic():
                aplicar_asociacion(doc, antecedente, request.user, request.data.get('observacion', ''))
        except AsociacionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Documento asociado.'})

    @action(detail=True, methods=['post'], url_path='desasociar')
    def desasociar(self, request, pk=None):
        doc = self.get_object()
        if not self._puede_editar_asociacion(request, doc):
            return Response({'detail': 'No tiene permiso para modificar la asociación de este documento.'}, status=403)
        try:
            with transaction.atomic():
                aplicar_desasociacion(doc, request.user, request.data.get('observacion', ''))
        except AsociacionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Asociación retirada.'})

    @action(detail=True, methods=['get'], url_path='asociados')
    def asociados(self, request, pk=None):
        """
        Árbol/cadena documental de este documento:
          - `cadena`: [raíz … antecedente, actual] (de más antiguo a este)
          - `consecuentes`: respuestas directas de este documento
        Nodos a los que el usuario NO tiene acceso se devuelven como
        `{id, restringido: true}` SIN metadatos (§5) — el árbol conserva su
        estructura. Estar asociado NUNCA concede acceso (§4/§13).
        """
        doc = self.get_object()
        es_admin = _es_admin_bandeja(request.user)
        cadena = cadena_ascendente(doc)
        consecuentes = list(doc.respuestas.select_related('tipo_documento').order_by('creado_en'))
        nodo_ids = {d.id for d in cadena} | {d.id for d in consecuentes}
        visibles = nodo_ids if es_admin else set(
            documentos_visibles_para(request.user, False).filter(pk__in=nodo_ids).values_list('pk', flat=True)
        )

        def _mini(d):
            if d.id not in visibles:
                return {'id': d.id, 'restringido': True, 'es_actual': d.id == doc.id}
            return {
                'id': d.id,
                'numero_documento': d.numero_documento,
                'tipo': d.tipo_documento.prefijo_numeracion if d.tipo_documento_id else None,
                'asunto': d.asunto,
                'fecha': d.fecha_elaboracion,
                'estado': d.estado,
                'es_actual': d.id == doc.id,
                'restringido': False,
            }

        return Response({
            'cadena': [_mini(d) for d in cadena],
            'consecuentes': [_mini(d) for d in consecuentes],
        })

    @action(detail=False, methods=['get'], url_path='asociables')
    def asociables(self, request):
        """
        Búsqueda ACOTADA para asociar manualmente: solo documentos con los que
        el usuario tiene relación (o cualquiera si es admin de bandeja) — §16,
        no permite enumerar documentos ajenos. Params: ?q= (número o asunto),
        ?excluir= (id del documento que se está asociando).
        """
        q       = (request.query_params.get('q') or '').strip()
        excluir = request.query_params.get('excluir')
        base = documentos_visibles_para(request.user, _es_admin_bandeja(request.user))
        if excluir:
            base = base.exclude(pk=excluir)
        if q:
            from django.db.models import Q
            base = base.filter(Q(numero_documento__icontains=q) | Q(asunto__icontains=q))
        base = base.select_related('tipo_documento').order_by('-creado_en')[:20]
        return Response([{
            'id': d.id,
            'numero_documento': d.numero_documento,
            'tipo': d.tipo_documento.prefijo_numeracion if d.tipo_documento_id else None,
            'asunto': d.asunto,
            'fecha': d.fecha_elaboracion,
            'estado': d.estado,
        } for d in base])

    # ── Carpetas Virtuales (clasificación operativa por Unidad) ───────────
    @action(detail=False, methods=['post'], url_path='clasificar_carpeta')
    def clasificar_carpeta(self, request):
        """
        Clasifica una selección de documentos EN LA MISMA carpeta (individual
        o masivo). TODO-O-NADA. Idempotente: un documento ya en esa carpeta
        cuenta como `sin_cambio`. Reclasificar = UPDATE de la fila existente.
        Body: {documentos: [ids], carpeta_id}.
        NO modifica documento / estado / bandeja / responsable / destinatarios.
        """
        try:
            res = clasificar_documentos(
                request.user,
                documento_ids=request.data.get('documentos') or [],
                carpeta_id=request.data.get('carpeta_id'),
            )
        except CarpetaError as e:
            payload = {'detail': str(e)}
            if getattr(e, 'errores', None):
                payload['errores'] = e.errores
            return Response(payload, status=e.code)
        n = len(res['clasificados']) + len(res['reclasificados'])
        return Response({
            'detail': f'{n} documento(s) clasificado(s); {len(res["sin_cambio"])} sin cambio.',
            **res,
        })

    @action(detail=True, methods=['post'], url_path='quitar_de_carpeta')
    def quitar_de_carpeta(self, request, pk=None):
        """Retira la clasificación de carpeta de este documento para la unidad
        del usuario (o `unidad_id` si es admin). No toca el documento ni la
        clasificación de otras unidades."""
        doc = self.get_object()
        try:
            quitar_de_carpeta(request.user, doc, unidad_id=request.data.get('unidad_id'))
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Documento retirado de la carpeta.'})

    @action(detail=True, methods=['get'], url_path='carpeta')
    def carpeta_actual(self, request, pk=None):
        """Devuelve la clasificación de carpeta de este documento para la
        unidad del usuario (o `?unidad=`): `{carpeta_id, ruta}` o `null`."""
        doc = self.get_object()
        from .models import DocumentoCarpetaVirtual
        uid = request.query_params.get('unidad') or getattr(request.user, 'unidad_id', None)
        rel = (DocumentoCarpetaVirtual.objects.filter(documento=doc, unidad_id=uid)
               .select_related('carpeta').first())
        if rel is None:
            return Response(None)
        return Response({'carpeta_id': rel.carpeta_id, 'ruta': rel.carpeta.ruta(),
                         'asignado_en': rel.asignado_en})

    @action(detail=True, methods=['post'], url_path='enviar_email')
    def enviar_email(self, request, pk=None):
        from django.core.mail import EmailMessage

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
                # FASE 0A — adjuntar el PDF oficial congelado si existe (mismo
                # artefacto que sirve GET /pdf/); si no, render dinámico.
                from .pdf_oficial import obtener_pdf_oficial_bytes
                pdf_bytes = obtener_pdf_oficial_bytes(doc)
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
        if not _es_responsable_actual(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
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
    # A diferencia de mis_permisos().es_admin, esto NO es "administrador
    # general" sino "puede consultar la bandeja de otro funcionario por
    # responsabilidad documental" — RESPONSABLE_ARCHIVO conserva este acceso.
    return user.is_superuser or user.roles.filter(
        rol__codigo__in=['ADMIN_GENERAL', 'RESPONSABLE_ARCHIVO'], activo=True
    ).exists()


def _puede_informar(user, doc):
    """Puede poner un documento en conocimiento de otros quien participa del
    documento (lo tiene en alguna de sus bandejas) o un admin de bandeja."""
    return _es_admin_bandeja(user) or BandejaDocumento.objects.filter(
        documento=doc, usuario=user,
    ).exists()


def _items_de_bandeja(usuario, ids, bandeja):
    """
    Resuelve {documento_id: BandejaDocumento} para una acción de lote sobre
    `bandeja`. Maneja la bandeja VIRTUAL 'reasignados' (ítems con
    accion_tomada='reasignado', físicamente en 'en_elaboracion').
    """
    qs = BandejaDocumento.objects.filter(documento_id__in=ids, usuario=usuario)
    if bandeja == 'reasignados':
        qs = qs.filter(accion_tomada='reasignado')
    else:
        qs = qs.filter(bandeja=bandeja)
    return {b.documento_id: b for b in qs.select_related('documento', 'usuario')}


def _excluir_eliminados(qs, bandeja):
    """Fuente de verdad del soft-delete = `Documento.eliminado_en`. Toda
    bandeja ACTIVA excluye sistemáticamente los documentos en papelera; la
    bandeja 'eliminados' es justamente la que los muestra."""
    if bandeja == 'eliminados':
        return qs
    return qs.filter(documento__eliminado_en__isnull=True)


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
            sub = _excluir_eliminados(qs.filter(bandeja=bandeja), bandeja)
            if bandeja == 'en_elaboracion':
                # Excluir reasignados del conteo de en_elaboracion
                sub = sub.exclude(accion_tomada='reasignado')
            resultado[bandeja] = {'total': sub.count(), 'no_leidos': sub.filter(leido=False).count()}
        # Bandeja virtual reasignados — también excluye documentos en papelera
        rea = qs.filter(accion_tomada='reasignado').filter(documento__eliminado_en__isnull=True)
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

        # Fuente de verdad del soft-delete: toda bandeja activa oculta los
        # documentos en papelera (solo 'eliminados' los muestra).
        qs = _excluir_eliminados(qs, bandeja)

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
        aplicar_marcar_leido_bandeja(item)
        return Response({'detail': 'Marcado como leído.'})

    @action(detail=False, methods=['post'], url_path='marcar_leido_lote')
    def marcar_leido_lote(self, request):
        """
        Marca leídos varios ítems de una bandeja. Body: {documentos:[ids], bandeja}.
        Acción neutra e idempotente: TODO-O-NADA (el único rechazo posible es
        que algún documento no esté en esa bandeja del usuario — condición de
        integridad de la solicitud, no una regla de negocio).
        """
        ids     = request.data.get('documentos') or []
        bandeja = request.data.get('bandeja') or 'recibidos'
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)

        usuario_bandeja = _resolver_usuario_bandeja(request)
        items_por_id = _items_de_bandeja(usuario_bandeja, ids, bandeja)
        errores = [
            {'documento_id': did, 'detalle': 'El documento no está en esta bandeja.'}
            for did in ids if did not in items_por_id
        ]
        if errores:
            return Response({
                'detail': 'No se marcó ningún documento: algunos no están en esta bandeja.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for did in ids:
                aplicar_marcar_leido_bandeja(items_por_id[did])

        n = len(ids)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} marcado{"s" if n != 1 else ""} como leído.',
            'leidos': list(ids),
        })

    @action(detail=True, methods=['post'], url_path='quitar_informado')
    def quitar_informado(self, request, pk=None):
        """
        Retira ESTA copia de conocimiento de la bandeja Informados del usuario.
        NO elimina el Documento institucional ni afecta a otros informados o al
        emisor. (Es lo que en QUIPUX hacía "Eliminar" dentro de Informados.)
        """
        item = self.get_object()
        if item.bandeja != 'informados':
            return Response({'detail': 'Esta acción solo aplica a la bandeja Informados.'}, status=400)
        with transaction.atomic():
            aplicar_quitar_informado(item)
        return Response({'detail': 'Documento retirado de tu bandeja Informados.'})

    @action(detail=False, methods=['post'], url_path='quitar_informados')
    def quitar_informados(self, request):
        """Retira varias copias de conocimiento de la bandeja Informados del
        usuario. Body: {documentos:[ids]}. TODO-O-NADA. NO borra documentos."""
        ids = request.data.get('documentos') or []
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        usuario_bandeja = _resolver_usuario_bandeja(request)
        items = {
            b.documento_id: b for b in BandejaDocumento.objects.filter(
                documento_id__in=ids, usuario=usuario_bandeja, bandeja='informados',
            ).select_related('documento', 'usuario')
        }
        errores = [
            {'documento_id': did, 'detalle': 'No está en tu bandeja Informados.'}
            for did in ids if did not in items
        ]
        if errores:
            return Response({
                'detail': 'No se retiró ningún documento: algunos no están en tu bandeja Informados.',
                'errores': errores,
            }, status=409)
        with transaction.atomic():
            for did in ids:
                aplicar_quitar_informado(items[did])
        n = len(ids)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} retirado{"s" if n != 1 else ""} de Informados.',
            'retirados': list(ids),
        })

    @action(detail=True, methods=['post'], url_path='reasignar')
    def reasignar(self, request, pk=None):
        item         = self.get_object()
        usuario_id   = request.data.get('usuario_id')
        unidad_id    = request.data.get('unidad_id')
        instrucciones = request.data.get('instrucciones', '')
        with transaction.atomic():
            aplicar_reasignacion_bandeja(item, request.user, usuario_id, unidad_id, instrucciones)
        return Response({'detail': 'Documento reasignado.'})

    @action(detail=False, methods=['post'], url_path='reasignar_lote')
    def reasignar_lote(self, request):
        """
        Reasignación MASIVA desde la selección de una bandeja. Body:
        {documentos: [ids], bandeja, usuario_id, unidad_id?, instrucciones?}.
        TODO-O-NADA: se validan TODOS los documentos primero; si alguno no
        puede reasignarse, NO se reasigna ninguno y se devuelve el detalle de
        los incompatibles. Reutiliza la MISMA lógica de dominio que la acción
        individual (`aplicar_reasignacion_bandeja`).
        """
        ids        = request.data.get('documentos') or []
        bandeja    = request.data.get('bandeja') or 'recibidos'
        usuario_id = request.data.get('usuario_id')
        unidad_id  = request.data.get('unidad_id')
        instrucciones = request.data.get('instrucciones', '')

        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if not usuario_id:
            return Response({'detail': 'Debe indicar el usuario destino.'}, status=400)

        usuario_bandeja = _resolver_usuario_bandeja(request)
        items_por_id = _items_de_bandeja(usuario_bandeja, ids, bandeja)

        validos, errores = [], []
        for did in ids:
            item = items_por_id.get(did)
            if item is None:
                errores.append({'documento_id': did, 'detalle': 'El documento no está en esta bandeja.'})
                continue
            try:
                validar_reasignacion_bandeja(item, usuario_id)
                validos.append(item)
            except BandejaAccionError as e:
                errores.append({'documento_id': did, 'detalle': str(e)})

        if errores:
            return Response({
                'detail': 'Ningún documento fue reasignado: algunos no pueden reasignarse.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for item in validos:
                aplicar_reasignacion_bandeja(item, request.user, usuario_id, unidad_id, instrucciones)

        n = len(validos)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} reasignado{"s" if n != 1 else ""}.',
            'reasignados': [i.documento_id for i in validos],
        })

    @action(detail=True, methods=['post'], url_path='archivar')
    def archivar(self, request, pk=None):
        item = self.get_object()
        try:
            validar_archivado_bandeja(item)
            with transaction.atomic():
                aplicar_archivado_bandeja(item, request.user, request.data.get('observacion', ''))
        except BandejaAccionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Documento archivado.'})

    @action(detail=False, methods=['post'], url_path='archivar_lote')
    def archivar_lote(self, request):
        """
        Archivo de GESTIÓN PERSONAL en lote (mueve a 'archivados', guarda
        `bandeja_origen`). Body: {documentos:[ids], bandeja, observacion?}.
        Solo desde Recibidos o Enviados (QUIPUX). TODO-O-NADA. NO vincula a
        expediente — esa es otra acción.
        """
        ids         = request.data.get('documentos') or []
        bandeja     = request.data.get('bandeja') or 'recibidos'
        observacion = request.data.get('observacion', '')

        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if bandeja not in ('recibidos', 'enviados'):
            return Response({'detail': 'Solo se puede archivar desde Recibidos o Enviados.'}, status=400)

        usuario_bandeja = _resolver_usuario_bandeja(request)
        items_por_id = {
            b.documento_id: b for b in BandejaDocumento.objects.filter(
                documento_id__in=ids, usuario=usuario_bandeja, bandeja=bandeja,
            ).select_related('documento')
        }
        validos, errores = [], []
        for did in ids:
            item = items_por_id.get(did)
            if item is None:
                errores.append({'documento_id': did, 'detalle': 'El documento ya no está en esta bandeja.'})
                continue
            try:
                validar_archivado_bandeja(item)
                validos.append(item)
            except BandejaAccionError as e:
                errores.append({'documento_id': did, 'detalle': str(e)})
        if errores:
            return Response({
                'detail': 'Ningún documento fue archivado: algunos no pueden archivarse.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for item in validos:
                aplicar_archivado_bandeja(item, request.user, observacion)

        n = len(validos)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} archivado{"s" if n != 1 else ""}.',
            'archivados': [i.documento_id for i in validos],
        })

    @action(detail=True, methods=['post'], url_path='restaurar_archivado')
    def restaurar_archivado(self, request, pk=None):
        """
        RESTAURAR un ítem desde Archivados a su bandeja de origen
        (`bandeja_origen`). Observación OPCIONAL (no aplica la regla de
        comentario obligatorio de papelera — es otro proceso). NO modifica el
        Documento.
        """
        item = self.get_object()
        try:
            validar_desarchivado(item)
            with transaction.atomic():
                aplicar_desarchivado(item, request.user, request.data.get('observacion', ''))
        except BandejaAccionError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': f'Documento restaurado a "{item.bandeja}".'})

    @action(detail=False, methods=['post'], url_path='restaurar_archivados')
    def restaurar_archivados(self, request):
        """
        RESTAURAR masivo desde Archivados. Body: {documentos:[ids], observacion?}.
        Cada documento vuelve a SU propia `bandeja_origen` (el lote puede ser
        MIXTO recibidos+enviados). TODO-O-NADA. Seguimiento individual por
        documento; si hay observación, se registra idéntica en cada uno.
        """
        ids         = request.data.get('documentos') or []
        observacion = request.data.get('observacion', '')
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)

        usuario_bandeja = _resolver_usuario_bandeja(request)
        items_por_id = {
            b.documento_id: b for b in BandejaDocumento.objects.filter(
                documento_id__in=ids, usuario=usuario_bandeja, bandeja='archivados',
            ).select_related('documento')
        }
        validos, errores = [], []
        for did in ids:
            item = items_por_id.get(did)
            if item is None:
                errores.append({'documento_id': did, 'detalle': 'El documento no está en tu bandeja Archivados.'})
                continue
            try:
                validar_desarchivado(item)
                validos.append(item)
            except BandejaAccionError as e:
                errores.append({'documento_id': did, 'detalle': str(e)})
        if errores:
            return Response({
                'detail': 'Ningún documento fue restaurado: algunos no pueden restaurarse.',
                'errores': errores,
            }, status=409)

        destinos = {}
        with transaction.atomic():
            for item in validos:
                destinos[item.documento_id] = item.bandeja_origen
                aplicar_desarchivado(item, request.user, observacion)

        n = len(validos)
        return Response({
            'detail': f'{n} documento{"s" if n != 1 else ""} restaurado{"s" if n != 1 else ""} correctamente.',
            'restaurados': [i.documento_id for i in validos],
            'destinos': destinos,
        })

    @action(detail=True, methods=['post'], url_path='comentar')
    def comentar(self, request, pk=None):
        item = self.get_object()
        obs  = request.data.get('comentario', '')
        with transaction.atomic():
            aplicar_comentario_bandeja(item, request.user, obs)
        return Response({'detail': 'Comentario registrado.'})

    @action(detail=False, methods=['post'], url_path='comentar_lote')
    def comentar_lote(self, request):
        """
        Comentario MASIVO: el MISMO comentario para todos los documentos
        seleccionados. Body: {documentos: [ids], bandeja, comentario}.
        Genera un SeguimientoDocumento INDIVIDUAL por documento (nunca un
        registro grupal — preserva la trazabilidad). TODO-O-NADA.
        """
        ids       = request.data.get('documentos') or []
        bandeja   = request.data.get('bandeja') or 'recibidos'
        comentario = (request.data.get('comentario') or '').strip()

        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Debe indicar al menos un documento.'}, status=400)
        if not comentario:
            return Response({'detail': 'El comentario es obligatorio.'}, status=400)

        usuario_bandeja = _resolver_usuario_bandeja(request)
        items_por_id = _items_de_bandeja(usuario_bandeja, ids, bandeja)

        errores = [
            {'documento_id': did, 'detalle': 'El documento no está en esta bandeja.'}
            for did in ids if did not in items_por_id
        ]
        if errores:
            return Response({
                'detail': 'No se registró ningún comentario: algunos documentos no están en esta bandeja.',
                'errores': errores,
            }, status=409)

        with transaction.atomic():
            for did in ids:
                aplicar_comentario_bandeja(items_por_id[did], request.user, comentario)

        n = len(ids)
        return Response({
            'detail': f'Comentario registrado en {n} documento{"s" if n != 1 else ""}.',
            'comentados': list(ids),
        })

    @action(detail=True, methods=['post'], url_path='nueva_tarea')
    def nueva_tarea(self, request, pk=None):
        item = self.get_object()
        try:
            with transaction.atomic():
                tarea = crear_tarea(
                    documento     = item.documento,
                    creado_por    = request.user,
                    asignada_a_id = request.data.get('usuario_id'),
                    descripcion   = request.data.get('descripcion', ''),
                    prioridad     = request.data.get('prioridad', 'normal'),
                    unidad_id     = request.data.get('unidad_id'),
                    fecha_limite  = request.data.get('fecha_limite'),
                )
        except TareaError as e:
            return Response({'detail': str(e)}, status=e.code)
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


class TareaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Ciclo de vida de una Tarea (doc_tarea). Opera SOBRE LA TAREA (por su id),
    NUNCA sobre el estado global del Documento. Un usuario solo ve/actúa sobre
    tareas donde es `asignada_a` o `asignada_por` (get_object → 404 si no).
    Filtros: ?documento=<id>  ?rol=recibidas|enviadas
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import TareaSerializer
        return TareaSerializer

    def get_queryset(self):
        from django.db.models import Q
        u = self.request.user
        qs = Tarea.objects.select_related(
            'documento__tipo_documento', 'asignada_por', 'asignada_a',
        ).filter(Q(asignada_a=u) | Q(asignada_por=u))
        doc = self.request.query_params.get('documento')
        rol = self.request.query_params.get('rol')
        if doc:
            qs = qs.filter(documento_id=doc)
        if rol == 'recibidas':
            qs = qs.filter(asignada_a=u)
        elif rol == 'enviadas':
            qs = qs.filter(asignada_por=u)
        return qs.order_by('-creado_en')

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        try:
            with transaction.atomic():
                iniciar_tarea(self.get_object(), request.user)
        except TareaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Tarea iniciada.'})

    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        try:
            with transaction.atomic():
                completar_tarea(self.get_object(), request.user, request.data.get('respuesta', ''))
        except TareaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Tarea completada.'})

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        try:
            with transaction.atomic():
                cancelar_tarea(self.get_object(), request.user, request.data.get('motivo', ''))
        except TareaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Tarea cancelada.'})


class CarpetaVirtualViewSet(viewsets.ModelViewSet):
    """
    Carpetas Virtuales (F2-F) — CLASIFICACIÓN OPERATIVA por Unidad.
    NO es bandeja/expediente/archivo. Clasificar no modifica el documento.

    ADMINISTRACIÓN del árbol (crear/renombrar/mover/desactivar/reactivar) =
    SOLO ADMIN_GENERAL / superusuario (R2). El usuario normal solo CONSULTA
    su árbol y clasifica documentos (endpoints en DocumentoViewSet).

    - GET  /carpetas/?unidad=<id>[&incluir_inactivas=true]   árbol (plano)
    - POST /carpetas/  {nombre, padre?, unidad?}             (admin)
    - PATCH /carpetas/{id}/  {nombre} | {padre}              (admin)
    - DELETE /carpetas/{id}/            desactivación lógica recursiva (admin)
    - POST /carpetas/{id}/activar/                           (admin)
    - GET  /carpetas/{id}/documentos/?incluir_subcarpetas=false
    - POST /carpetas/{id}/quitar_documento/  {documento_id}
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CarpetaVirtualSerializer
        return CarpetaVirtualSerializer

    def _unidad_destino(self):
        uid = self.request.query_params.get('unidad') or self.request.data.get('unidad')
        if uid:
            return int(uid)
        return getattr(self.request.user, 'unidad_id', None)

    def get_queryset(self):
        from django.db.models import Count
        from .models import CarpetaVirtual
        qs = CarpetaVirtual.objects.select_related('unidad').annotate(
            n_docs=Count('documentos', distinct=True),
        )
        vis = unidades_visibles(self.request.user)
        if vis is not None:
            qs = qs.filter(unidad_id__in=[u for u in vis if u is not None] or [0])
        uid = self.request.query_params.get('unidad')
        if uid:
            qs = qs.filter(unidad_id=uid)
        return qs.order_by('nombre')

    def list(self, request, *args, **kwargs):
        unidad_id = self._unidad_destino()
        if not unidad_id:
            return Response({'detail': 'No se pudo determinar la unidad.'}, status=400)
        incluir_inactivas = str(request.query_params.get('incluir_inactivas', '')).lower() in ('1', 'true', 'si')
        try:
            return Response({
                'unidad': int(unidad_id),
                'puede_administrar': es_admin_carpetas(request.user),
                'carpetas': arbol_unidad(request.user, unidad_id, incluir_inactivas=incluir_inactivas),
            })
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)

    def create(self, request, *args, **kwargs):
        unidad_id = self._unidad_destino()
        if not unidad_id:
            return Response({'detail': 'No se pudo determinar la unidad.'}, status=400)
        try:
            carpeta = crear_carpeta(
                request.user, unidad_id=unidad_id,
                nombre=request.data.get('nombre', ''),
                padre_id=request.data.get('padre'),
            )
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response(self.get_serializer(carpeta).data, status=201)

    def partial_update(self, request, *args, **kwargs):
        carpeta = self.get_object()
        try:
            if 'padre' in request.data:
                mover_carpeta(request.user, carpeta, request.data.get('padre'))
            if 'nombre' in request.data:
                renombrar_carpeta(request.user, carpeta, request.data.get('nombre', ''))
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        carpeta.refresh_from_db()
        return Response(self.get_serializer(carpeta).data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """DESACTIVACIÓN LÓGICA recursiva (R4). No borra la fila ni toca
        documentos / clasificaciones / bandejas."""
        try:
            desactivar_carpeta(request.user, self.get_object())
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response(status=204)

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        try:
            carpeta = activar_carpeta(request.user, self.get_object())
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response(self.get_serializer(carpeta).data)

    @action(detail=True, methods=['get'])
    def documentos(self, request, pk=None):
        carpeta = self.get_object()
        incluir = str(request.query_params.get('incluir_subcarpetas', '')).lower() in ('1', 'true', 'si')
        try:
            qs = documentos_de_carpeta(request.user, carpeta, incluir_subcarpetas=incluir)
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        page = self.paginate_queryset(qs)
        data = DocumentoListSerializer(page if page is not None else qs, many=True).data
        return self.get_paginated_response(data) if page is not None else Response(data)

    @action(detail=True, methods=['post'], url_path='quitar_documento')
    def quitar_documento(self, request, pk=None):
        carpeta = self.get_object()
        did = request.data.get('documento_id')
        doc = Documento.objects.filter(pk=did).first()
        if doc is None:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        try:
            quitar_de_carpeta(request.user, doc, unidad_id=carpeta.unidad_id)
        except CarpetaError as e:
            return Response({'detail': str(e)}, status=e.code)
        return Response({'detail': 'Documento retirado de la carpeta.'})


class EnviarDocumentoView(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        from .models import Documento
        try:
            doc = Documento.objects.get(pk=pk)
        except Documento.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)

        # Este endpoint ("Distribuir") también se usa desde Recibidos/Enviados,
        # donde el usuario legítimamente NO tiene ítem de elaboración para
        # este documento — eso está bien, no requiere responsabilidad actual.
        # Lo que sí debe bloquearse es el caso puntual de este ticket: que
        # alguien use un ítem de elaboración YA reasignado (p. ej. el
        # creador original tras reasignar) para disparar el efecto de este
        # endpoint (mover ese ítem a 'enviados' y fijar estado='enviado').
        tiene_item_reasignado = BandejaDocumento.objects.filter(
            documento=doc, usuario=request.user, bandeja__in=['en_elaboracion', 'no_enviados'],
            accion_tomada='reasignado',
        ).exists()
        if tiene_item_reasignado:
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)

        destinatarios_internos  = request.data.get('destinatarios_internos', [])
        destinatarios_externos  = request.data.get('destinatarios_externos', [])
        instrucciones           = request.data.get('instrucciones', '')
        es_urgente              = request.data.get('es_urgente', False)
        fecha_limite            = request.data.get('fecha_limite')
        numero_referencia       = request.data.get('numero_referencia', '')

        try:
            from contextlib import ExitStack
            with transaction.atomic(), ExitStack() as _stack:
                # Este endpoint (usado por "Distribuir") no depende de
                # destinatarios ya guardados: los recibe en la misma
                # solicitud. Se valida ANTES de crear nada ni tocar el
                # estado — una lista vacía nunca debe poder enviar.
                validar_documento_minimo(doc)
                internos_validos = validar_lista_destinatarios(destinatarios_internos, destinatarios_externos)

                # NUMERACIÓN — número definitivo (consume secuencia oficial)
                # solo si ESTA acción oficializa el documento. Idempotente.
                if doc.estado not in ('enviado', 'recibido', 'archivado', 'firmado'):
                    from .numeracion import asignar_numero_definitivo
                    asignar_numero_definitivo(doc)

                # FASE 0A — Congelar el PDF oficial solo cuando ES ESTA acción
                # la que oficializa el documento (borrador -> enviado). Si el
                # documento ya estaba enviado/recibido/archivado, es un caso
                # legacy o una redistribución: no se retro-congela aquí (§9).
                # `_stack.enter_context(...)` (en vez de un `with` anidado)
                # asegura que, si algo MÁS ABAJO en este mismo bloque falla
                # (bandejas, seguimiento), la limpieza del archivo físico
                # recién escrito se dispare igual (§0A.1 Parte B).
                from .pdf_oficial import congelar_pdf_oficial_seguro
                if doc.estado not in ('enviado', 'recibido', 'archivado', 'firmado'):
                    _stack.enter_context(congelar_pdf_oficial_seguro(doc, request.user, motivo='distribuir'))

                for dest in internos_validos:
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

                doc.estado = 'enviado'
                if not doc.fecha_envio:
                    doc.fecha_envio = timezone.now()
                doc.save(update_fields=['estado', 'fecha_envio'])

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
                for d in internos_validos:
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
        except DocumentoInvalidoError as e:
            return Response({'detail': str(e)}, status=400)
        except NumeracionError as e:
            return Response({'detail': str(e)}, status=409)

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

        # ACL de lectura — servir el PDF de un documento ajeno es una fuga.
        if not puede_ver_documento(request.user, doc):
            return Response({'detail': 'No tiene acceso a este documento.'}, status=403)

        filename = f'{doc.numero_documento or f"doc_{doc.id}"}.pdf'.replace('/', '-')

        # FASE 0A — Si el documento tiene un PDF oficial congelado (enviado /
        # firmado desde FASE 0A, o el PDF firmado de FirmaEC / P12), servir
        # exactamente esos bytes. Nunca reconstruir desde plantillas.py.
        from .pdf_oficial import obtener_adjunto_oficial
        adj = obtener_adjunto_oficial(doc)
        if adj and adj.archivo:
            try:
                with adj.archivo.open('rb') as fh:
                    data = fh.read()
                resp = HttpResponse(data, content_type='application/pdf')
                resp['Content-Disposition'] = f'attachment; filename="{filename}"'
                resp['X-PDF-Origen'] = 'congelado'
                return resp
            except (FileNotFoundError, OSError):
                # Archivo referenciado pero ausente en MEDIA (p. ej. bind mount
                # perdido): se cae al render dinámico para no romper la vista.
                pass

        # Borrador → render dinámico SGDA con marca BORRADOR. Se resuelve ANTES
        # de cualquier consulta a Quipux (no se toca la base legacy por cada
        # borrador / documento SGDA nativo).
        if doc.estado == 'borrador':
            html = html_documento_oficial(doc, 'preview')      # con marca BORRADOR
            resp = generar_pdf(html, filename)
            resp['X-PDF-Origen'] = 'borrador'
            return resp

        # FASE 0B.1 — Documento histórico QUIPUX: preferir su PDF ORIGINAL
        # (base documental Quipux) en vez de reconstruirlo con WeasyPrint.
        # `resolver_radicado_quipux` hace un filtro barato por formato de
        # numero_documento y solo entonces confirma contra radicado.radi_nume_text.
        # No se copia nada a MEDIA ni se crea AdjuntoDocumento: es una capa de
        # compatibilidad de lectura, no la migración documental.
        try:
            from apps.quipux.pdf_original import (
                resolver_radicado_quipux, recuperar_pdf_original, QuipuxNoDisponible,
            )
            radicado = resolver_radicado_quipux(doc.numero_documento)
            if radicado is not None:
                pdf_bytes = None
                if radicado['arch_codi'] > 0:
                    pdf_bytes = recuperar_pdf_original(radicado['arch_codi'])
                if pdf_bytes:
                    resp = HttpResponse(pdf_bytes, content_type='application/pdf')
                    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
                    resp['X-PDF-Origen'] = 'quipux-original'
                    return resp
                # Radicado Quipux CONFIRMADO pero sin PDF original recuperable
                # (arch_codi=0, o func_recuperar_archivo sin resultado): se
                # sirve el render dinámico pero SIN llamarlo "original" (§7).
                html = html_documento_oficial(doc, 'final')    # doc ya oficial → sin BORRADOR
                resp = generar_pdf(html, filename)
                resp['X-PDF-Origen'] = 'reconstruido-legacy'
                return resp
        except QuipuxNoDisponible as e:
            # §9 — infra legacy caída: NO 500. Se degrada al fallback dinámico
            # de abajo, dejando rastro para no ocultar el problema de infra.
            import logging
            logging.getLogger(__name__).warning(
                'FASE 0B.1: base Quipux no disponible al resolver PDF de Documento %s (%s): %s',
                doc.id, doc.numero_documento, e,
            )

        # Documento SGDA histórico enviado ANTES de FASE 0A y sin PDF congelado
        # (los 16 nativos), o QUIPUX que no se pudo resolver por infra caída →
        # render dinámico TEMPORAL. No se persiste. `doc.estado` no es
        # 'borrador' aquí → 'final' (sin BORRADOR).
        html = html_documento_oficial(doc, 'final')
        resp = generar_pdf(html, filename)
        resp['X-PDF-Origen'] = 'dinamico-legacy'
        return resp


# ─────────────────────────────────────────────────────────
# Numeración documental configurable por Unidad × TipoDocumento  (Etapa 2 — API)
# Permiso: módulo 'ajustes' (solo ADMIN_GENERAL / superusuario).
# ─────────────────────────────────────────────────────────
class _NumeracionBaseView(APIView):
    permission_classes = [IsAuthenticated]
    accion_requerida   = 'editar'

    def check_permissions(self, request):
        super().check_permissions(request)
        from apps.usuarios.permisos import tiene_permiso
        if not tiene_permiso(request.user, 'ajustes', self.accion_requerida):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Requiere permiso de administración de ajustes.')

    def get_unidad(self, unidad_id):
        from apps.organizacion.models import Unidad
        return Unidad.objects.filter(pk=unidad_id).first()

    def get_tipo(self, tipo_id):
        return TipoDocumento.objects.filter(pk=tipo_id).first()


class NumeracionUnidadView(_NumeracionBaseView):
    """GET — tabla §22: config + secuencia actual + próximo número por tipo."""
    accion_requerida = 'ver'

    def get(self, request, unidad_id):
        from .numeracion import resumen_unidad
        unidad = self.get_unidad(unidad_id)
        if not unidad:
            return Response({'detail': 'Unidad no encontrada.'}, status=404)
        return Response({
            'unidad':  {'id': unidad.id, 'siglas': unidad.siglas, 'nombre': unidad.nombre},
            'tipos':   resumen_unidad(unidad),
        })


class NumeracionConfigView(_NumeracionBaseView):
    """PUT — crea/actualiza la ConfiguracionNumeracion de (unidad, tipo)."""

    def put(self, request, unidad_id, tipo_id):
        from .models import ConfiguracionNumeracion
        from .serializers import ConfiguracionNumeracionSerializer
        unidad, tipo = self.get_unidad(unidad_id), self.get_tipo(tipo_id)
        if not unidad or not tipo:
            return Response({'detail': 'Unidad o tipo no encontrado.'}, status=404)

        instancia = ConfiguracionNumeracion.objects.filter(unidad=unidad, tipo_documento=tipo).first()
        ser = ConfiguracionNumeracionSerializer(instancia, data=request.data, partial=bool(instancia))
        ser.is_valid(raise_exception=True)
        obj = ser.save(
            unidad=unidad, tipo_documento=tipo,
            modificado_por=request.user,
            **({} if instancia else {'creado_por': request.user}),
        )
        return Response(ConfiguracionNumeracionSerializer(obj).data)


class NumeracionPreviewView(_NumeracionBaseView):
    """POST {overrides} — próximo número con la config indicada, SIN consumir."""

    def post(self, request, unidad_id, tipo_id):
        from .numeracion import cfg_efectiva, preview_siguiente, validar_config, NumeracionError
        unidad, tipo = self.get_unidad(unidad_id), self.get_tipo(tipo_id)
        if not unidad or not tipo:
            return Response({'detail': 'Unidad o tipo no encontrado.'}, status=404)
        cfg = cfg_efectiva(unidad, tipo, override=request.data or None)
        try:
            validar_config(estructura=cfg.estructura, separador=cfg.separador,
                           digitos_anio=cfg.digitos_anio, digitos_secuencia=cfg.digitos_secuencia)
        except NumeracionError as e:
            return Response({'detail': str(e)}, status=400)
        return Response({'preview': preview_siguiente(unidad, tipo, cfg_override=cfg)})


class NumeracionAjustarSecuenciaView(_NumeracionBaseView):
    """POST {nueva_secuencia, motivo} — fija ultimo_numero (§16/§17), auditado."""

    def post(self, request, unidad_id, tipo_id):
        from .numeracion import ajustar_secuencia, preview_siguiente, NumeracionError
        unidad, tipo = self.get_unidad(unidad_id), self.get_tipo(tipo_id)
        if not unidad or not tipo:
            return Response({'detail': 'Unidad o tipo no encontrado.'}, status=404)
        try:
            nueva = int(request.data.get('nueva_secuencia'))
        except (TypeError, ValueError):
            return Response({'detail': 'nueva_secuencia debe ser un entero.'}, status=400)
        try:
            seq = ajustar_secuencia(
                unidad, tipo,
                nueva_secuencia=nueva,
                motivo=request.data.get('motivo', ''),
                usuario=request.user,
            )
        except NumeracionError as e:
            return Response({'detail': str(e)}, status=400)
        return Response({
            'secuencia_actual': seq.ultimo_numero,
            'proximo_numero':   preview_siguiente(unidad, tipo),
        })


class NumeracionCopiarView(_NumeracionBaseView):
    """POST {unidad_origen_id} — copia el FORMATO de otra unidad (§14/§15:
    NO copia la secuencia)."""

    def post(self, request, unidad_id):
        from .numeracion import copiar_config, resumen_unidad, NumeracionError
        destino = self.get_unidad(unidad_id)
        origen  = self.get_unidad(request.data.get('unidad_origen_id'))
        if not destino or not origen:
            return Response({'detail': 'Unidad no encontrada.'}, status=404)
        try:
            n = copiar_config(destino, origen, usuario=request.user)
        except NumeracionError as e:
            return Response({'detail': str(e)}, status=400)
        return Response({
            'copiadas': n,
            'detail': f'Se copiaron {n} configuración(es) de {origen.siglas}. '
                      f'Las secuencias de {destino.siglas} NO se modificaron.',
            'tipos': resumen_unidad(destino),
        })


class AdjuntoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get_queryset(self):
        from django.db.models import Q
        qs = AdjuntoDocumento.objects.select_related('subido_por')
        doc_id     = self.request.query_params.get('documento')
        tramite_id = self.request.query_params.get('tramite')
        if doc_id:     qs = qs.filter(documento_id=doc_id)
        if tramite_id: qs = qs.filter(tramite_id=tramite_id)
        # ACL de lectura: solo anexos de documentos que el usuario puede ver
        # (los anexos de trámites siguen su propia lógica y no se filtran aquí).
        if not _es_admin_bandeja(self.request.user):
            qs = qs.filter(
                Q(documento__isnull=True)
                | Q(documento__in=documentos_visibles_para(self.request.user, False))
            )
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
        if not _puede_firmar_documento(request.user, doc):
            return Response({'error': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
        try:
            validar_documento_enviable(doc)   # no se inicia la firma de un documento sin "Para"
        except DocumentoInvalidoError as e:
            return Response({'error': str(e)}, status=400)
        cedula = getattr(request.user, 'cedula', '') or str(request.user.id)

        # NUMERACIÓN — el PDF que se manda a firmar debe llevar ya el número
        # DEFINITIVO (no el provisional "…-TEMP"). Se consume la secuencia
        # oficial aquí. Idempotente si ya era definitivo.
        from .numeracion import asignar_numero_definitivo
        with transaction.atomic():
            asignar_numero_definitivo(doc)

        # 1. Generar PDF limpio (sin /ObjStm); modo 'pre_firma': SIN marca
        #    BORRADOR + con la leyenda "Documento firmado electrónicamente"
        #    antes de que FirmaEC lo firme.
        html      = html_documento_oficial(doc, 'pre_firma')
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

        # El token se generó minutos antes (GenerarTokenFirmaECView ya validó
        # responsabilidad en ese momento); aquí se revalida por si el
        # documento cambió de responsable mientras la firma externa estaba
        # en curso (§20: el backend es la última barrera). Solo se aplica
        # cuando se pudo resolver el usuario firmante por su cédula.
        if usuario is not None and not _puede_firmar_documento(usuario, doc):
            return HttpResponse('ERROR', content_type='text/plain', status=403)

        # Eliminar versiones firmadas anteriores (re-firma o reintento)
        doc.archivos_adjuntos.filter(tipo='documento').delete()

        nombre_archivo = f'{doc.numero_documento or f"doc_{doc.id}"}_firmado_firmaec.pdf'
        import hashlib as _hashlib
        adjunto = AdjuntoDocumento(
            documento  = doc,
            nombre     = nombre_archivo,
            tipo       = 'documento',
            mime_type  = 'application/pdf',
            tamanio    = len(pdf_bytes),
            subido_por = usuario,
            origen_digitalizacion = 'nativo_digital',
            # FASE 0A — hash del PDF realmente firmado, para verificar
            # almacenado == servido (misma columna que el resto de adjuntos).
            hash_integridad = _hashlib.sha256(pdf_bytes).hexdigest(),
        )
        adjunto.archivo.save(nombre_archivo, ContentFile(pdf_bytes), save=False)
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
        if not _puede_firmar_documento(request.user, doc):
            return Response({'detail': 'El documento ya no se encuentra bajo su responsabilidad.'}, status=403)
        try:
            validar_documento_enviable(doc)   # no se firma un documento sin "Para"
        except DocumentoInvalidoError as e:
            return Response({'detail': str(e)}, status=400)
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
        # FASE 0A — La firma física oficializa el documento pero no genera
        # ningún PDF por sí sola. Se congela el render actual (con la leyenda
        # de firma ya presente) como artefacto oficial, dentro de la misma
        # transacción que el cambio de estado.
        from .pdf_oficial import congelar_pdf_oficial
        from .numeracion import asignar_numero_definitivo
        with transaction.atomic():
            asignar_numero_definitivo(doc)
            doc.save(update_fields=['estado', 'fecha_firma', 'firmado_por', 'firma_bce_info'])
            congelar_pdf_oficial(doc, request.user, motivo='firma_fisica')

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