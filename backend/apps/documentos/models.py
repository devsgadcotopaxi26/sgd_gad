# Modelos de documentos
import uuid
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

    class Meta:
        db_table = 'doc_tipo_documento'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class Documento(models.Model):
    ESTADO_CHOICES = [
        ('borrador',    'Borrador'),
        ('en_revision', 'En revisión'),
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
    palabras_clave      = models.JSONField(default=list, blank=True)
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
        secuencial = ultimo + 1
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