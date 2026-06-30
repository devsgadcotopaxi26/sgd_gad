# Modelos de auditoria
from django.db import models


class Notificacion(models.Model):
    TIPO_CHOICES = [
        ('tramite',   'Trámite'),
        ('documento', 'Documento'),
        ('correo',    'Correo'),
        ('sistema',   'Sistema'),
        ('alerta',    'Alerta'),
    ]
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('enviado',   'Enviado'),
        ('leido',     'Leído'),
        ('fallido',   'Fallido'),
    ]

    usuario         = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.CASCADE, related_name='notificaciones'
    )
    tipo            = models.CharField(max_length=20, choices=TIPO_CHOICES)
    titulo          = models.CharField(max_length=200)
    mensaje         = models.TextField()
    url_accion      = models.CharField(max_length=200, blank=True)
    leido           = models.BooleanField(default=False)
    leido_en        = models.DateTimeField(null=True, blank=True)
    estado          = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    tramite         = models.ForeignKey(
        'tramites.Tramite', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notificaciones'
    )
    documento       = models.ForeignKey(
        'documentos.Documento', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notificaciones'
    )
    creado_en       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'not_notificacion'
        ordering = ['-creado_en']
        indexes  = [
            models.Index(fields=['usuario', 'leido']),
            models.Index(fields=['creado_en']),
        ]

    def __str__(self):
        return f'{self.usuario} — {self.titulo}'

class LogAuditoria(models.Model):
    ACCION_CHOICES = [
        ('INSERT',   'Creación'),
        ('UPDATE',   'Modificación'),
        ('DELETE',   'Eliminación'),
        ('LOGIN',    'Inicio de sesión'),
        ('LOGOUT',   'Cierre de sesión'),
        ('FIRMA',    'Firma electrónica'),
        ('DESCARGA', 'Descarga'),
        ('VISTA',    'Vista'),
        ('ANULACION','Anulación'),
    ]

    tabla            = models.CharField(max_length=60)
    registro_id      = models.BigIntegerField(null=True, blank=True)
    accion           = models.CharField(max_length=20, choices=ACCION_CHOICES)
    datos_antes      = models.JSONField(null=True, blank=True)
    datos_despues    = models.JSONField(null=True, blank=True)
    campos_cambiados = models.TextField(null=True, blank=True)
    usuario_id       = models.IntegerField(null=True, blank=True)
    usuario_email    = models.CharField(max_length=200, blank=True)
    unidad_id        = models.IntegerField(null=True, blank=True)
    ip_address       = models.GenericIPAddressField(null=True, blank=True)
    user_agent       = models.TextField(blank=True)
    modulo           = models.CharField(max_length=40, blank=True)
    descripcion      = models.TextField(blank=True)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'aud_log'
        managed   = False  # la tabla ya existe, creada por el trigger
        ordering  = ['-creado_en']
        indexes   = [
            models.Index(fields=['accion']),
            models.Index(fields=['modulo']),
            models.Index(fields=['tabla']),
            models.Index(fields=['usuario_id']),
            models.Index(fields=['-creado_en']),
        ]

    def __str__(self):
        return f'{self.accion} — {self.tabla} — {self.creado_en}'