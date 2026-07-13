# Modelos de documentos
import uuid
from django.contrib.postgres.fields import ArrayField
from django.db import models


class TipoDocumento(models.Model):
    codigo               = models.CharField(max_length=20, unique=True)
    nombre               = models.CharField(max_length=100)
    prefijo_numeracion   = models.CharField(max_length=20)
    requiere_firma       = models.BooleanField(default=False)
    requiere_aprobacion  = models.BooleanField(default=False)
    dias_plazo_default   = models.SmallIntegerField(default=15)
    activo               = models.BooleanField(default=True)
    orden                = models.SmallIntegerField(default=99)
    secuencial_inicial   = models.IntegerField(default=0, help_text='Secuencial desde el que inicia la numeración (para migración desde Quipux)')

    class Meta:
        db_table = 'doc_tipo_documento'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class Documento(models.Model):
    ESTADO_CHOICES = [
        ('borrador',    'Borrador'),
        ('en_revision', 'En revisión'),
        ('firmado',     'Firmado'),
        ('aprobado',    'Aprobado'),
        ('enviado',     'Enviado'),
        ('recibido',    'Recibido'),
        ('archivado',   'Archivado'),
        ('anulado',     'Anulado'),
    ]
    PRIORIDAD_CHOICES = [
        ('normal',      'Normal'),
        ('urgente',     'Urgente'),
        ('muy_urgente', 'Muy urgente'),
    ]

    uuid                = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    tipo_documento      = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT)
    numero_documento    = models.CharField(max_length=60, unique=True, null=True, blank=True)
    anio                = models.SmallIntegerField()
    numero_secuencial   = models.IntegerField(null=True, blank=True)
    asunto              = models.CharField(max_length=500)
    cuerpo              = models.TextField(blank=True)
    resumen             = models.TextField(blank=True)
    palabras_clave = ArrayField(
        models.CharField(max_length=100), 
        blank=True, 
        default=list
    )
    etiquetas           = models.JSONField(default=list, blank=True)
    remitente_nombre    = models.CharField(max_length=200, blank=True, help_text='Nombre de quien remite, si el documento proviene de fuera del GAD')
    remitente_email     = models.EmailField(max_length=200, blank=True)
    remitente_entidad   = models.CharField(max_length=200, blank=True, help_text='Institución externa remitente, ej: Contraloría General del Estado')
    unidad_origen       = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.PROTECT,
        related_name='documentos_emitidos'
    )
    unidad_destino      = models.ForeignKey(
        'organizacion.Unidad', null=True, blank=True,
        on_delete=models.PROTECT, related_name='documentos_recibidos'
    )
    creado_por          = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.PROTECT,
        related_name='documentos_creados'
    )
    firmado_por         = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.PROTECT, related_name='documentos_firmados'
    )
    remitente           = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.PROTECT, related_name='documentos_como_remitente',
        help_text='Firmante previsto cuando es distinto al creador'
    )
    estado              = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='borrador')
    prioridad           = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='normal')
    confidencial        = models.BooleanField(default=False)
    requiere_respuesta  = models.BooleanField(default=False)
    fecha_limite_resp   = models.DateField(null=True, blank=True)
    responde_a          = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='respuestas'
    )
    relacionado_con     = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='relacionados'
    )
    fecha_elaboracion   = models.DateField(auto_now_add=True)
    fecha_firma         = models.DateTimeField(null=True, blank=True)
    fecha_envio         = models.DateTimeField(null=True, blank=True)
    fecha_recepcion     = models.DateTimeField(null=True, blank=True)
    fecha_archivo       = models.DateTimeField(null=True, blank=True)
    hash_sha256         = models.CharField(max_length=64, blank=True)
    firma_bce_info      = models.JSONField(null=True, blank=True)
    num_paginas         = models.SmallIntegerField(null=True, blank=True)
    tamano_bytes        = models.BigIntegerField(null=True, blank=True)
    vistas              = models.IntegerField(default=0)
    creado_en           = models.DateTimeField(auto_now_add=True)
    modificado_en       = models.DateTimeField(auto_now=True)
    anulado_en          = models.DateTimeField(null=True, blank=True)
    anulado_por         = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='documentos_anulados'
    )
    motivo_anulacion    = models.TextField(blank=True)
    quipux_origen       = models.CharField(
        max_length=60, blank=True,
        help_text='radi_nume_text del documento Quipux al que este responde'
    )

    class Meta:
        db_table = 'doc_documento'
        ordering = ['-creado_en']
        indexes  = [
            models.Index(fields=['tipo_documento']),
            models.Index(fields=['estado']),
            models.Index(fields=['unidad_origen']),
            models.Index(fields=['anio']),
        ]

    def __str__(self):
        return f'{self.numero_documento or self.uuid} — {self.asunto[:50]}'

    def generar_numero(self):
        from django.utils import timezone
        anio    = timezone.now().year
        ultimo  = Documento.objects.filter(
            tipo_documento=self.tipo_documento, anio=anio
        ).count()
        # Si hay un secuencial inicial por migración Quipux, arrancar desde ahí
        base = self.tipo_documento.secuencial_inicial or 0
        secuencial = max(ultimo + 1, base + 1)
        siglas     = self.unidad_origen.siglas or 'GAD'
        self.numero_documento  = f'{self.tipo_documento.prefijo_numeracion}-{str(secuencial).zfill(4)}-{siglas}-{anio}'
        self.numero_secuencial = secuencial
        self.anio              = anio


