# F2-F ajuste — la unicidad de nombre entre carpetas hermanas aplica SOLO a
# las carpetas ACTIVAS: al desactivar una carpeta (soft-delete) su nombre
# queda libre para recrear una homónima en el mismo nivel.
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0022_carpetas_virtuales'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='carpetavirtual',
            name='uq_carpeta_unidad_padre_nombre',
        ),
        migrations.AddConstraint(
            model_name='carpetavirtual',
            constraint=models.UniqueConstraint(
                fields=('unidad', 'padre', 'nombre_norm'),
                name='uq_carpeta_unidad_padre_nombre',
                condition=Q(activa=True),
                nulls_distinct=False,
            ),
        ),
    ]
