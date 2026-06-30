"""
Modelos read-only del sistema Quipux historico.

Todos los modelos tienen managed=False ya que mapean a tablas existentes
en las bases de datos restauradas de Quipux (transaccional y documental).
"""

from django.db import models


# ── Base de datos transaccional ──────────────────────────────


class QuipuxRadicado(models.Model):
    """Documento radicado (tabla principal de Quipux)."""
    radi_nume_radi = models.DecimalField(
        max_digits=20, decimal_places=0, primary_key=True
    )
    radi_nume_text = models.CharField(max_length=50, blank=True, null=True)
    radi_fech_radi = models.DateTimeField()
    radi_fech_ofic = models.DateTimeField(null=True, blank=True)
    radi_nume_deri = models.DecimalField(
        max_digits=20, decimal_places=0, null=True, blank=True
    )
    esta_codi = models.SmallIntegerField(null=True)
    radi_usua_actu = models.IntegerField(null=True)
    radi_leido = models.SmallIntegerField(default=0)
    radi_asunto = models.CharField(max_length=350, blank=True)
    radi_resumen = models.CharField(max_length=1000, blank=True)
    radi_tipo = models.SmallIntegerField(null=True)
    radi_usua_radi = models.IntegerField(null=True)
    radi_usua_rem = models.CharField(max_length=255, blank=True)
    radi_usua_dest = models.CharField(max_length=255, blank=True)
    radi_permiso = models.SmallIntegerField(default=0)
    radi_nomb_usua_firma = models.CharField(max_length=255, blank=True)
    radi_fech_firma = models.DateTimeField(null=True, blank=True)
    radi_cuentai = models.CharField(max_length=50, blank=True)
    radi_archivo = models.SmallIntegerField(default=0)
    arch_codi = models.BigIntegerField(default=0)
    arch_codi_firma = models.BigIntegerField(default=0)
    radi_texto = models.IntegerField(null=True)
    cod_codi = models.BigIntegerField(default=0)
    cat_codi = models.BigIntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'radicado'

    def __str__(self):
        return self.radi_nume_text or str(self.radi_nume_radi)


class QuipuxUsuario(models.Model):
    """Vista materializada de usuarios en Quipux."""
    usua_codi = models.IntegerField(primary_key=True)
    usua_cedula = models.CharField(max_length=50, blank=True)
    usua_nomb = models.CharField(max_length=200, blank=True)
    usua_apellido = models.CharField(max_length=200, blank=True)
    usua_nombre = models.TextField(blank=True)  # full name concatenated
    usua_cargo = models.CharField(max_length=255, blank=True)
    usua_email = models.CharField(max_length=500, blank=True)
    depe_codi = models.IntegerField(null=True)
    depe_nomb = models.CharField(max_length=255, blank=True)
    dep_sigla = models.CharField(max_length=100, blank=True)
    inst_nombre = models.CharField(max_length=255, blank=True)
    inst_sigla = models.CharField(max_length=255, blank=True)

    class Meta:
        managed = False
        db_table = 'usuario'

    def __str__(self):
        return self.usua_nombre or f'{self.usua_nomb} {self.usua_apellido}'


class QuipuxHistEventos(models.Model):
    """Historial de eventos / recorrido de un documento."""
    hist_codi = models.BigIntegerField(primary_key=True)
    hist_fech = models.DateTimeField()
    usua_codi_ori = models.IntegerField()
    radi_nume_radi = models.DecimalField(max_digits=20, decimal_places=0)
    hist_obse = models.CharField(max_length=600)
    usua_codi_dest = models.IntegerField(null=True)
    sgd_ttr_codigo = models.SmallIntegerField(null=True)

    class Meta:
        managed = False
        db_table = 'hist_eventos'
        ordering = ['-hist_fech']

    def __str__(self):
        return f'Evento {self.hist_codi} - {self.hist_fech}'


class QuipuxTipoRad(models.Model):
    """Tipos de radicado (entrada, salida, memorando, etc.)."""
    trad_codigo = models.DecimalField(
        max_digits=1, decimal_places=0, primary_key=True
    )
    trad_descr = models.CharField(max_length=100, blank=True)
    trad_abreviatura = models.CharField(max_length=5, blank=True)
    trad_estado = models.SmallIntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'tiporad'

    def __str__(self):
        return self.trad_descr or str(self.trad_codigo)


class QuipuxDependencia(models.Model):
    """Unidades administrativas / dependencias."""
    depe_codi = models.IntegerField(primary_key=True)
    depe_nomb = models.CharField(max_length=150)
    depe_codi_padre = models.IntegerField(null=True)
    dep_sigla = models.CharField(max_length=100, blank=True)
    depe_estado = models.SmallIntegerField(null=True)
    inst_codi = models.IntegerField(null=True)

    class Meta:
        managed = False
        db_table = 'dependencia'

    def __str__(self):
        return self.depe_nomb


class QuipuxEstado(models.Model):
    """Catalogo de estados de un radicado."""
    esta_codi = models.SmallIntegerField(primary_key=True)
    esta_desc = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'estado'

    def __str__(self):
        return self.esta_desc


class QuipuxTransaccion(models.Model):
    """Tipos de transaccion (reasignar, archivar, etc.)."""
    sgd_ttr_codigo = models.SmallIntegerField(primary_key=True)
    sgd_ttr_descrip = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'sgd_ttr_transaccion'

    def __str__(self):
        return self.sgd_ttr_descrip


# ── Base de datos documental ─────────────────────────────────


class QuipuxArchivoDoc(models.Model):
    """Indice de archivos PDF almacenados en la base documental."""
    arch_codi = models.BigIntegerField(primary_key=True)
    nombre = models.CharField(max_length=500, blank=True)
    fecha_creacion = models.DateTimeField(null=True)
    tamanio = models.BigIntegerField(null=True)
    arch_md5 = models.CharField(max_length=32, blank=True)
    indi_codi = models.IntegerField(null=True)
    estado = models.SmallIntegerField(default=1)

    class Meta:
        managed = False
        db_table = 'archivo'
        app_label = 'quipux'

    def __str__(self):
        return self.nombre or str(self.arch_codi)


class QuipuxArchivoData(models.Model):
    """Contenido Base64 de los archivos PDF."""
    arch_codi = models.BigIntegerField(primary_key=True)
    archivo = models.TextField()  # Base64 encoded PDF

    class Meta:
        managed = False
        db_table = 'archivo_0001'
        app_label = 'quipux'

    def __str__(self):
        return f'Archivo data {self.arch_codi}'
