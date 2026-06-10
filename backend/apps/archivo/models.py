# Modelos de archivo
from django.db import models


class Serie(models.Model):
    DISPOSICION_CHOICES = [
        ('conservacion',   'Conservación permanente'),
        ('eliminacion',    'Eliminación'),
        ('digitalizacion', 'Digitalización'),
        ('muestreo',       'Muestreo'),
    ]

    codigo             = models.CharField(max_length=30, unique=True)
    nombre             = models.CharField(max_length=200)
    descripcion        = models.TextField(blank=True)
    anos_retencion     = models.SmallIntegerField(default=5)
    anos_central       = models.SmallIntegerField(default=10)
    disposicion_final  = models.CharField(max_length=20, choices=DISPOSICION_CHOICES, default='conservacion')
    activo             = models.BooleanField(default=True)

    class Meta:
        db_table = 'arc_serie'
        ordering = ['codigo']

    def __str__(self):
        return f'{self.codigo} — {self.nombre}'


class Expediente(models.Model):
    SOPORTE_CHOICES = [
        ('digital', 'Digital'),
        ('fisico',  'Físico'),
        ('mixto',   'Mixto'),
    ]
    ESTADO_CHOICES = [
        ('abierto',     'Abierto'),
        ('cerrado',     'Cerrado'),
        ('transferido', 'Transferido'),
        ('eliminado',   'Eliminado'),
    ]

    serie               = models.ForeignKey(Serie, on_delete=models.PROTECT, related_name='expedientes')
    unidad              = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, related_name='expedientes')
    codigo_expediente   = models.CharField(max_length=60, unique=True)
    titulo              = models.CharField(max_length=300)
    descripcion         = models.TextField(blank=True)
    fecha_inicio        = models.DateField(null=True, blank=True)
    fecha_cierre        = models.DateField(null=True, blank=True)
    num_fojas           = models.IntegerField(default=0)
    soporte             = models.CharField(max_length=20, choices=SOPORTE_CHOICES, default='digital')
    ubicacion_fisica    = models.CharField(max_length=200, blank=True)
    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='abierto')
    fecha_expurgo       = models.DateField(null=True, blank=True)
    creado_por          = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    creado_en           = models.DateTimeField(auto_now_add=True)
    modificado_en       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'arc_expediente'
        ordering = ['-creado_en']
        indexes  = [
            models.Index(fields=['serie']),
            models.Index(fields=['unidad']),
            models.Index(fields=['estado']),
            models.Index(fields=['codigo_expediente']),
        ]

    def __str__(self):
        return f'{self.codigo_expediente} — {self.titulo}'

    def generar_codigo(self):
        from django.utils import timezone
        anio   = timezone.now().year
        siglas = self.unidad.siglas or 'GAD'
        ultimo = Expediente.objects.filter(
            codigo_expediente__startswith=f'EXP-{siglas}-{anio}'
        ).count()
        self.codigo_expediente = f'EXP-{siglas}-{anio}-{str(ultimo + 1).zfill(4)}'


class ExpedienteDocumento(models.Model):
    expediente    = models.ForeignKey(Expediente, on_delete=models.CASCADE, related_name='documentos')
    documento     = models.ForeignKey('documentos.Documento', null=True, blank=True, on_delete=models.SET_NULL)
    tramite       = models.ForeignKey('tramites.Tramite',     null=True, blank=True, on_delete=models.SET_NULL)
    correo        = models.ForeignKey('correos.Correo',       null=True, blank=True, on_delete=models.SET_NULL)
    orden_foja    = models.IntegerField(null=True, blank=True)
    agregado_en   = models.DateTimeField(auto_now_add=True)
    agregado_por  = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)

    class Meta:
        db_table = 'arc_expediente_doc'
        ordering = ['orden_foja', 'agregado_en']

    def __str__(self):
        return f'{self.expediente.codigo_expediente} — foja {self.orden_foja}'