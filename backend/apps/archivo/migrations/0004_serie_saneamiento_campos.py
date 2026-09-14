import django.contrib.postgres.fields
import apps.archivo.models
from django.db import migrations, models


def poblar_origen_documentacion_arr(apps, schema_editor):
    """
    Traslada el valor histórico de origen_documentacion (string simple)
    al nuevo campo en lista, preservando el dato existente:
      'fisico'  -> ['fisico']
      'digital' -> ['digital']
      'hibrido' -> ['fisico', 'digital']  (compatibilidad con registros legados)
    """
    Serie = apps.get_model('archivo', 'Serie')
    mapeo = {
        'fisico':  ['fisico'],
        'digital': ['digital'],
        'hibrido': ['fisico', 'digital'],
    }
    for serie in Serie.objects.all():
        valor = serie.origen_documentacion
        serie.origen_documentacion_arr = mapeo.get(valor, [valor] if valor else ['digital'])
        serie.save(update_fields=['origen_documentacion_arr'])


def revertir_origen_documentacion_arr(apps, schema_editor):
    """
    Reversa: toma el primer valor de la lista (o 'hibrido' si contiene ambos)
    para reconstruir el string simple original.
    """
    Serie = apps.get_model('archivo', 'Serie')
    for serie in Serie.objects.all():
        valores = serie.origen_documentacion_arr or []
        if len(valores) >= 2:
            serie.origen_documentacion = 'hibrido'
        elif valores:
            serie.origen_documentacion = valores[0]
        else:
            serie.origen_documentacion = 'digital'
        serie.save(update_fields=['origen_documentacion'])


class Migration(migrations.Migration):

    dependencies = [
        ('archivo', '0003_alter_serie_seccion'),
    ]

    operations = [
        # ── Condición de acceso: se retira 'reservado' de las opciones válidas.
        # No se toca ningún dato existente (0 registros usaban 'reservado').
        migrations.AlterField(
            model_name='serie',
            name='condicion_acceso',
            field=models.CharField(
                choices=[('publico', 'Público'), ('confidencial', 'Confidencial')],
                default='publico', max_length=20,
            ),
        ),

        # ── Plazos de conservación: rechazo de valores negativos a nivel de BD.
        migrations.AlterField(
            model_name='serie',
            name='anos_gestion',
            field=models.PositiveSmallIntegerField(default=2, help_text='Años en Archivo de Gestión'),
        ),
        migrations.AlterField(
            model_name='serie',
            name='anos_central',
            field=models.PositiveSmallIntegerField(default=13, help_text='Años en Archivo Central (acumulado desde gestión)'),
        ),

        # ── Base legal: de CharField(300) a texto libre (igual que Descripción).
        migrations.AlterField(
            model_name='serie',
            name='base_legal',
            field=models.TextField(blank=True, help_text='Ley y artículo que determina el plazo'),
        ),

        # ── Origen de la documentación: de string simple a selección múltiple.
        # Se preserva el valor histórico mediante una columna temporal +
        # migración de datos, en vez de descartar la información existente.
        migrations.AddField(
            model_name='serie',
            name='origen_documentacion_arr',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[('fisico', 'Físico'), ('digital', 'Digital y Electrónica')],
                    max_length=20,
                ),
                blank=True, default=list, size=None,
            ),
        ),
        migrations.RunPython(poblar_origen_documentacion_arr, revertir_origen_documentacion_arr),
        migrations.RemoveField(
            model_name='serie',
            name='origen_documentacion',
        ),
        migrations.RenameField(
            model_name='serie',
            old_name='origen_documentacion_arr',
            new_name='origen_documentacion',
        ),
        migrations.AlterField(
            model_name='serie',
            name='origen_documentacion',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[('fisico', 'Físico'), ('digital', 'Digital y Electrónica')],
                    max_length=20,
                ),
                blank=True, default=apps.archivo.models.list_origen_digital, size=None,
                help_text='Uno o ambos: físico, digital y electrónica',
            ),
        ),
    ]
