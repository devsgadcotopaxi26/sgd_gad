"""
Modelos de archivo — conforme a la Regla Técnica Nacional para la
Organización y Mantenimiento de los Archivos Públicos (Acuerdo SGPR-2019-0107)
"""
from django.db import models


# ── Cuadro General de Clasificación Documental (Art. 28-30) ──────────

class Fondo(models.Model):
    """Nivel 1: representa a la entidad pública. Único por institución (Art. 28.2)."""
    nombre      = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    activo      = models.BooleanField(default=True)
    creado_en   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'arc_fondo'

    def __str__(self):
        return self.nombre


class Seccion(models.Model):
    """Nivel 2: división del fondo, representa a una unidad administrativa (Art. 28.4.b)."""
    fondo       = models.ForeignKey(Fondo, on_delete=models.PROTECT, related_name='secciones')
    unidad      = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, related_name='secciones_archivo')
    codigo      = models.CharField(max_length=20, unique=True)
    nombre      = models.CharField(max_length=200)
    seccion_padre = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='subsecciones')
    activo      = models.BooleanField(default=True)

    class Meta:
        db_table = 'arc_seccion'
        ordering = ['codigo']

    def __str__(self):
        return f'{self.codigo} — {self.nombre}'


class Serie(models.Model):
    """Nivel 3: serie o subserie documental (Art. 28.4.c)."""
    ORIGEN_CHOICES = [
        ('fisico',    'Físico'),
        ('digital',   'Digital'),
        ('hibrido',   'Híbrido (físico y digital)'),
    ]
    ACCESO_CHOICES = [
        ('publico',      'Público'),
        ('confidencial', 'Confidencial'),
        ('reservado',    'Reservado'),
    ]
    DISPOSICION_CHOICES = [
        ('conservacion', 'Conservación permanente'),
        ('eliminacion',  'Eliminación'),
    ]
    TECNICA_SELECCION_CHOICES = [
        ('completa', 'Conservación completa'),
        ('parcial',  'Conservación parcial / muestreo'),
        ('na',       'No aplica'),
    ]

    seccion             = models.ForeignKey(Seccion, on_delete=models.PROTECT, related_name='series')
    serie_padre         = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='subseries')
    codigo              = models.CharField(max_length=30, unique=True)
    nombre              = models.CharField(max_length=200)
    descripcion         = models.TextField(blank=True, help_text='Breve explicación del contenido de la serie (Art. 28.4.d)')
    origen_documentacion = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default='digital')
    condicion_acceso    = models.CharField(max_length=20, choices=ACCESO_CHOICES, default='publico')

    # Tabla de Plazos de Conservación Documental (Art. 46)
    anos_gestion        = models.SmallIntegerField(default=2, help_text='Años en Archivo de Gestión')
    anos_central        = models.SmallIntegerField(default=13, help_text='Años en Archivo Central (acumulado desde gestión)')
    base_legal          = models.CharField(max_length=300, blank=True, help_text='Ley y artículo que determina el plazo')
    disposicion_final   = models.CharField(max_length=20, choices=DISPOSICION_CHOICES, default='conservacion')
    tecnica_seleccion   = models.CharField(max_length=20, choices=TECNICA_SELECCION_CHOICES, default='na')

    activo              = models.BooleanField(default=True)
    creado_en           = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'arc_serie'
        ordering = ['codigo']

    def __str__(self):
        return f'{self.codigo} — {self.nombre}'

    @property
    def anos_retencion(self):
        """Compatibilidad con el campo anterior (Gestión + Central acumulado)."""
        return self.anos_gestion


# ── Categorías del ciclo vital del documento (Art. 11) ────────────────

class Expediente(models.Model):
    SOPORTE_CHOICES = [
        ('digital', 'Digital'),
        ('fisico',  'Físico'),
        ('mixto',   'Mixto (híbrido)'),
    ]
    ESTADO_CHOICES = [
        ('abierto',     'Abierto'),
        ('cerrado',     'Cerrado'),
        ('transferido', 'Transferido'),
        ('eliminado',   'Eliminado'),
    ]
    CATEGORIA_CHOICES = [
        ('gestion',    'Archivo de Gestión'),
        ('central',    'Archivo Central'),
        ('intermedio', 'Archivo Intermedio'),
        ('historico',  'Archivo Histórico'),
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
    numero_caja         = models.CharField(max_length=30, blank=True)
    numero_parte        = models.CharField(max_length=10, blank=True, help_text='Ej: 1/3 si el expediente tiene varios volúmenes')

    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='abierto')
    categoria_actual    = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='gestion')

    expurgado           = models.BooleanField(default=False)
    fecha_expurgo       = models.DateField(null=True, blank=True)
    foliado             = models.BooleanField(default=False)
    fecha_foliacion     = models.DateField(null=True, blank=True)

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
            models.Index(fields=['categoria_actual']),
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

    @property
    def fecha_limite_categoria(self):
        """Calcula cuándo debe transferirse según la Tabla de Plazos."""
        from datetime import timedelta
        if not self.fecha_cierre:
            return None
        serie = self.serie
        if self.categoria_actual == 'gestion':
            return self.fecha_cierre.replace(year=self.fecha_cierre.year + serie.anos_gestion)
        if self.categoria_actual == 'central':
            return self.fecha_cierre.replace(year=self.fecha_cierre.year + serie.anos_central)
        return None


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


# ── Transferencias documentales (Art. 47-50) ───────────────────────────