class Destinatario(models.Model):
    TIPO_CHOICES = [
        ('principal',   'Principal'),
        ('copia',       'Copia'),
        ('conocimiento','Conocimiento'),
    ]
    ACCION_CHOICES = [
        ('pendiente',   'Pendiente'),
        ('en_proceso',  'En proceso'),
        ('atendido',    'Atendido'),
        ('archivado',   'Archivado'),
        ('derivado',    'Derivado'),
    ]

    documento     = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='destinatarios')
    unidad        = models.ForeignKey('organizacion.Unidad', null=True, blank=True, on_delete=models.PROTECT)
    usuario       = models.ForeignKey('usuarios.Usuario',   null=True, blank=True, on_delete=models.PROTECT)
    tipo          = models.CharField(max_length=20, choices=TIPO_CHOICES, default='principal')
    leido         = models.BooleanField(default=False)
    leido_en      = models.DateTimeField(null=True, blank=True)
    accion_tomada = models.CharField(max_length=30, choices=ACCION_CHOICES, default='pendiente')
    creado_en     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_destinatario'


class FlujoAprobacion(models.Model):
    TIPO_CHOICES = [
        ('elaboracion', 'Elaboración'),
        ('revision',    'Revisión'),
        ('aprobacion',  'Aprobación'),
        ('firma',       'Firma'),
        ('envio',       'Envío'),
    ]
    ESTADO_CHOICES = [
        ('pendiente',   'Pendiente'),
        ('aprobado',    'Aprobado'),
        ('rechazado',   'Rechazado'),
        ('omitido',     'Omitido'),
        ('en_proceso',  'En proceso'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='flujo')
    paso_numero      = models.SmallIntegerField()
    tipo_accion      = models.CharField(max_length=30, choices=TIPO_CHOICES)
    asignado_a       = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observacion      = models.TextField(blank=True)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_limite     = models.DateTimeField(null=True, blank=True)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'doc_flujo_aprobacion'
        ordering = ['paso_numero']


class VersionDocumento(models.Model):
    documento       = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='versiones')
    numero_version  = models.SmallIntegerField()
    cuerpo          = models.TextField(blank=True)
    creado_por      = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    creado_en       = models.DateTimeField(auto_now_add=True)
    comentario      = models.TextField(blank=True)

    class Meta:
        db_table        = 'doc_version'
        unique_together = ('documento', 'numero_version')
        ordering        = ['-numero_version']

