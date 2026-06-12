import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UsuarioManager(BaseUserManager):

    def create_user(self, email, nombres, apellidos, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user  = self.model(email=email, nombres=nombres, apellidos=apellidos, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nombres, apellidos, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('tipo', 'funcionario')
        return self.create_user(email, nombres, apellidos, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):

    TIPO_CHOICES = [
        ('funcionario', 'Funcionario'),
        ('ciudadano',   'Ciudadano'),
        ('sistema',     'Sistema'),
    ]

    uuid                = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    tipo                = models.CharField(max_length=20, choices=TIPO_CHOICES, default='funcionario')
    cedula              = models.CharField(max_length=13, unique=True, null=True, blank=True)
    nombres             = models.CharField(max_length=150)
    apellidos           = models.CharField(max_length=150)
    email               = models.EmailField(max_length=200, unique=True)
    email_institucional = models.EmailField(max_length=200, unique=True, null=True, blank=True)
    telefono_movil      = models.CharField(max_length=20, blank=True)
    telefono_fijo       = models.CharField(max_length=20, blank=True)

    unidad              = models.ForeignKey(
        'organizacion.Unidad',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='usuarios',
        db_column='unidad_id',
    )
    cargo               = models.CharField(max_length=200, blank=True)
    fecha_ingreso       = models.DateField(null=True, blank=True)

    firma_electronica   = models.BooleanField(default=False)
    cert_bce_serial     = models.CharField(max_length=100, blank=True)
    cert_bce_expira     = models.DateField(null=True, blank=True)

    activo              = models.BooleanField(default=True)
    bloqueado           = models.BooleanField(default=False)
    motivo_bloqueo      = models.TextField(blank=True)
    ultimo_acceso       = models.DateTimeField(null=True, blank=True)
    intentos_fallidos   = models.SmallIntegerField(default=0)

    is_active           = models.BooleanField(default=True)
    is_staff            = models.BooleanField(default=False)
    creado_en           = models.DateTimeField(auto_now_add=True)
    modificado_en       = models.DateTimeField(auto_now=True)
    creado_por          = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='usuarios_creados',
    )

    objects = UsuarioManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nombres', 'apellidos']

    class Meta:
        db_table         = 'usr_usuario'
        verbose_name     = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering         = ['apellidos', 'nombres']
        indexes = [
            models.Index(fields=['cedula']),
            models.Index(fields=['email']),
            models.Index(fields=['tipo']),
            models.Index(fields=['activo']),
        ]

    def __str__(self):
        return f'{self.apellidos} {self.nombres} <{self.email}>'

    @property
    def nombre_completo(self):
        return f'{self.nombres} {self.apellidos}'

    def registrar_acceso(self):
        from django.utils import timezone
        self.ultimo_acceso    = timezone.now()
        self.intentos_fallidos = 0
        self.save(update_fields=['ultimo_acceso', 'intentos_fallidos'])

    def incrementar_intento_fallido(self):
        self.intentos_fallidos += 1
        if self.intentos_fallidos >= 5:
            self.bloqueado      = True
            self.motivo_bloqueo = 'Bloqueado por exceso de intentos fallidos'
        self.save(update_fields=['intentos_fallidos', 'bloqueado', 'motivo_bloqueo'])


class Rol(models.Model):
    codigo      = models.CharField(max_length=40, unique=True)
    nombre      = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    nivel       = models.SmallIntegerField(default=99)
    activo      = models.BooleanField(default=True)

    class Meta:
        db_table = 'usr_rol'
        ordering = ['nivel']

    def __str__(self):
        return self.nombre


class UsuarioRol(models.Model):
    usuario      = models.ForeignKey(Usuario,  on_delete=models.CASCADE,  related_name='roles')
    rol          = models.ForeignKey(Rol,       on_delete=models.CASCADE)
    unidad       = models.ForeignKey(
        'organizacion.Unidad',
        null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    desde        = models.DateField(auto_now_add=True)
    hasta        = models.DateField(null=True, blank=True)
    activo       = models.BooleanField(default=True)
    asignado_por = models.ForeignKey(
    Usuario, null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name='roles_asignados',
    db_column='asignado_por',
)
    creado_en    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'usr_usuario_rol'
        unique_together = ('usuario', 'rol', 'unidad')


class Sesion(models.Model):
    ESTADO_CHOICES = [
        ('activa',   'Activa'),
        ('cerrada',  'Cerrada'),
        ('expirada', 'Expirada'),
        ('revocada', 'Revocada'),
    ]

    usuario       = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='sesiones')
    token_jti     = models.CharField(max_length=100, unique=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    user_agent    = models.TextField(blank=True)
    dispositivo   = models.CharField(max_length=50, blank=True)
    inicio        = models.DateTimeField(auto_now_add=True)
    fin           = models.DateTimeField(null=True, blank=True)
    duracion_seg  = models.IntegerField(null=True, blank=True)
    estado        = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    motivo_cierre = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'usr_sesion'
        ordering = ['-inicio']