# Modelos de documentos
import uuid
from django.contrib.postgres.fields import ArrayField
from django.db import models


def _estructura_numeracion_default():
    """Estructura por defecto del número documental (formato Quipux observado:
    `inst-dep-anio-secuencial-tipodoc`)."""
    return ['institucion', 'area', 'anio', 'secuencial', 'abreviatura']


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
    # ANTECEDENTE de "Documentos Asociados" (F2-E). 1 antecedente máx · N
    # consecuentes (`respuestas`). Lo fija Responder (automático) y Asociar
    # (manual). Ninguna acción de bandeja lo destruye.
    responde_a          = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='respuestas'
    )
    # DORMIDO — semántica todavía NO confirmada. NO usar para antecedente/
    # consecuente (eso es `responde_a`). Ver MIGRACION_QUIPUX_ASOCIADOS.md.
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
    eliminado_en        = models.DateTimeField(null=True, blank=True)
    eliminado_por       = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='documentos_eliminados'
    )
    motivo_eliminacion  = models.TextField(blank=True)
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
        """Compat. — antes construía el número definitivo con un `count()`
        global por tipo. Ahora delega en la numeración configurable por
        Unidad × TipoDocumento: asigna un número PROVISIONAL ("…-TEMP"). El
        número definitivo se asigna al oficializar (firma/envío) vía
        `apps.documentos.numeracion.asignar_numero_definitivo`."""
        from .numeracion import numero_provisional
        numero_provisional(self)


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
        ('eliminados',       'Eliminados'),
        # Documentos puestos EN CONOCIMIENTO del usuario mediante la acción
        # "Informar" (no es destinatario principal ni copia inicial; no cambia
        # responsable; lectura independiente). Coherente con QUIPUX ("informados").
        ('informados',       'Informados'),
    ]
    ACCION_CHOICES = [
        ('pendiente',   'Pendiente'),
        ('leido',       'Leído'),
        ('reasignado',  'Reasignado'),
        ('informado',   'Informado'),
        ('archivado',   'Archivado'),
        ('comentado',   'Comentado'),
        ('respondido',  'Respondido'),
        ('eliminado',   'Eliminado'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='bandejas')
    usuario          = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='bandeja_documentos')
    unidad           = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, null=True, blank=True)
    bandeja          = models.CharField(max_length=30, choices=BANDEJA_CHOICES)
    # Solo se rellena mientras `bandeja == 'archivados'`: guarda de qué bandeja
    # (Recibidos o Enviados — únicos orígenes válidos de "Archivar") provino el
    # ítem, para poder devolverlo a su sitio al Restaurar. NO es histórico: al
    # restaurar vuelve a NULL (la trazabilidad histórica va en SeguimientoDocumento).
    bandeja_origen   = models.CharField(
        max_length=30, null=True, blank=True,
        choices=[('recibidos', 'Recibidos'), ('enviados', 'Enviados')],
    )
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
        # Inverso de 'archivado' — el ítem vuelve de Archivados a su bandeja de
        # origen. Distinto de 'restaurado' (que es salir de la papelera).
        ('desarchivado', 'Restaurado de archivados'),
        ('respondido',  'Respondido'),
        ('recuperado',  'Recuperado'),
        ('eliminado',   'Eliminado'),
        ('restaurado',  'Restaurado'),
        # Ciclo de vida de Tarea (doc_tarea) — la tarea NO transfiere
        # responsabilidad documental; solo deja rastro en el recorrido del doc.
        ('tarea_creada',     'Tarea creada'),
        ('tarea_iniciada',   'Tarea iniciada'),
        ('tarea_completada', 'Tarea completada'),
        ('tarea_cancelada',  'Tarea cancelada'),
        # Documentos asociados (Documento.responde_a) — antecedente/consecuente.
        # `asociado` se registra en el CONSECUENTE (apunta a su antecedente);
        # `desasociado` cuando se rompe el vínculo.
        ('asociado',    'Documento asociado'),
        ('desasociado', 'Documento desasociado'),
    ]

    documento        = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='seguimiento_quipux')
    etapa            = models.CharField(max_length=20, choices=ETAPA_CHOICES)
    usuario          = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    unidad           = models.ForeignKey('organizacion.Unidad', null=True, blank=True, on_delete=models.SET_NULL)
    # Tarea concreta que originó el evento (solo en etapas 'tarea_*'). Opcional:
    # la mayoría de seguimientos documentales no corresponden a una tarea.
    # SET_NULL: si la tarea se borra, el evento histórico se conserva.
    tarea            = models.ForeignKey('Tarea', null=True, blank=True, on_delete=models.SET_NULL, related_name='seguimientos')
    # Otro Documento referido por el evento (solo en 'asociado'/'desasociado'/
    # 'respondido'): el antecedente/consecuente concreto. FK estructurada, no
    # texto. SET_NULL: si ese documento se borra, el evento histórico se conserva.
    documento_relacionado = models.ForeignKey(
        Documento, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )
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
        ordering = ['creado_en']

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


