# Modelos de organizacion
from django.db import models


class Nivel(models.Model):
    codigo    = models.CharField(max_length=20, unique=True)
    nombre    = models.CharField(max_length=100)
    orden     = models.SmallIntegerField(default=99)
    activo    = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'org_nivel'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class Funcion(models.Model):
    codigo      = models.CharField(max_length=20, unique=True)
    nombre      = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    activo      = models.BooleanField(default=True)

    class Meta:
        db_table = 'org_funcion'

    def __str__(self):
        return self.nombre


class Unidad(models.Model):
    TIPO_CHOICES = [
        ('prefectura',     'Prefectura'),
        ('viceprefectura', 'Viceprefectura'),
        ('consejo',        'Consejo Provincial'),
        ('direccion',      'Dirección'),
        ('unidad',         'Unidad'),
        ('coordinacion',   'Coordinación'),
        ('secretaria',     'Secretaría'),
        ('asesoria',       'Asesoría'),
        ('procuraduria',   'Procuraduría'),
        ('zona',           'Zona/Sistema'),
    ]

    padre          = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='hijos')
    nivel          = models.ForeignKey(Nivel, on_delete=models.PROTECT)
    funcion        = models.ForeignKey(Funcion, null=True, blank=True, on_delete=models.SET_NULL)
    codigo         = models.CharField(max_length=30, unique=True)
    nombre         = models.CharField(max_length=200)
    nombre_corto   = models.CharField(max_length=80, blank=True)
    siglas         = models.CharField(max_length=20, blank=True)
    tipo           = models.CharField(max_length=30, choices=TIPO_CHOICES)
    mision         = models.TextField(blank=True)
    responsable_id = models.IntegerField(null=True, blank=True)
    email_oficial  = models.CharField(max_length=150, blank=True)
    telefono       = models.CharField(max_length=30, blank=True)
    piso_ubicacion = models.CharField(max_length=50, blank=True)
    activo         = models.BooleanField(default=True)
    orden_display  = models.SmallIntegerField(default=99)
    creado_en      = models.DateTimeField(auto_now_add=True)
    modificado_en  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'org_unidad'
        ordering = ['orden_display', 'nombre']
        indexes  = [
            models.Index(fields=['padre']),
            models.Index(fields=['activo']),
            models.Index(fields=['tipo']),
        ]

    def __str__(self):
        return f'{self.siglas or self.codigo} — {self.nombre}'

    def get_ruta(self):
        partes = [self.nombre_corto or self.nombre]
        padre  = self.padre
        while padre:
            partes.insert(0, padre.nombre_corto or padre.nombre)
            padre = padre.padre
        return ' > '.join(partes)