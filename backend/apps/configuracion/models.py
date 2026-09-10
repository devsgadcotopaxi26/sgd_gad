from django.db import models


class ConfiguracionSistema(models.Model):
    """Parámetros globales del sistema — singleton (solo un registro)."""

    # Datos institucionales
    nombre_institucion   = models.CharField(max_length=200, default='Gobierno Autónomo Descentralizado Provincial de Cotopaxi')
    siglas_institucion   = models.CharField(max_length=20, default='GAD COTOPAXI')
    ruc_institucion      = models.CharField(max_length=13, blank=True)
    direccion            = models.CharField(max_length=300, blank=True, default='Latacunga, Ecuador')
    telefono             = models.CharField(max_length=50, blank=True)
    sitio_web            = models.URLField(blank=True, default='https://cotopaxi.gob.ec')
    email_institucional  = models.EmailField(blank=True, default='sgd@cotopaxi.gob.ec')
    logo_url             = models.URLField(blank=True, default='https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg')

    # Configuración de documentos
    numeracion_por_anio  = models.BooleanField(default=True, help_text='Reinicia numeración cada año')
    formato_numero       = models.CharField(max_length=50, default='{PREFIJO}-{NUM}-{SIGLAS}-{ANIO}', help_text='Formato del número de documento')
    abreviatura_institucion = models.CharField(
        max_length=12, default='GADPC',
        help_text='Código corto de la institución para la numeración documental (token "institucion", p. ej. GADPC-DA-2026-0455-C)')
    dias_alerta_vencimiento = models.SmallIntegerField(default=3, help_text='Días antes del vencimiento para alertar')

    # Configuración SMTP (override del .env, opcional)
    smtp_host            = models.CharField(max_length=200, blank=True)
    smtp_port            = models.SmallIntegerField(null=True, blank=True)
    smtp_usuario         = models.EmailField(blank=True)
    smtp_use_tls         = models.BooleanField(default=True)
    smtp_remitente       = models.CharField(max_length=200, blank=True)

    # Pie de página para PDFs
    pie_pagina_pdf       = models.TextField(blank=True, default='Gobierno Autónomo Descentralizado Provincial de Cotopaxi · Latacunga, Ecuador')

    creado_en            = models.DateTimeField(auto_now_add=True)
    modificado_en        = models.DateTimeField(auto_now=True)
    modificado_por       = models.ForeignKey(
        'usuarios.Usuario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='configuraciones_modificadas'
    )

    class Meta:
        db_table = 'cfg_configuracion'

    def __str__(self):
        return self.nombre_institucion

    @classmethod
    def get(cls):
        """Retorna la configuración singleton, creándola si no existe."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj