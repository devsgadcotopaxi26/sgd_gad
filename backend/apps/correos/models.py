from django.db import models


class Correo(models.Model):
    TIPO_CHOICES = [
        ('recibido', 'Recibido'),
        ('enviado',  'Enviado'),
        ('interno',  'Interno'),
    ]
    ESTADO_CHOICES = [
        ('nuevo',      'Nuevo'),
        ('registrado', 'Registrado'),
        ('asignado',   'Asignado'),
        ('en_proceso', 'En proceso'),
        ('respondido', 'Respondido'),
        ('archivado',  'Archivado'),
    ]
    PRIORIDAD_CHOICES = [
        ('normal',      'Normal'),
        ('urgente',     'Urgente'),
        ('muy_urgente', 'Muy urgente'),
    ]

    numero_registro     = models.CharField(max_length=40, unique=True, blank=True)
    tipo                = models.CharField(max_length=20, choices=TIPO_CHOICES, default='recibido')
    asunto              = models.CharField(max_length=500)
    cuerpo              = models.TextField(blank=True)
    remitente_email     = models.EmailField(max_length=200, blank=True)
    remitente_nombre    = models.CharField(max_length=200, blank=True)
    remitente_entidad   = models.CharField(max_length=200, blank=True)
    destinatarios_json  = models.JSONField(default=list, blank=True)
    unidad_destino      = models.ForeignKey(
        'organizacion.Unidad', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='correos_recibidos'
    )
    usuario_asignado    = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='correos_asignados'
    )
    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='nuevo')
    prioridad           = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='normal')
    etiquetas           = models.JSONField(default=list, blank=True)
    fecha_recepcion     = models.DateTimeField(auto_now_add=True)
    fecha_limite_resp   = models.DateField(null=True, blank=True)
    respondido          = models.BooleanField(default=False)
    fecha_respuesta     = models.DateTimeField(null=True, blank=True)
    correo_respuesta    = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='respuestas'
    )
    doc_generado        = models.ForeignKey(
        'documentos.Documento', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='correos_origen'
    )
    tramite_generado    = models.ForeignKey(
        'tramites.Tramite', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='correos_origen'
    )
    num_adjuntos        = models.SmallIntegerField(default=0)
    leido               = models.BooleanField(default=False)
    leido_en            = models.DateTimeField(null=True, blank=True)
    registrado_por      = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='correos_registrados'
    )
    creado_en           = models.DateTimeField(auto_now_add=True)
    archivado_en        = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'cor_correo'
        ordering = ['-fecha_recepcion']
        indexes  = [
            models.Index(fields=['estado']),
            models.Index(fields=['unidad_destino']),
            models.Index(fields=['fecha_recepcion']),
            models.Index(fields=['numero_registro']),
        ]

    def __str__(self):
        return f'{self.numero_registro} — {self.asunto[:50]}'

    def generar_numero(self):
        from django.utils import timezone
        anio   = timezone.now().year
        siglas = self.unidad_destino.siglas if self.unidad_destino else 'GAD'
        ultimo = Correo.objects.filter(
            numero_registro__startswith=f'COR-',
            creado_en__year=anio
        ).count()
        self.numero_registro = f'COR-{str(ultimo + 1).zfill(4)}-{siglas}-{anio}'

    @property
    def vencido(self):
        if not self.fecha_limite_resp or self.respondido:
            return False
        from django.utils import timezone
        return timezone.now().date() > self.fecha_limite_resp

    @property
    def dias_para_vencer(self):
        if not self.fecha_limite_resp or self.respondido:
            return None
        from django.utils import timezone
        return (self.fecha_limite_resp - timezone.now().date()).days


class SeguimientoCorreo(models.Model):
    ETAPA_CHOICES = [
        ('recibido',   'Recibido'),
        ('registrado', 'Registrado'),
        ('asignado',   'Asignado'),
        ('respuesta',  'Respuesta enviada'),
        ('archivado',  'Archivado'),
    ]

    correo          = models.ForeignKey(Correo, on_delete=models.CASCADE, related_name='seguimientos')
    etapa           = models.CharField(max_length=20, choices=ETAPA_CHOICES)
    estado_anterior = models.CharField(max_length=20, blank=True)
    estado_nuevo    = models.CharField(max_length=20)
    observacion     = models.TextField(blank=True)
    usuario         = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.PROTECT, related_name='seguimientos_correo'
    )
    creado_en       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cor_seguimiento'
        ordering = ['creado_en']

    def __str__(self):
        return f'{self.correo.numero_registro} — {self.etapa}'


class AdjuntoCorreo(models.Model):
    correo         = models.ForeignKey(Correo, on_delete=models.CASCADE, related_name='adjuntos')
    nombre_archivo = models.CharField(max_length=255)
    tipo_mime      = models.CharField(max_length=100)
    tamano_bytes   = models.BigIntegerField()
    archivo_lo     = models.IntegerField(default=0)
    hash_sha256    = models.CharField(max_length=64, blank=True)
    creado_en      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cor_adjunto'