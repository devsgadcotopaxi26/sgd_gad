from rest_framework import serializers
from .models import (
    TipoDocumento, Documento, Destinatario,
    FlujoAprobacion, VersionDocumento,
    BandejaDocumento, SeguimientoDocumento,
    Tarea, DestinatarioExterno, AdjuntoDocumento,
    ListaDistribucion, ListaDistribucionMiembro,
)
from apps.usuarios.serializers import UsuarioResumenSerializer
class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TipoDocumento
        fields = '__all__'


class DestinatarioSerializer(serializers.ModelSerializer):
    unidad_nombre  = serializers.CharField(source='unidad.nombre',          read_only=True)
    unidad_siglas  = serializers.CharField(source='unidad.siglas',          read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)

    class Meta:
        model  = Destinatario
        fields = '__all__'


class FlujoSerializer(serializers.ModelSerializer):
    asignado_nombre = serializers.CharField(source='asignado_a.nombre_completo', read_only=True)

    class Meta:
        model  = FlujoAprobacion
        fields = '__all__'


class VersionSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model  = VersionDocumento
        fields = '__all__'


class DocumentoListSerializer(serializers.ModelSerializer):
    tipo_nombre      = serializers.CharField(source='tipo_documento.nombre',  read_only=True)
    tipo_prefijo     = serializers.CharField(source='tipo_documento.prefijo_numeracion', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='unidad_origen.nombre',  read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='unidad_origen.siglas',  read_only=True)
    unidad_destino_nombre = serializers.CharField(source='unidad_destino.nombre', read_only=True)
    unidad_destino_siglas = serializers.CharField(source='unidad_destino.siglas', read_only=True)
    creado_por_nombre     = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    firmado_por_nombre    = serializers.CharField(source='firmado_por.nombre_completo', read_only=True)

    class Meta:
        model  = Documento
        fields = [
            'id', 'uuid', 'numero_documento', 'anio', 'asunto', 'estado',
            'prioridad', 'confidencial', 'requiere_respuesta', 'fecha_limite_resp',
            'fecha_elaboracion', 'fecha_firma', 'fecha_envio',
            'tipo_nombre', 'tipo_prefijo',
            'unidad_origen_nombre', 'unidad_origen_siglas',
            'unidad_destino_nombre', 'unidad_destino_siglas',
            'creado_por_nombre', 'firmado_por_nombre',
            'etiquetas', 'remitente_nombre', 'remitente_email', 'remitente_entidad',
            'vistas', 'creado_en',
        ]


class SeguimientoDocumentoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    unidad_nombre  = serializers.CharField(source='unidad.nombre',           read_only=True)
    unidad_siglas  = serializers.CharField(source='unidad.siglas',           read_only=True)

    class Meta:
        model  = SeguimientoDocumento
        fields = '__all__'


class DocumentoDetalleSerializer(serializers.ModelSerializer):
    tipo_nombre           = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='unidad_origen.nombre',  read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='unidad_origen.siglas',  read_only=True)
    unidad_destino_nombre = serializers.CharField(source='unidad_destino.nombre', read_only=True)
    creado_por_nombre     = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    firmado_por_nombre    = serializers.CharField(source='firmado_por.nombre_completo', read_only=True)
    destinatarios         = DestinatarioSerializer(many=True, read_only=True)
    flujo                 = FlujoSerializer(many=True, read_only=True)
    versiones             = VersionSerializer(many=True, read_only=True)
    seguimiento           = SeguimientoDocumentoSerializer(source='seguimiento_quipux', many=True, read_only=True)
    pdf_firmado_url       = serializers.SerializerMethodField()
    # Datos completos del remitente (DE) y del creador — necesarios para que
    # el editor reconstruya el "De" guardado en el documento al reabrirlo,
    # en vez de recalcularlo desde el usuario autenticado.
    remitente_detalle     = UsuarioResumenSerializer(source='remitente', read_only=True)
    creado_por_detalle    = UsuarioResumenSerializer(source='creado_por', read_only=True)

    def get_pdf_firmado_url(self, obj):
        adj = obj.archivos_adjuntos.filter(tipo='documento').order_by('-creado_en').first()
        if adj:
            return f'documentos/adjuntos/{adj.id}/descargar/'
        return None

    class Meta:
        model  = Documento
        fields = '__all__'


