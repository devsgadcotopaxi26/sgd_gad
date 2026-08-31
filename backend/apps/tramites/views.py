import uuid
from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.views import APIView
from apps.usuarios.permisos import get_permisos_usuario
from .models import Categoria, TipoTramite, Persona, Tramite, Seguimiento
from .serializers import (
    CategoriaSerializer, TipoTramiteListSerializer, TipoTramiteDetalleSerializer,
    PersonaResumenSerializer, PersonaDetalleSerializer, PersonaCrearSerializer,
    PersonaSnapshotInlineSerializer,
    TramiteListSerializer, TramiteDetalleSerializer, TramiteCrearSerializer,
    TramiteEditarSerializer,
    SeguimientoSerializer,
)


PLAZO_DEFAULT_DIAS = 15  # dias_plazo por defecto cuando el trámite aún no tiene tipo_tramite clasificado


def generar_numero_tramite():
    """Corrección PROVISIONAL: usa el correlativo máximo existente en vez de
    COUNT(), que fallaba con huecos (ver auditoría RF-TRAM-003). Mismo
    formato y mismo ámbito (por año) que antes. NO es la solución
    definitiva — no resuelve concurrencia ni reutilización de números tras
    eliminar el trámite con el correlativo máximo (ver reporte)."""
    anio = timezone.now().year
    prefijo = f'T-{anio}-'
    numeros = Tramite.objects.filter(
        numero_tramite__startswith=prefijo
    ).values_list('numero_tramite', flat=True)

    maximo = 0
    for numero in numeros:
        sufijo = numero[len(prefijo):]
        if sufijo.isdigit():
            maximo = max(maximo, int(sufijo))

    return f'{prefijo}{str(maximo + 1).zfill(6)}'


def calcular_fecha_limite(dias_plazo: int) -> date:
    fecha = timezone.now().date()
    dias  = 0
    while dias < dias_plazo:
        fecha += timedelta(days=1)
        if fecha.weekday() < 5:
            dias += 1
    return fecha


class CategoriaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class   = None
    queryset            = Categoria.objects.filter(activo=True)
    serializer_class     = CategoriaSerializer


class TipoTramiteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class   = None
    filter_backends    = [DjangoFilterBackend, SearchFilter]
    filterset_fields   = ['categoria', 'activo', 'en_linea']
    search_fields      = ['nombre', 'codigo', 'descripcion']

    def get_queryset(self):
        qs = TipoTramite.objects.select_related('categoria', 'unidad_responsable')
        if self.action == 'list' and self.request.query_params.get('incluir_inactivos') != '1':
            qs = qs.filter(activo=True)
        return qs

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return TipoTramiteDetalleSerializer
        return TipoTramiteListSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['tipo_persona', 'tipo_identificacion', 'activo']
    search_fields      = ['nombres', 'apellidos', 'numero_identificacion', 'email']
    ordering           = ['apellidos', 'nombres']

    def get_queryset(self):
        return Persona.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return PersonaCrearSerializer
        if self.action in ['update', 'partial_update']:
            return PersonaCrearSerializer
        if self.action == 'retrieve':
            return PersonaDetalleSerializer
        return PersonaResumenSerializer

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        identificacion = request.query_params.get('identificacion', '').strip()
        if not identificacion:
            return Response({'detail': 'Parámetro identificacion requerido.'}, status=400)
        try:
            persona = Persona.objects.get(numero_identificacion=identificacion)
            return Response(PersonaResumenSerializer(persona).data)
        except Persona.DoesNotExist:
            return Response({'detail': 'Persona no encontrada.'}, status=404)


class TramiteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['estado', 'prioridad', 'canal_ingreso',
                          'unidad_responsable', 'usuario_asignado']
    search_fields      = ['numero_tramite', 'asunto', 'persona__nombres',
                          'persona__apellidos', 'persona__numero_identificacion']
    ordering_fields    = ['fecha_ingreso', 'fecha_limite', 'estado']
    ordering           = ['-fecha_ingreso']

    def get_queryset(self):
        # unidad_receptora/usuario_receptor se agregan aquí (no solo
        # unidad_responsable/usuario_asignado) para que la sección "Gestión"
        # del detalle (unidad_receptora_nombre, receptor_nombre) no dispare
        # una consulta adicional por trámite.
        return Tramite.objects.select_related(
            'persona', 'tipo_tramite__categoria',
            'unidad_responsable', 'usuario_asignado',
            'unidad_receptora', 'usuario_receptor',
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return TramiteCrearSerializer
        if self.action in ('update', 'partial_update'):
            return TramiteEditarSerializer
        if self.action == 'retrieve':
            return TramiteDetalleSerializer
        return TramiteListSerializer

    def perform_create(self, serializer):
        # No basta con que el frontend oculte el selector de canal: se valida
        # aquí que el usuario realmente tenga "crear" habilitado para el
        # canal solicitado (p. ej. ASISTENTE_ARCHIVO solo lo tiene en
        # 'ventanilla' — ver PERMISOS_ROL). No es la implementación completa
        # de RF-TRAM-011 (eso cubriría también update/delete y otros
        # endpoints); aquí solo se cierra la puerta de creación por canal.
        canal = serializer.validated_data.get('canal_ingreso') or 'ventanilla'
        canales_permitidos = get_permisos_usuario(self.request.user).get('tramites_canales', {})
        if 'crear' not in canales_permitidos.get(canal, []):
            raise PermissionDenied(f'No tienes permiso para crear trámites del canal "{canal}".')

        tipo = serializer.validated_data.get('tipo_tramite')
        numero = generar_numero_tramite()
        limite = calcular_fecha_limite(tipo.dias_plazo if tipo else PLAZO_DEFAULT_DIAS)

        # Gestión de firmante/contacto: resolver o crear la Persona (si
        # corresponde) y, si se pidió explícitamente, volcar el contacto de
        # este trámite a los datos maestros — todo dentro de la misma
        # transacción que crea el trámite, para no dejar una Persona
        # huérfana si el trámite falla, ni un trámite sin la Persona que
        # se acababa de crear para él.
        persona_datos = serializer.validated_data.pop('persona_datos', None)
        actualizar_persona = serializer.validated_data.pop('actualizar_persona', False)
        persona = serializer.validated_data.get('persona')

        with transaction.atomic():
            if not persona and persona_datos and persona_datos.get('numero_identificacion'):
                datos = PersonaSnapshotInlineSerializer(data=persona_datos)
                datos.is_valid(raise_exception=True)
                datos = dict(datos.validated_data)
                numero_id = datos.pop('numero_identificacion')
                persona, _creada = Persona.objects.get_or_create(
                    numero_identificacion=numero_id,
                    defaults=datos,
                )
                serializer.validated_data['persona'] = persona

            if persona:
                # cedula_firmante es el snapshot histórico de la identificación
                # — se toma de Persona en el momento de vincularla/crearla, no
                # de lo que el cliente haya enviado, para que siempre refleje
                # la identificación real de la Persona con la que quedó
                # vinculado este trámite (ver auditoría de firmante/contacto).
                serializer.validated_data['cedula_firmante'] = persona.numero_identificacion

            if persona and actualizar_persona:
                telefono = serializer.validated_data.get('telefono_contacto', '')
                correo   = serializer.validated_data.get('correo_contacto', '')
                cambios = {}
                if telefono and telefono != persona.telefono_movil:
                    cambios['telefono_movil'] = telefono
                if correo and correo != persona.email:
                    cambios['email'] = correo
                if cambios:
                    Persona.objects.filter(pk=persona.pk).update(**cambios)

            # RN-TRAM-011: unidad_responsable es un concepto distinto de
            # "quién registra" — nunca se infiere del usuario autenticado,
            # queda vacía en el registro inicial y se asigna después en el
            # direccionamiento. unidad_receptora sí se completa, en el mejor
            # de los casos, con la unidad de quien recibe físicamente la
            # documentación (si la tiene); si no la tiene, el trámite igual
            # se registra sin ella.
            tramite = serializer.save(
                uuid=uuid.uuid4(),
                numero_tramite=numero,
                fecha_limite=limite,
                usuario_receptor=self.request.user,
                unidad_receptora=self.request.user.unidad,
                tipo_resolucion=None,
            )
            Seguimiento.objects.create(
                tramite=tramite,
                estado_anterior='',
                estado_nuevo='ingresado',
                observacion='Trámite ingresado al sistema.',
                usuario=self.request.user,
                unidad=tramite.unidad_receptora,
            )

    def perform_update(self, serializer):
        # RF-TRAM-009: el backend es la autoridad final — ocultar el botón
        # "Editar" en el frontend no sustituye esta validación. El canal es
        # inmutable durante edición (no llega en TramiteEditarSerializer) y
        # es precisamente lo que determina el permiso requerido, igual que en
        # perform_create() para 'crear'.
        instance = serializer.instance
        canal = instance.canal_ingreso
        canales_permitidos = get_permisos_usuario(self.request.user).get('tramites_canales', {})
        if 'editar' not in canales_permitidos.get(canal, []):
            raise PermissionDenied(f'No tienes permiso para editar trámites del canal "{canal}".')

        persona_datos       = serializer.validated_data.pop('persona_datos', None)
        actualizar_persona  = serializer.validated_data.pop('actualizar_persona', False)
        persona_incluida    = 'persona' in serializer.validated_data
        persona             = serializer.validated_data.get('persona')
        cedula_anterior     = instance.cedula_firmante

        with transaction.atomic():
            if not persona and persona_datos and persona_datos.get('numero_identificacion'):
                datos = PersonaSnapshotInlineSerializer(data=persona_datos)
                datos.is_valid(raise_exception=True)
                datos = dict(datos.validated_data)
                numero_id = datos.pop('numero_identificacion')
                persona, _creada = Persona.objects.get_or_create(
                    numero_identificacion=numero_id,
                    defaults=datos,
                )
                serializer.validated_data['persona'] = persona
                persona_incluida = True

            if not persona_incluida:
                # El operador no resolvió una Persona en esta edición (no
                # buscó ni creó una nueva). Si aun así cambió manualmente el
                # texto de cedula_firmante respecto al valor que ya tenía el
                # trámite, la Persona vinculada (si la había) ya no
                # necesariamente corresponde a esa identificación — se
                # desvincula en vez de dejar un persona_id desincronizado
                # (RF-TRAM-009 sección 10). Si cedula_firmante no cambió
                # (incluye el caso de trámites antiguos con NULL que se abren
                # y guardan sin tocarla — sección 15), no se toca persona.
                nueva_cedula = serializer.validated_data.get('cedula_firmante', cedula_anterior)
                if (nueva_cedula or None) != (cedula_anterior or None):
                    serializer.validated_data['persona'] = None
                    persona_incluida = True
                    persona = None

            if persona_incluida and persona:
                # Igual que en creación: la identificación mostrada como
                # snapshot siempre proviene de la Persona con la que el
                # trámite quedó vinculado en esta edición, no de texto suelto.
                serializer.validated_data['cedula_firmante'] = persona.numero_identificacion

            if persona and actualizar_persona:
                telefono = serializer.validated_data.get('telefono_contacto', instance.telefono_contacto)
                correo   = serializer.validated_data.get('correo_contacto', instance.correo_contacto)
                cambios = {}
                if telefono and telefono != persona.telefono_movil:
                    cambios['telefono_movil'] = telefono
                if correo and correo != persona.email:
                    cambios['email'] = correo
                if cambios:
                    Persona.objects.filter(pk=persona.pk).update(**cambios)

            tramite = serializer.save()
            Seguimiento.objects.create(
                tramite=tramite,
                estado_anterior=tramite.estado,
                estado_nuevo=tramite.estado,
                observacion='Edición de trámite: datos del oficio/firmante actualizados.',
                usuario=self.request.user,
                unidad=tramite.unidad_receptora,
            )

    @action(detail=True, methods=['post'], url_path='cambiar_estado')
    def cambiar_estado(self, request, pk=None):
        tramite        = self.get_object()
        nuevo_estado   = request.data.get('estado')
        observacion    = request.data.get('observacion', '')
        estados_validos = [e[0] for e in Tramite.ESTADO_CHOICES]

        if nuevo_estado not in estados_validos:
            return Response({'detail': 'Estado inválido.'}, status=400)

        estado_anterior = tramite.estado
        tramite.estado  = nuevo_estado

        if nuevo_estado == 'resuelto':
            tramite.fecha_resolucion = timezone.now()
            tramite.dias_resolucion  = (timezone.now().date() - tramite.fecha_ingreso.date()).days
            tramite.dentro_plazo     = timezone.now().date() <= tramite.fecha_limite
            tramite.tipo_resolucion  = request.data.get('tipo_resolucion', 'favorable')
            tramite.resolucion_texto = request.data.get('resolucion_texto', '')

        if nuevo_estado == 'asignado' and not tramite.fecha_asignacion:
            tramite.fecha_asignacion  = timezone.now()
            if request.data.get('usuario_asignado'):
                tramite.usuario_asignado_id = request.data['usuario_asignado']

        tramite.save()
        if tramite.persona and tramite.persona.notificacion_email and tramite.persona.email:
            from apps.auditoria.emails import email_notificacion_ciudadano
            email_notificacion_ciudadano(
                tramite.persona.email,
                tramite.persona.nombre_completo,
                tramite.numero_tramite,
                tramite.asunto,
                dict(Tramite.ESTADO_CHOICES).get(nuevo_estado, nuevo_estado),
            )

        Seguimiento.objects.create(
            tramite=tramite,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            observacion=observacion,
            usuario=request.user,
            unidad=tramite.unidad_responsable,
        )
        return Response(TramiteListSerializer(tramite).data)

    @action(detail=False, methods=['get'], url_path='seguimiento_publico')
    def seguimiento_publico(self, request):
        numero = request.query_params.get('numero', '').strip()
        if not numero:
            return Response({'detail': 'Número de trámite requerido.'}, status=400)
        try:
            tramite     = Tramite.objects.get(numero_tramite=numero)
            seguimientos = tramite.seguimientos.filter(
                visible_ciudadano=True
            ).order_by('creado_en')
            return Response({
                'numero_tramite': tramite.numero_tramite,
                'asunto':         tramite.asunto,
                'estado':         tramite.get_estado_display(),
                'fecha_ingreso':  tramite.fecha_ingreso,
                'fecha_limite':   tramite.fecha_limite,
                'fecha_resolucion': tramite.fecha_resolucion,
                'seguimientos': [
                    {
                        'estado': s.get_estado_nuevo_display() if hasattr(s, 'get_estado_nuevo_display') else s.estado_nuevo,
                        'observacion': s.observacion,
                        'fecha': s.creado_en,
                    }
                    for s in seguimientos
                ],
            })
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado.'}, status=404)

class PortalCiudadanoView(APIView):
    permission_classes = []  # público

    def get(self, request):
        numero = request.query_params.get('numero', '').strip()
        cedula = request.query_params.get('cedula', '').strip()

        if not numero and not cedula:
            return Response({'detail': 'Ingresa el número de trámite o tu cédula.'}, status=400)

        try:
            if numero:
                tramite = Tramite.objects.select_related(
                    'tipo_tramite__categoria', 'persona', 'unidad_responsable'
                ).get(numero_tramite=numero)
            else:
                tramites = Tramite.objects.select_related(
                    'tipo_tramite__categoria', 'persona', 'unidad_responsable'
                ).filter(persona__numero_identificacion=cedula).order_by('-fecha_ingreso')

                if not tramites.exists():
                    return Response({'detail': 'No se encontraron trámites con esa cédula.'}, status=404)

                return Response({
                    'tipo': 'lista',
                    'tramites': [
                        {
                            'numero_tramite':  t.numero_tramite,
                            'asunto':          t.asunto,
                            'estado':          t.get_estado_display(),
                            'estado_key':      t.estado,
                            'categoria':       t.tipo_tramite.categoria.nombre if t.tipo_tramite_id else None,
                            'fecha_ingreso':   t.fecha_ingreso.strftime('%d/%m/%Y'),
                            'fecha_limite':    t.fecha_limite.strftime('%d/%m/%Y'),
                            'fecha_resolucion': t.fecha_resolucion.strftime('%d/%m/%Y %H:%M') if t.fecha_resolucion else None,
                        }
                        for t in tramites[:10]
                    ]
                })

            from django.utils import timezone
            hoy = timezone.now().date()
            seguimientos = tramite.seguimientos.filter(
                visible_ciudadano=True
            ).order_by('creado_en').values('estado_nuevo', 'observacion', 'creado_en')

            dias_restantes = None
            if tramite.estado not in ('resuelto', 'archivado', 'rechazado', 'desistido'):
                dias_restantes = (tramite.fecha_limite - hoy).days

            return Response({
                'tipo':            'detalle',
                'numero_tramite':  tramite.numero_tramite,
                'asunto':          tramite.asunto,
                'tipo_tramite':    tramite.tipo_tramite.nombre if tramite.tipo_tramite_id else None,
                'categoria':       tramite.tipo_tramite.categoria.nombre if tramite.tipo_tramite_id else None,
                'estado':          tramite.get_estado_display(),
                'estado_key':      tramite.estado,
                'prioridad':       tramite.prioridad,
                'canal_ingreso':   tramite.canal_ingreso,
                'unidad':          tramite.unidad_responsable.nombre if tramite.unidad_responsable_id else None,
                'unidad_siglas':   tramite.unidad_responsable.siglas if tramite.unidad_responsable_id else None,
                'fecha_ingreso':   tramite.fecha_ingreso.strftime('%d/%m/%Y %H:%M'),
                'fecha_limite':    tramite.fecha_limite.strftime('%d/%m/%Y'),
                'fecha_resolucion': tramite.fecha_resolucion.strftime('%d/%m/%Y %H:%M') if tramite.fecha_resolucion else None,
                'dentro_plazo':    tramite.dentro_plazo,
                'dias_restantes':  dias_restantes,
                'calificacion':    tramite.calificacion,
                'seguimientos': [
                    {
                        'estado':      s['estado_nuevo'],
                        'observacion': s['observacion'],
                        'fecha':       s['creado_en'].strftime('%d/%m/%Y %H:%M'),
                    }
                    for s in seguimientos
                ],
            })
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado. Verifica el número ingresado.'}, status=404)


class CalificarTramiteView(APIView):
    permission_classes = []  # público

    def post(self, request):
        numero      = request.data.get('numero_tramite', '').strip()
        calificacion = request.data.get('calificacion')
        comentario  = request.data.get('comentario', '')

        if not numero or not calificacion:
            return Response({'detail': 'Número de trámite y calificación son obligatorios.'}, status=400)

        try:
            tramite = Tramite.objects.get(numero_tramite=numero, estado='resuelto')
            if tramite.calificacion:
                return Response({'detail': 'Este trámite ya fue calificado.'}, status=400)
            tramite.calificacion         = int(calificacion)
            tramite.comentario_ciudadano = comentario
            tramite.save(update_fields=['calificacion', 'comentario_ciudadano'])
            return Response({'detail': 'Gracias por tu calificación.'})
        except Tramite.DoesNotExist:
            return Response({'detail': 'Trámite no encontrado o no está resuelto.'}, status=404)