from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0008_add_firmado_estado'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='QuipuxBandejaSGD',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('radi_nume_text', models.CharField(db_index=True, max_length=50)),
                ('radi_asunto', models.CharField(blank=True, max_length=350)),
                ('cedula_usuario', models.CharField(db_index=True, max_length=20)),
                ('tipo', models.SmallIntegerField()),
                ('accion', models.CharField(choices=[('reasignacion', 'Reasignación'), ('comentario', 'Comentario'), ('archivado', 'Archivado')], max_length=20)),
                ('observacion', models.TextField(blank=True)),
                ('creado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quipux_derivaciones', to=settings.AUTH_USER_MODEL)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'doc_quipux_bandeja',
                'ordering': ['-creado_en'],
            },
        ),
    ]