class BandejaDocumento(models.Model):
    BANDEJA_CHOICES = [
        ('recibidos',        'Recibidos'),
        ('en_elaboracion',   'En elaboración'),
        ('enviados',         'Enviados'),
        ('no_enviados',      'No enviados'),
        ('tareas_recibidas', 'Tareas recibidas'),
        ('tareas_enviadas',  'Tareas enviadas'),
        ('archivados',       'Archivados'),
        ('por_imprimir',     'Por imprimir'),
    ]
    ACCION_CHOICES = [
        ('pendiente',   'Pendiente'),
        ('leido',       'Leído'),
        ('reasignado',  'Reasignado'),
        ('informado',   'Informado'),
        ('archivado',   'Archivado'),
        ('comentado',   'Comentado'),
        ('respondido',  'Respondido'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='bandejas')
    usuario          = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='bandeja_documentos')
    unidad           = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, null=True, blank=True)
    bandeja          = models.CharField(max_length=30, choices=BANDEJA_CHOICES)
    accion_tomada    = models.CharField(max_length=20, choices=ACCION_CHOICES, default='pendiente')
    leido            = models.BooleanField(default=False)
    leido_en         = models.DateTimeField(null=True, blank=True)
    es_urgente       = models.BooleanField(default=False)
    numero_referencia = models.CharField(max_length=60, blank=True)
    instrucciones    = models.TextField(blank=True)
    fecha_limite     = models.DateField(null=True, blank=True)
    creado_en        = models.DateTimeField(auto_now_add=True)
    modificado_en    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'doc_bandeja'
        unique_together = ('documento', 'usuario', 'bandeja')
        indexes         = [
            models.Index(fields=['usuario', 'bandeja']),
            models.Index(fields=['leido']),
        ]


class SeguimientoDocumento(models.Model):
    ETAPA_CHOICES = [
        ('elaborado',   'Elaborado'),
        ('firmado',     'Firmado'),
        ('enviado',     'Enviado'),
        ('recibido',    'Recibido'),
        ('reasignado',  'Reasignado'),
        ('informado',   'Informado'),
        ('comentado',   'Comentado'),
        ('archivado',   'Archivado'),
        ('respondido',  'Respondido'),
        ('recuperado',  'Recuperado'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='seguimiento_quipux')
    etapa            = models.CharField(max_length=20, choices=ETAPA_CHOICES)
    usuario          = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    unidad           = models.ForeignKey('organizacion.Unidad', null=True, blank=True, on_delete=models.SET_NULL)
    destinatario_externo = models.CharField(max_length=200, blank=True)
    institucion_externa  = models.CharField(max_length=200, blank=True)
    observacion      = models.TextField(blank=True)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_seguimiento'
        ordering = ['creado_en']


class Tarea(models.Model):
    PRIORIDAD_CHOICES = [
        ('normal',      'Normal'),
        ('urgente',     'Urgente'),
        ('muy_urgente', 'Muy urgente'),
    ]
    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente'),
        ('en_proceso', 'En proceso'),
        ('completada', 'Completada'),
        ('cancelada',  'Cancelada'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='tareas')
    asignada_por     = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='tareas_asignadas')
    asignada_a       = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='tareas_recibidas')
    unidad_destino   = models.ForeignKey('organizacion.Unidad', null=True, blank=True, on_delete=models.SET_NULL)
    descripcion      = models.TextField()
    prioridad        = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='normal')
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha_limite     = models.DateField(null=True, blank=True)
    completada_en    = models.DateTimeField(null=True, blank=True)
    respuesta        = models.TextField(blank=True)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_tarea'
        ordering = ['-creado_en']