class Transferencia(models.Model):
    TIPO_CHOICES = [
        ('primaria',   'Primaria (Gestión → Central)'),
        ('secundaria', 'Secundaria (Central → Intermedio)'),
        ('final',      'Final (Intermedio → Histórico)'),
    ]
    ESTADO_CHOICES = [
        ('borrador',  'Borrador'),
        ('solicitada','Solicitada'),
        ('revisada',  'Revisada y cotejada'),
        ('aceptada',  'Aceptada — acuse de recibo'),
        ('rechazada', 'Rechazada'),
    ]

    tipo              = models.CharField(max_length=20, choices=TIPO_CHOICES)
    unidad            = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, related_name='transferencias')
    estado            = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')

    numero_memorando  = models.CharField(max_length=60, blank=True)
    fecha_solicitud   = models.DateField(null=True, blank=True)
    fecha_revision    = models.DateField(null=True, blank=True)
    fecha_aceptacion  = models.DateField(null=True, blank=True)

    solicitado_por    = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='transferencias_solicitadas')
    revisado_por      = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='transferencias_revisadas')

    observaciones     = models.TextField(blank=True)
    creado_en         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'arc_transferencia'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Transferencia {self.tipo} — {self.unidad} — {self.estado}'


class TransferenciaExpediente(models.Model):
    """Inventario de la transferencia: qué expedientes se mueven (Art. 48.4)."""
    transferencia = models.ForeignKey(Transferencia, on_delete=models.CASCADE, related_name='expedientes')
    expediente    = models.ForeignKey(Expediente, on_delete=models.PROTECT, related_name='transferencias')
    signatura_topografica = models.CharField(max_length=60, blank=True, help_text='Ubicación física asignada al recibir')

    class Meta:
        db_table = 'arc_transferencia_exp'
        unique_together = ('transferencia', 'expediente')

    def __str__(self):
        return f'{self.transferencia} — {self.expediente.codigo_expediente}'


# ── Baja documental (Art. 53) ─────────────────────────────────────────

class BajaDocumental(models.Model):
    ESTADO_CHOICES = [
        ('borrador',          'Borrador'),
        ('valorada',          'Valorada por el equipo'),
        ('enviada_validacion','Enviada a validación'),
        ('dictaminada',       'Dictaminada — aprobada'),
        ('rechazada',         'Rechazada'),
        ('ejecutada',         'Ejecutada — documentos eliminados'),
    ]

    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')
    unidad              = models.ForeignKey('organizacion.Unidad', on_delete=models.PROTECT, related_name='bajas_documentales')

    # Ficha Técnica de Prevaloración (Art. 45)
    caracter_proceso    = models.CharField(max_length=20, choices=[
        ('gobernante', 'Gobernante'), ('sustantivo', 'Sustantivo'), ('adjetivo', 'Adjetivo'),
    ], default='adjetivo')
    justificacion       = models.TextField(help_text='Por qué se propone la eliminación')
    normativa_legal     = models.CharField(max_length=300, blank=True)
    numero_expedientes  = models.IntegerField(default=0)
    numero_cajas        = models.IntegerField(default=0)
    metros_lineales     = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    fecha_dictamen      = models.DateField(null=True, blank=True)
    fecha_ejecucion     = models.DateField(null=True, blank=True)

    solicitado_por      = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='bajas_solicitadas')
    aprobado_por        = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='bajas_aprobadas')

    creado_en           = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'arc_baja_documental'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Baja documental {self.id} — {self.unidad} — {self.estado}'


class BajaExpediente(models.Model):
    baja          = models.ForeignKey(BajaDocumental, on_delete=models.CASCADE, related_name='expedientes')
    expediente    = models.ForeignKey(Expediente, on_delete=models.PROTECT, related_name='bajas')

    class Meta:
        db_table = 'arc_baja_exp'
        unique_together = ('baja', 'expediente')


# ── Préstamo documental (Art. 60) ──────────────────────────────────────

class PrestamoDocumental(models.Model):
    ESTADO_CHOICES = [
        ('activo',     'Activo'),
        ('devuelto',   'Devuelto'),
        ('vencido',    'Vencido'),
        ('extraviado', 'Extraviado'),
    ]

    expediente       = models.ForeignKey(Expediente, on_delete=models.PROTECT, related_name='prestamos')
    solicitante      = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT, related_name='prestamos_solicitados')
    autorizado_por   = models.ForeignKey('usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='prestamos_autorizados')

    fecha_prestamo   = models.DateField(auto_now_add=True)
    fecha_devolucion_esperada = models.DateField()
    fecha_devolucion_real     = models.DateField(null=True, blank=True)

    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')
    observaciones    = models.TextField(blank=True)

    class Meta:
        db_table = 'arc_prestamo'
        ordering = ['-fecha_prestamo']

    def __str__(self):
        return f'Préstamo {self.expediente.codigo_expediente} — {self.solicitante}'


# ── Copias certificadas (Art. 61-63) ───────────────────────────────────

class CopiaCertificada(models.Model):
    expediente      = models.ForeignKey(Expediente, on_delete=models.PROTECT, related_name='copias_certificadas')
    solicitante_nombre = models.CharField(max_length=200)
    solicitante_cedula = models.CharField(max_length=20, blank=True)
    motivo          = models.TextField(blank=True)
    numero_fojas    = models.IntegerField(default=0)

    certificado_por = models.ForeignKey('usuarios.Usuario', on_delete=models.PROTECT)
    fecha_emision   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'arc_copia_certificada'
        ordering = ['-fecha_emision']

    def __str__(self):
        return f'Copia certificada — {self.expediente.codigo_expediente}'