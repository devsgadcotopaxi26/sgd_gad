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