class DestinatarioExterno(models.Model):
    TIPO_CHOICES = [
        ('institucion', 'Institución externa'),
        ('ciudadano',   'Ciudadano'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='destinatarios_externos')
    tipo             = models.CharField(max_length=20, choices=TIPO_CHOICES)
    nombre           = models.CharField(max_length=200)
    institucion      = models.CharField(max_length=200, blank=True)
    email            = models.EmailField(max_length=200)
    cedula_ruc       = models.CharField(max_length=20, blank=True)
    enviado          = models.BooleanField(default=False)
    enviado_en       = models.DateTimeField(null=True, blank=True)
    notificado_email = models.BooleanField(default=False)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_destinatario_externo'
class AdjuntoDocumento(models.Model):
    TIPO_CHOICES = [
        ('documento', 'Documento principal'),
        ('anexo',     'Anexo'),
        ('respaldo',  'Respaldo'),
        ('otro',      'Otro'),
    ]
    ORIGEN_DIGITALIZACION_CHOICES = [
        ('institucional', 'Digitalización institucional (300 ppp)'),
        ('quipux',         'Recibido vía Quipux (90 ppp)'),
        ('nativo_digital', 'Nativo digital (no requiere digitalización)'),
    ]
    CALIDAD_CHOICES = [
        ('pendiente',   'Pendiente de control de calidad'),
        ('aprobado',    'Aprobado'),
        ('rechazado',   'Rechazado — requiere nueva digitalización'),
    ]

    documento     = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='archivos_adjuntos', null=True, blank=True)
    tramite       = models.ForeignKey('tramites.Tramite', on_delete=models.CASCADE, related_name='archivos_adjuntos', null=True, blank=True)
    nombre        = models.CharField(max_length=255)
    archivo       = models.FileField(upload_to='adjuntos/%Y/%m/')
    tipo          = models.CharField(max_length=20, choices=TIPO_CHOICES, default='anexo')
    tamanio       = models.BigIntegerField(default=0)
    mime_type     = models.CharField(max_length=100, blank=True)
    subido_por    = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    creado_en     = models.DateTimeField(auto_now_add=True)

    # --- Metadatos de digitalización formal (Regla Técnica Nacional, Art. 68-79, Tabla 13) ---
    origen_digitalizacion = models.CharField(
        max_length=20, choices=ORIGEN_DIGITALIZACION_CHOICES,
        null=True, blank=True
    )
    resolucion_ppp        = models.PositiveSmallIntegerField(null=True, blank=True, help_text='Puntos por pulgada de la digitalización (300 institucional, 90 Quipux)')
    formato_archivo       = models.CharField(max_length=10, blank=True, help_text='PDF/A, TIFF, JPEG, etc.')
    fecha_digitalizacion  = models.DateTimeField(null=True, blank=True)
    digitalizado_por      = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='adjuntos_digitalizados'
    )
    numero_folios         = models.PositiveSmallIntegerField(null=True, blank=True)
    hoja_testigo           = models.BooleanField(default=False, help_text='Indica si el original físico permanece en archivo con hoja testigo')
    ubicacion_fisica       = models.CharField(max_length=200, blank=True, help_text='Caja/estante donde reposa el original físico, si aplica')
    calidad_control        = models.CharField(max_length=20, choices=CALIDAD_CHOICES, default='pendiente')
    calidad_observacion    = models.TextField(blank=True)
    calidad_revisado_por   = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='adjuntos_calidad_revisada'
    )
    calidad_revisado_en     = models.DateTimeField(null=True, blank=True)
    hash_integridad    = models.CharField(max_length=64, blank=True)

    # Búsqueda full-text
    contenido_texto    = models.TextField(blank=True)
    ocr_procesado      = models.BooleanField(default=False)
    ocr_confianza      = models.FloatField(null=True, blank=True)
    idioma_ocr         = models.CharField(max_length=10, default='spa', blank=True)
    paginas            = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'doc_adjunto'
        ordering = ['-creado_en']

    def __str__(self):
        return self.nombre

    @property
    def tamanio_legible(self):
        t = self.tamanio
        for unit in ['B', 'KB', 'MB', 'GB']:
            if t < 1024:
                return f'{t:.1f} {unit}'
            t /= 1024
        return f'{t:.1f} GB'

    @property
    def cumple_norma_institucional(self):
        '''True si la digitalización institucional cumple el mínimo de 300 ppp exigido por la norma.'''
        if self.origen_digitalizacion != 'institucional':
            return None
        return bool(self.resolucion_ppp and self.resolucion_ppp >= 300)