class DocumentoCrearSerializer(serializers.ModelSerializer):
    destinatarios_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    remitente_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = Documento
        fields = [
            'id', 'numero_documento', 'uuid',
            'tipo_documento', 'asunto', 'cuerpo', 'resumen',
            'palabras_clave', 'etiquetas', 'unidad_origen', 'unidad_destino',
            'prioridad', 'confidencial', 'requiere_respuesta',
            'fecha_limite_resp', 'responde_a', 'relacionado_con',
            'remitente_nombre', 'remitente_email', 'remitente_entidad',
            'destinatarios_ids', 'remitente_id',
        ]
        read_only_fields = ['id', 'numero_documento', 'uuid']

    def create(self, validated_data):
        from django.utils import timezone
        from apps.usuarios.models import Usuario
        destinatarios_ids = validated_data.pop('destinatarios_ids', [])
        remitente_id = validated_data.pop('remitente_id', None)
        doc = Documento(**validated_data)
        doc.anio = timezone.now().year
        if remitente_id and remitente_id != getattr(doc, 'creado_por_id', None):
            try:
                doc.remitente = Usuario.objects.get(pk=remitente_id)
            except Usuario.DoesNotExist:
                pass
        doc.generar_numero()
        doc.save()
        # Bandeja principal: va al remitente (o al creador si no hay remitente)
        titular_bandeja = doc.remitente if doc.remitente else doc.creado_por
        # El creador acaba de redactar el documento en esta misma sesión —
        # su propio ítem de bandeja nace "leído" (no tiene sentido contarlo
        # como pendiente de un documento que él mismo escribió, y así el
        # contador no_leídos/total de "En elaboración" refleja trabajo
        # realmente nuevo). El remitente/DE designado, si es distinto, SÍ
        # nace pendiente — todavía no lo ha abierto (igual que al reasignar,
        # ver reasignar_a en views.py).
        es_creador_titular = titular_bandeja == doc.creado_por
        BandejaDocumento.objects.create(
            documento=doc,
            usuario=titular_bandeja,
            bandeja='en_elaboracion',
            leido=es_creador_titular,
            leido_en=timezone.now() if es_creador_titular else None,
        )
        # Si el creador es distinto del titular también lo ve en su borrador
        if doc.remitente and doc.remitente != doc.creado_por:
            BandejaDocumento.objects.get_or_create(
                documento=doc,
                usuario=doc.creado_por,
                bandeja='en_elaboracion',
                defaults={'leido': True, 'leido_en': timezone.now()},
            )
        from apps.usuarios.models import Usuario
        dest_nombres = []
        for uid in destinatarios_ids:
            try:
                dest_user = Usuario.objects.select_related('unidad').get(pk=uid)
                Destinatario.objects.create(
                    documento=doc,
                    usuario=dest_user,
                    unidad=dest_user.unidad,
                )
                # NO crear recibidos aquí; se crean al enviar el documento
                dest_nombres.append(dest_user.nombre_completo)
            except Usuario.DoesNotExist:
                pass
        obs_creacion = 'Documento creado en borrador'
        if dest_nombres:
            obs_creacion += f' — Destinatario(s): {", ".join(dest_nombres)}'
        SeguimientoDocumento.objects.create(
            documento=doc,
            etapa='elaborado',
            usuario=doc.creado_por,
            unidad=getattr(doc.creado_por, 'unidad', None),
            observacion=obs_creacion,
        )
        return doc

    def update(self, instance, validated_data):
        destinatarios_ids = validated_data.pop('destinatarios_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if destinatarios_ids is not None:
            from apps.usuarios.models import Usuario
            instance.destinatarios.all().delete()
            dest_nombres = []
            for uid in destinatarios_ids:
                try:
                    dest_user = Usuario.objects.select_related('unidad').get(pk=uid)
                    Destinatario.objects.create(
                        documento=instance,
                        usuario=dest_user,
                        unidad=dest_user.unidad,
                    )
                    # Solo crear/actualizar recibidos si el doc ya fue enviado
                    if instance.estado in ('enviado', 'recibido', 'archivado'):
                        BandejaDocumento.objects.get_or_create(
                            documento=instance,
                            usuario=dest_user,
                            bandeja='recibidos',
                            defaults={'es_urgente': instance.prioridad != 'normal'},
                        )
                    dest_nombres.append(dest_user.nombre_completo)
                except Usuario.DoesNotExist:
                    pass
            if dest_nombres:
                # perform_update registrará el seguimiento general; aquí solo anotamos
                # el cambio de destinatarios en el mismo evento si aplica.
                instance._dest_nombres_actualizados = dest_nombres
        return instance


class BandejaSerializer(serializers.ModelSerializer):
    documento_id          = serializers.IntegerField(read_only=True)
    numero_documento      = serializers.CharField(source='documento.numero_documento', read_only=True)
    asunto                = serializers.CharField(source='documento.asunto',           read_only=True)
    tipo_nombre           = serializers.CharField(source='documento.tipo_documento.nombre', read_only=True)
    tipo_codigo           = serializers.CharField(source='documento.tipo_documento.codigo', read_only=True)
    tipo_prefijo          = serializers.CharField(source='documento.tipo_documento.prefijo_numeracion', read_only=True)
    unidad_origen_nombre  = serializers.CharField(source='documento.unidad_origen.nombre', read_only=True)
    unidad_origen_siglas  = serializers.CharField(source='documento.unidad_origen.siglas', read_only=True)
    creado_por_nombre     = serializers.CharField(source='documento.creado_por.nombre_completo', read_only=True)
    creado_por_id         = serializers.IntegerField(source='documento.creado_por_id', read_only=True)
    estado_documento      = serializers.CharField(source='documento.estado', read_only=True)
    fecha_documento       = serializers.DateTimeField(source='documento.creado_en', read_only=True)
    prioridad             = serializers.CharField(source='documento.prioridad', read_only=True)
    remitente_nombre      = serializers.CharField(source='documento.remitente_nombre', read_only=True)
    remitente_email       = serializers.CharField(source='documento.remitente_email', read_only=True)
    remitente_entidad     = serializers.CharField(source='documento.remitente_entidad', read_only=True)
    # Firmante designado (remitente interno distinto al creador)
    firmante_nombre       = serializers.SerializerMethodField()
    firmante_cargo        = serializers.SerializerMethodField()

    # Firmante designado
    def get_firmante_nombre(self, obj):
        r = obj.documento.remitente
        if r and r.pk != obj.documento.creado_por_id:
            return r.nombre_completo
        return None

    def get_firmante_cargo(self, obj):
        r = obj.documento.remitente
        if r and r.pk != obj.documento.creado_por_id:
            return getattr(r, 'cargo', '') or ''
        return None

    # Ventana de recuperación: minutos restantes (negativo = expiró)
    minutos_para_recuperar = serializers.SerializerMethodField()

    def get_minutos_para_recuperar(self, obj):
        from django.utils import timezone
        VENTANA = 10
        if obj.bandeja not in ('enviados',) and obj.accion_tomada != 'reasignado':
            return None
        ultimo = obj.documento.seguimiento_quipux.filter(
            etapa__in=['enviado', 'reasignado']
        ).order_by('-creado_en').first()
        if not ultimo:
            return None
        elapsed = (timezone.now() - ultimo.creado_en).total_seconds() / 60
        return round(VENTANA - elapsed, 1)

    class Meta:
        model  = BandejaDocumento
        fields = [
            'id', 'documento_id', 'bandeja', 'accion_tomada', 'leido', 'leido_en',
            'es_urgente', 'numero_referencia', 'instrucciones',
            'fecha_limite', 'creado_en',
            'numero_documento', 'asunto', 'tipo_nombre', 'tipo_codigo',
            'tipo_prefijo', 'unidad_origen_nombre', 'unidad_origen_siglas',
            'creado_por_nombre', 'creado_por_id', 'estado_documento', 'fecha_documento', 'prioridad',
            'remitente_nombre', 'remitente_email', 'remitente_entidad',
            'firmante_nombre', 'firmante_cargo', 'minutos_para_recuperar',
        ]


class TareaSerializer(serializers.ModelSerializer):
    asignada_por_nombre = serializers.CharField(source='asignada_por.nombre_completo', read_only=True)
    asignada_a_nombre   = serializers.CharField(source='asignada_a.nombre_completo',   read_only=True)

    class Meta:
        model  = Tarea
        fields = '__all__'

class AdjuntoSerializer(serializers.ModelSerializer):
    nombre                   = serializers.CharField(required=False, default='')
    subido_por_nombre        = serializers.CharField(source='subido_por.nombre_completo', read_only=True)
    digitalizado_por_nombre  = serializers.CharField(source='digitalizado_por.nombre_completo', read_only=True)
    calidad_revisado_por_nombre = serializers.CharField(source='calidad_revisado_por.nombre_completo', read_only=True)
    tamanio_legible          = serializers.ReadOnlyField()
    cumple_norma_institucional = serializers.ReadOnlyField()
    url_descarga              = serializers.SerializerMethodField()

    class Meta:
        model  = AdjuntoDocumento
        fields = [
            'id', 'nombre', 'archivo', 'tipo', 'tamanio',
            'tamanio_legible', 'mime_type', 'subido_por_nombre',
            'creado_en', 'url_descarga',
            'documento', 'tramite',
            'origen_digitalizacion', 'resolucion_ppp', 'formato_archivo',
            'fecha_digitalizacion', 'digitalizado_por_nombre', 'numero_folios',
            'hoja_testigo', 'ubicacion_fisica',
            'calidad_control', 'calidad_observacion',
            'calidad_revisado_por_nombre', 'calidad_revisado_en',
            'hash_integridad', 'cumple_norma_institucional',
        ]

    def get_url_descarga(self, obj):
        return f'/api/v1/documentos/adjuntos/{obj.id}/descargar/'


class ListaMiembroSerializer(serializers.ModelSerializer):
    id               = serializers.IntegerField(source='usuario.id', read_only=True)
    nombre_completo  = serializers.CharField(source='usuario.nombre_completo', read_only=True)
    cargo            = serializers.CharField(source='usuario.cargo', read_only=True)
    titulo           = serializers.CharField(source='usuario.titulo', read_only=True)
    unidad_nombre    = serializers.CharField(source='usuario.unidad.nombre', read_only=True)
    unidad_siglas    = serializers.CharField(source='usuario.unidad.siglas', read_only=True)
    unidad_id        = serializers.IntegerField(source='usuario.unidad_id', read_only=True)

    class Meta:
        model  = ListaDistribucionMiembro
        fields = ['id', 'nombre_completo', 'cargo', 'titulo', 'unidad_nombre', 'unidad_siglas', 'unidad_id', 'orden']


class ListaDistribucionSerializer(serializers.ModelSerializer):
    miembros         = ListaMiembroSerializer(many=True, read_only=True)
    total_miembros   = serializers.SerializerMethodField()
    preview_miembros = serializers.SerializerMethodField()

    class Meta:
        model  = ListaDistribucion
        fields = ['id', 'nombre', 'descripcion', 'activo', 'quipux_id',
                  'total_miembros', 'preview_miembros', 'miembros']

    def get_total_miembros(self, obj):
        return obj.miembros.count()

    def get_preview_miembros(self, obj):
        return list(
            obj.miembros.select_related('usuario')
               .values_list('usuario__apellidos', flat=True)[:3]
        )