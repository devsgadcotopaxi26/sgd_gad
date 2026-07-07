from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0011_quipux_avance_contenido_origen'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipodocumento',
            name='secuencial_inicial',
            field=models.IntegerField(default=0, help_text='Secuencial desde el que inicia la numeración (para migración desde Quipux)'),
        ),
    ]