class ConfiguracionNumeracion(models.Model):
    """Configuración de FORMATO de numeración para una combinación
    Unidad × TipoDocumento. Independiente de la jerarquía (padre/hijo NO
    hereda) y del contador operativo (ver `SecuenciaDocumento`).

    `estructura` es una lista ordenada de tokens de un enum cerrado:
    'institucion' | 'area' | 'anio' | 'secuencial' | 'abreviatura'
    (+ 'literal:<texto>' para casos futuros — nunca código ejecutable).
    """
    unidad            = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.CASCADE, related_name='config_numeracion')
    tipo_documento    = models.ForeignKey(
        TipoDocumento, on_delete=models.CASCADE, related_name='config_numeracion')
    abreviatura       = models.CharField(max_length=8, blank=True)
    separador         = models.CharField(max_length=3, default='-')
    digitos_anio      = models.PositiveSmallIntegerField(default=4)
    digitos_secuencia = models.PositiveSmallIntegerField(default=4)
    estructura        = models.JSONField(default=_estructura_numeracion_default)
    activo            = models.BooleanField(default=True)
    creado_en         = models.DateTimeField(auto_now_add=True)
    modificado_en     = models.DateTimeField(auto_now=True)
    creado_por        = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    modificado_por    = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        db_table = 'doc_config_numeracion'
        constraints = [
            models.UniqueConstraint(fields=['unidad', 'tipo_documento'],
                                    name='uq_config_num_unidad_tipo'),
        ]

    def __str__(self):
        return f'{self.unidad.siglas} / {self.tipo_documento.codigo}'


class SecuenciaDocumento(models.Model):
    """Contador OPERATIVO de numeración por Unidad × TipoDocumento × Año.
    Separado de la configuración de formato. `ultimo_numero` es la última
    secuencia DEFINITIVA emitida (0 = ninguna); el próximo documento oficial
    usa `ultimo_numero + 1`. `ultimo_provisional` es un contador aparte para
    los números "…-TEMP" de los borradores — no se mezcla con el oficial.
    """
    unidad             = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.CASCADE, related_name='secuencias')
    tipo_documento     = models.ForeignKey(
        TipoDocumento, on_delete=models.CASCADE, related_name='secuencias')
    anio               = models.PositiveSmallIntegerField()
    ultimo_numero      = models.PositiveIntegerField(default=0)
    ultimo_provisional = models.PositiveIntegerField(default=0)
    actualizado_en     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doc_secuencia'
        constraints = [
            models.UniqueConstraint(fields=['unidad', 'tipo_documento', 'anio'],
                                    name='uq_secuencia_unidad_tipo_anio'),
        ]

    def __str__(self):
        return f'{self.unidad.siglas}/{self.tipo_documento.codigo}/{self.anio} = {self.ultimo_numero}'


def _norm_nombre_carpeta(nombre: str) -> str:
    """Normalización para la unicidad de carpetas hermanas: sin espacios
    sobrantes y sin distinción de mayúsculas ('Convenios' == ' convenios ')."""
    return ' '.join((nombre or '').strip().lower().split())


