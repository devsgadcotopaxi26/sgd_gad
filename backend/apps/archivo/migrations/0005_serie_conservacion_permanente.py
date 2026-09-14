from django.db import migrations, models


def marcar_conservacion_permanente(apps, schema_editor):
    """
    Backfill: las series cuya disposicion_final ya era 'conservacion' pasan a
    conservacion_permanente=True. No se tocan sus anos_gestion/anos_central
    existentes -- se preservan tal cual para no destruir datos históricos,
    aunque la regla para altas nuevas sea dejarlos en null.
    """
    Serie = apps.get_model('archivo', 'Serie')
    Serie.objects.filter(disposicion_final='conservacion').update(conservacion_permanente=True)


def revertir_conservacion_permanente(apps, schema_editor):
    Serie = apps.get_model('archivo', 'Serie')
    Serie.objects.filter(conservacion_permanente=True).update(conservacion_permanente=False)


class Migration(migrations.Migration):

    dependencies = [
        ('archivo', '0004_serie_saneamiento_campos'),
    ]

    operations = [
        migrations.AddField(
            model_name='serie',
            name='conservacion_permanente',
            field=models.BooleanField(default=False, help_text='Si aplica, no tiene plazo expresado en años'),
        ),
        migrations.AlterField(
            model_name='serie',
            name='anos_gestion',
            field=models.PositiveSmallIntegerField(
                blank=True, default=2, null=True,
                help_text='Años en Archivo de Gestión (no aplica si es de conservación permanente)',
            ),
        ),
        migrations.AlterField(
            model_name='serie',
            name='anos_central',
            field=models.PositiveSmallIntegerField(
                blank=True, default=13, null=True,
                help_text='Años en Archivo Central (no aplica si es de conservación permanente)',
            ),
        ),
        migrations.RunPython(marcar_conservacion_permanente, revertir_conservacion_permanente),
    ]
