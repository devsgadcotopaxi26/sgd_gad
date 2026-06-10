# Modelos de tramites
from django.db import models


class Categoria(models.Model):
    codigo  = models.CharField(max_length=20, unique=True)
    nombre  = models.CharField(max_length=150)
    icono   = models.CharField(max_length=60, blank=True)
    activo  = models.BooleanField(default=True)
    orden   = models.SmallIntegerField(default=99)

    class Meta:
        db_table = 'tra_categoria'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class TipoTramite(models.Model):
    categoria             = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='tipos')
    unidad_responsable    = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT)
    codigo                = models.CharField(max_length=30, unique=True)
    nombre                = models.CharField(max_length=200)
    descripcion           = models.TextField(blank=True)
    base_legal            = models.TextField(blank=True)
    dias_plazo            = models.SmallIntegerField(default=15)
    costo                 = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    requiere_inspeccion   = models.BooleanField(default=False)
    en_linea              = models.BooleanField(default=True)
    activo                = models.BooleanField(default=True)
    creado_en             = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tra_tipo_tramite'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Requisito(models.Model):
    tipo_tramite     = models.ForeignKey(TipoTramite, on_delete=models.CASCADE, related_name='requisitos')
    nombre           = models.CharField(max_length=200)
    descripcion      = models.TextField(blank=True)
    obligatorio      = models.BooleanField(default=True)
    formato_aceptado = models.CharField(max_length=100, default='pdf')
    orden            = models.SmallIntegerField(default=99)

    class Meta:
        db_table = 'tra_requisito'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class Persona(models.Model):
    TIPO_CHOICES = [
        ('natural',  'Persona Natural'),
        ('juridica', 'Persona Jurídica'),
    ]
    IDENTIFICACION_CHOICES = [
        ('cedula',    'Cédula'),
        ('ruc',       'RUC'),
        ('pasaporte', 'Pasaporte'),
        ('otro',      'Otro'),
    ]

    tipo_persona          = models.CharField(max_length=20, choices=TIPO_CHOICES, default='natural')
    tipo_identificacion   = models.CharField(max_length=20, choices=IDENTIFICACION_CHOICES, default='cedula')
    numero_identificacion = models.CharField(max_length=20, unique=True)
    nombres               = models.CharField(max_length=150)
    apellidos             = models.CharField(max_length=150, blank=True)
    nombre_comercial      = models.CharField(max_length=200, blank=True)
    representante_legal   = models.CharField(max_length=200, blank=True)
    email                 = models.EmailField(max_length=200, blank=True)
    email_alternativo     = models.EmailField(max_length=200, blank=True)
    telefono_movil        = models.CharField(max_length=20, blank=True)
    telefono_fijo         = models.CharField(max_length=20, blank=True)
    provincia             = models.CharField(max_length=80, blank=True)
    canton                = models.CharField(max_length=80, blank=True)
    parroquia             = models.CharField(max_length=80, blank=True)
    direccion             = models.TextField(blank=True)
    fecha_nacimiento      = models.DateField(null=True, blank=True)
    genero                = models.CharField(max_length=20, blank=True)
    nacionalidad          = models.CharField(max_length=60, default='Ecuatoriana')
    usuario               = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='personas'
    )
    notificacion_email    = models.BooleanField(default=True)
    activo                = models.BooleanField(default=True)
    creado_en             = models.DateTimeField(auto_now_add=True)
    modificado_en         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ciu_persona'
        ordering = ['apellidos', 'nombres']
        indexes  = [
            models.Index(fields=['numero_identificacion']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f'{self.numero_identificacion} — {self.nombres} {self.apellidos}'

    @property
    def nombre_completo(self):
        if self.tipo_persona == 'juridica':
            return self.nombre_comercial or self.nombres
        return f'{self.nombres} {self.apellidos}'.strip()


class Tramite(models.Model):
    ESTADO_CHOICES = [
        ('ingresado',      'Ingresado'),
        ('asignado',       'Asignado'),
        ('en_proceso',     'En proceso'),
        ('en_inspeccion',  'En inspección'),
        ('resuelto',       'Resuelto'),
        ('rechazado',      'Rechazado'),
        ('desistido',      'Desistido'),
        ('archivado',      'Archivado'),
    ]
    CANAL_CHOICES = [
        ('ventanilla', 'Ventanilla'),
        ('web',        'Portal web'),
        ('email',      'Correo electrónico'),
        ('oficio',     'Oficio'),
        ('telefono',   'Teléfono'),
    ]
    PRIORIDAD_CHOICES = [
        ('normal',      'Normal'),
        ('urgente',     'Urgente'),
        ('muy_urgente', 'Muy urgente'),
    ]
    RESOLUCION_CHOICES = [
        ('favorable',    'Favorable'),
        ('desfavorable', 'Desfavorable'),
        ('derivado',     'Derivado'),
        ('desistido',    'Desistido'),
        ('improcedente', 'Improcedente'),
    ]

    uuid                  = models.UUIDField(unique=True, editable=False)
    numero_tramite        = models.CharField(max_length=30, unique=True)
    tipo_tramite          = models.ForeignKey(TipoTramite, on_delete=models.PROTECT)
    persona               = models.ForeignKey(Persona, on_delete=models.PROTECT, related_name='tramites')
    canal_ingreso         = models.CharField(max_length=30, choices=CANAL_CHOICES, default='ventanilla')
    unidad_receptora      = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.PROTECT, related_name='tramites_recibidos'
    )
    unidad_responsable    = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.PROTECT, related_name='tramites_responsables'
    )
    usuario_receptor      = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='tramites_recibidos'
    )
    usuario_asignado      = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='tramites_asignados'
    )
    asunto                = models.CharField(max_length=500)
    detalle               = models.TextField(blank=True)
    estado                = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='ingresado')
    prioridad             = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='normal')
    fecha_ingreso         = models.DateTimeField(auto_now_add=True)
    fecha_limite          = models.DateField()
    fecha_asignacion      = models.DateTimeField(null=True, blank=True)
    fecha_resolucion      = models.DateTimeField(null=True, blank=True)
    dias_resolucion       = models.SmallIntegerField(null=True, blank=True)
    dentro_plazo          = models.BooleanField(null=True, blank=True)
    tipo_resolucion       = models.CharField(max_length=30, choices=RESOLUCION_CHOICES, blank=True)
    resolucion_texto      = models.TextField(blank=True)
    calificacion          = models.SmallIntegerField(null=True, blank=True)
    comentario_ciudadano  = models.TextField(blank=True)
    creado_en             = models.DateTimeField(auto_now_add=True)
    modificado_en         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tra_tramite'
        ordering = ['-fecha_ingreso']
        indexes  = [
            models.Index(fields=['numero_tramite']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_limite']),
            models.Index(fields=['persona']),
        ]

    def __str__(self):
        return f'{self.numero_tramite} — {self.asunto[:50]}'


class Seguimiento(models.Model):
    tramite          = models.ForeignKey(Tramite, on_delete=models.CASCADE, related_name='seguimientos')
    estado_anterior  = models.CharField(max_length=30, blank=True)
    estado_nuevo     = models.CharField(max_length=30)
    observacion      = models.TextField(blank=True)
    usuario          = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    unidad           = models.ForeignKey('organizacion.Unidad', null=True, blank=True, on_delete=models.SET_NULL)
    visible_ciudadano = models.BooleanField(default=True)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tra_seguimiento'
        ordering = ['-creado_en']


class DocumentoAdjunto(models.Model):
    TIPO_CHOICES = [
        ('ciudadano',    'Del ciudadano'),
        ('sistema',      'Del sistema'),
        ('resolucion',   'Resolución'),
        ('notificacion', 'Notificación'),
        ('inspeccion',   'Inspección'),
    ]

    tramite           = models.ForeignKey(Tramite, on_delete=models.CASCADE, related_name='adjuntos')
    requisito         = models.ForeignKey(Requisito, null=True, blank=True, on_delete=models.SET_NULL)
    nombre_archivo    = models.CharField(max_length=255)
    tipo_mime         = models.CharField(max_length=100)
    tamano_bytes      = models.BigIntegerField()
    archivo_lo        = models.IntegerField()
    hash_sha256       = models.CharField(max_length=64, blank=True)
    tipo_adjunto      = models.CharField(max_length=30, choices=TIPO_CHOICES, default='ciudadano')
    subido_por        = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    verificado        = models.BooleanField(default=False)
    verificado_por    = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='adjuntos_verificados'
    )
    verificado_en     = models.DateTimeField(null=True, blank=True)
    creado_en         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tra_documento_adjunto'
        ordering = ['-creado_en']