class CarpetaVirtual(models.Model):
    """
    Carpeta Virtual (F2-F) — CLASIFICACIÓN OPERATIVA de una Unidad/Área.

    NO es bandeja, expediente, archivo físico/institucional, serie/subserie,
    preservación ni copia del documento. Solo responde: "¿cómo quiere ESTA
    unidad organizar internamente este documento?".

    - Pertenece a UNA `Unidad`; toda la rama (padre→hijos) es de esa unidad.
    - La comparten (en CONSULTA) todos los usuarios del área.
    - Es independiente de Documentos Asociados y del módulo de Archivo/Expedientes.

    Reglas funcionales (ver `servicios_carpeta.py`):
      R1 — los documentos en elaboración (borrador/en_revision) no se clasifican
           por endpoint ni se listan en la vista compartida.
      R2 — ADMINISTRAR el árbol (crear/renombrar/mover/desactivar/reactivar)
           es exclusivo de ADMIN_GENERAL / superusuario.
      R3 — el usuario normal solo CONSULTA su árbol y clasifica documentos.
      R4 — "eliminar" carpeta = DESACTIVACIÓN LÓGICA recursiva (`activa=False`),
           nunca borrado físico; no toca documentos ni clasificaciones.
      R5 — matriz de bandejas: clasificar solo desde Recibidos / Enviados /
           Archivados / Tareas Recibidas / Tareas Enviadas.
    """
    unidad         = models.ForeignKey('organizacion.Unidad', on_delete=models.CASCADE,
                                       related_name='carpetas_virtuales')
    nombre         = models.CharField(max_length=120)
    nombre_norm    = models.CharField(max_length=120, editable=False)
    padre          = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE,
                                       related_name='subcarpetas')
    activa         = models.BooleanField(default=True)
    creada_por     = models.ForeignKey('usuarios.Usuario', null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='+')
    creado_en      = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doc_carpeta_virtual'
        ordering = ['nombre']
        indexes  = [
            models.Index(fields=['unidad', 'padre']),
        ]
        constraints = [
            # Hermanas ACTIVAS (mismo padre, misma unidad) no pueden repetir
            # nombre normalizado. `condition=activa` → una carpeta desactivada
            # (soft-delete) libera su nombre. nulls_distinct=False → aplica
            # también a las raíces (padre IS NULL). PostgreSQL 15+.
            models.UniqueConstraint(
                fields=['unidad', 'padre', 'nombre_norm'],
                name='uq_carpeta_unidad_padre_nombre',
                condition=models.Q(activa=True),
                nulls_distinct=False,
            ),
        ]

    def save(self, *args, **kwargs):
        self.nombre = (self.nombre or '').strip()
        self.nombre_norm = _norm_nombre_carpeta(self.nombre)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.unidad.siglas or self.unidad.codigo} / {self.ruta()}'

    def ruta(self) -> str:
        partes, actual, n = [self.nombre], self.padre, 0
        while actual is not None and n < 50:
            partes.insert(0, actual.nombre)
            actual, n = actual.padre, n + 1
        return ' > '.join(partes)


class DocumentoCarpetaVirtual(models.Model):
    """
    Clasificación de UN `Documento` en UNA `CarpetaVirtual`, para UNA `Unidad`.

    Regla fundamental (constraint de BD): `(documento, unidad)` es único — un
    documento tiene MÁXIMO una carpeta por unidad. Reclasificar = UPDATE de
    `carpeta` sobre la fila existente, nunca una fila nueva.

    Unidades distintas clasifican el MISMO documento de forma independiente
    (Jurídico→Convenios y Financiero→Presupuesto es el mismo `Documento`).

    Clasificar NO modifica el documento, su estado, su bandeja, su
    responsable ni sus destinatarios. `unidad` se denormaliza desde
    `carpeta.unidad` (para el índice y el constraint).
    """
    documento      = models.ForeignKey(Documento, on_delete=models.CASCADE,
                                       related_name='clasificaciones_carpeta')
    unidad         = models.ForeignKey('organizacion.Unidad', on_delete=models.CASCADE,
                                       related_name='+')
    carpeta        = models.ForeignKey(CarpetaVirtual, on_delete=models.CASCADE,
                                       related_name='documentos')
    asignado_por   = models.ForeignKey('usuarios.Usuario', null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='+')
    asignado_en    = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doc_documento_carpeta'
        indexes  = [
            models.Index(fields=['carpeta']),
            models.Index(fields=['unidad', 'documento']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['documento', 'unidad'],
                                    name='uq_doc_carpeta_por_unidad'),
        ]

    def __str__(self):
        return f'{self.documento_id} → {self.carpeta.ruta()}'