class QuipuxBandejaSGD(models.Model):
    """
    Extiende las bandejas Quipux con acciones registradas en SGD.
    Permite reasignar y comentar documentos históricos Quipux sin
    escribir en la base de datos Quipux (que es read-only).
    """
    ACCION_CHOICES = [
        ('reasignacion', 'Reasignación'),
        ('comentario',   'Comentario'),
        ('archivado',    'Archivado'),
    ]

    radi_nume_text = models.CharField(max_length=50, db_index=True)
    radi_asunto    = models.CharField(max_length=350, blank=True)
    cedula_usuario = models.CharField(max_length=20, db_index=True)
    tipo           = models.SmallIntegerField()  # 2=recibido (reasignacion destino)
    accion         = models.CharField(max_length=20, choices=ACCION_CHOICES)
    observacion    = models.TextField(blank=True)
    creado_por     = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.CASCADE,
        related_name='quipux_derivaciones'
    )
    creado_en      = models.DateTimeField(auto_now_add=True)
    leido          = models.BooleanField(default=False)
    leido_en       = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'doc_quipux_bandeja'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.accion} — {self.radi_nume_text}'


class QuipuxTareaAvance(models.Model):
    """
    Actualizaciones de avance de tareas Quipux almacenadas en SGD.
    La tabla `tarea` de Quipux es read-only; este modelo extiende el avance.
    """
    tarea_codi  = models.IntegerField(db_index=True)   # PK en tarea de Quipux
    avance      = models.SmallIntegerField()            # 0–100
    observacion = models.TextField(blank=True)
    creado_por  = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.CASCADE,
        related_name='quipux_avances'
    )
    creado_en   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_quipux_tarea_avance'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Tarea {self.tarea_codi} → {self.avance}%'


class QuipuxContenidoPDF(models.Model):
    """
    Índice de texto extraído de los PDFs de Quipux para búsqueda full-text.
    Procesado por tarea Celery; la DB documental es read-only.
    """
    radi_nume_text  = models.CharField(max_length=60, unique=True, db_index=True)
    arch_codi       = models.IntegerField()           # arch_codi cuando se extrajo
    contenido_texto = models.TextField(blank=True)
    tiene_contenido = models.BooleanField(default=False)
    es_escaneado    = models.BooleanField(default=False)
    procesado_en    = models.DateTimeField(auto_now_add=True)
    error_extraccion = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'doc_quipux_contenido'

    def __str__(self):
        return self.radi_nume_text


class ListaDistribucion(models.Model):
    nombre       = models.CharField(max_length=250)
    descripcion  = models.CharField(max_length=500, blank=True)
    creado_por   = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='listas_distribucion'
    )
    activo       = models.BooleanField(default=True)
    quipux_id    = models.IntegerField(null=True, blank=True, unique=True,
                                       help_text='lista_codi en Quipux (para deduplicar importaciones)')
    creado_en    = models.DateTimeField(auto_now_add=True)
    modificado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doc_lista_distribucion'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class ListaDistribucionMiembro(models.Model):
    lista    = models.ForeignKey(ListaDistribucion, on_delete=models.CASCADE, related_name='miembros')
    usuario  = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='listas_como_miembro')
    orden    = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'doc_lista_distribucion_miembro'
        unique_together = ('lista', 'usuario')
        ordering = ['orden', 'usuario__apellidos']

    def __str__(self):
        return f'{self.lista.nombre} → {self.usuario.nombre_completo}'