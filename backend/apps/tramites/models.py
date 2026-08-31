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
    # null=True (no solo blank=True): la BD tiene un CHECK heredado que solo
    # acepta 'masculino'/'femenino'/'otro'/'no_indica' o NULL — nunca ''.
    # Sin null=True, Django intenta guardar '' cuando no se especifica y la
    # inserción falla para cualquier Persona nueva sin este dato.
    genero                = models.CharField(max_length=20, null=True, blank=True)
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
        ('email',      'Correo electrónico'),
        ('web',        'Digital / Web'),
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
    # tipo_tramite y persona son opcionales: en el registro inicial de
    # Ventanilla no siempre se conoce la clasificación del trámite ni existe
    # una Persona identificada — se completan/relacionan después si aplica.
    tipo_tramite          = models.ForeignKey(TipoTramite, on_delete=models.PROTECT, null=True, blank=True)
    persona               = models.ForeignKey(Persona, on_delete=models.PROTECT, related_name='tramites', null=True, blank=True)

    # --- Datos del oficio recibido en el registro inicial ---
    numero_oficio         = models.CharField(max_length=50, blank=True, help_text='Numeración institucional del oficio; puede ser "S/N"')
    fecha_documento       = models.DateField(null=True, blank=True, help_text='Fecha que consta en el oficio recibido (distinta de fecha_ingreso)')
    procedencia           = models.CharField(max_length=200, blank=True, help_text='Institución/organización/persona de la que proviene el oficio')
    firmante_oficio       = models.CharField(max_length=200, blank=True, help_text='Quien firma el oficio, en texto libre — no depende de persona')
    # Snapshot histórico de la identificación del firmante AL MOMENTO de este
    # trámite — deliberadamente independiente de Persona.numero_identificacion
    # (que puede no existir, o cambiar de titular en un caso límite). NO usar
    # como fuente de verdad para nada distinto de "qué identificación constaba
    # en este trámite"; nunca reconstruir desde Persona. null=True (y no solo
    # blank=True) porque debe poder quedar sin valor real cuando no hubo
    # identificación disponible, no solo cadena vacía.
    cedula_firmante       = models.CharField(max_length=20, null=True, blank=True, help_text='Identificación (cédula/RUC) del firmante registrada para este trámite — snapshot histórico, no depende de Persona')
    cargo_firmante        = models.CharField(max_length=150, blank=True, help_text='Cargo de quien firma el oficio')
    # Snapshot del contacto AL MOMENTO de este trámite — deliberadamente
    # independientes de Persona.telefono_movil/email, que pueden cambiar con
    # el tiempo. Actualizar los datos maestros de Persona no debe alterar
    # estos valores históricos.
    telefono_contacto     = models.CharField(max_length=20, blank=True, help_text='Teléfono de contacto vigente para este trámite (no depende de Persona)')
    correo_contacto       = models.EmailField(max_length=200, blank=True, help_text='Correo de contacto vigente para este trámite (no depende de Persona)')

    canal_ingreso         = models.CharField(max_length=30, choices=CANAL_CHOICES, default='ventanilla')
    # Opcionales (RN-TRAM-011): la unidad receptora/responsable no siempre se
    # conoce al registrar. unidad_responsable en particular es un concepto
    # distinto de "quién registra" — se asigna después, en el direccionamiento.
    unidad_receptora      = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.PROTECT, related_name='tramites_recibidos',
        null=True, blank=True,
    )
    unidad_responsable    = models.ForeignKey(
        'organizacion.Unidad', on_delete=models.PROTECT, related_name='tramites_responsables',
        null=True, blank=True,
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

    def save(self, *args, **kwargs):
        # RN-TRAM-002: numero_oficio siempre debe quedar con un valor —
        # "S/N" si el usuario lo deja vacío o solo con espacios. Se normaliza
        # aquí (no en el serializer) para que rija tanto en creación como en
        # cualquier edición futura, sin depender del frontend.
        self.numero_oficio = self.numero_oficio.strip() if self.numero_oficio else ''
        if not self.numero_oficio:
            self.numero_oficio = 'S/N'
        super().save(*args, **kwargs)


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