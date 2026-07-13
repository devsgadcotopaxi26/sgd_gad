"""
Importa las listas de distribución de la base de datos Quipux
(quipux_transaccional) al modelo ListaDistribucion del SGD-GAD.

Mapeo: usua_cedula de Quipux → cedula de usr_usuario del SGD.

Uso:
    docker exec sgd_backend python manage.py importar_listas_quipux
    docker exec sgd_backend python manage.py importar_listas_quipux --limpiar
"""
from django.core.management.base import BaseCommand
from django.db import connections

from apps.documentos.models import ListaDistribucion, ListaDistribucionMiembro
from apps.usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Importa listas de distribución desde Quipux transaccional'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limpiar', action='store_true',
            help='Elimina listas importadas previamente antes de volver a importar'
        )

    def handle(self, *args, **options):
        if options['limpiar']:
            n = ListaDistribucion.objects.filter(quipux_id__isnull=False).count()
            ListaDistribucion.objects.filter(quipux_id__isnull=False).delete()
            self.stdout.write(self.style.WARNING(f'Eliminadas {n} listas previas'))

        # Construir mapa cédula → Usuario SGD
        cedula_map = {u.cedula: u for u in Usuario.objects.filter(activo=True) if u.cedula}
        self.stdout.write(f'Usuarios SGD con cédula: {len(cedula_map)}')

        with connections['quipux_transaccional'].cursor() as cur:
            # Listas activas
            cur.execute("""
                SELECT lista_codi, lista_nombre, lista_descripcion, lista_usua_codi
                FROM lista
                WHERE lista_estado = 1
                ORDER BY lista_codi
            """)
            listas_quipux = cur.fetchall()

            # Miembros: (lista_codi, usua_codi, usua_cedula, orden)
            cur.execute("""
                SELECT lu.lista_codi, lu.usua_codi, u.usua_cedula, lu.orden
                FROM lista_usuarios lu
                JOIN usuario u ON u.usua_codi = lu.usua_codi
                ORDER BY lu.lista_codi, lu.orden
            """)
            miembros_quipux = cur.fetchall()

        # Agrupar miembros por lista
        miembros_por_lista: dict[int, list] = {}
        for lista_codi, usua_codi, cedula, orden in miembros_quipux:
            miembros_por_lista.setdefault(lista_codi, []).append((cedula, orden))

        creadas = 0
        actualizadas = 0
        miembros_ok = 0
        miembros_sin_usuario = 0

        for lista_codi, lista_nombre, lista_desc, lista_usua in listas_quipux:
            lista_obj, created = ListaDistribucion.objects.update_or_create(
                quipux_id=lista_codi,
                defaults={
                    'nombre': (lista_nombre or '').strip() or f'Lista {lista_codi}',
                    'descripcion': (lista_desc or '').strip(),
                    'activo': True,
                },
            )
            if created:
                creadas += 1
            else:
                actualizadas += 1
                # Limpiar miembros anteriores para re-importar
                lista_obj.miembros.all().delete()

            for cedula, orden in miembros_por_lista.get(lista_codi, []):
                sgd_user = cedula_map.get(cedula)
                if sgd_user:
                    ListaDistribucionMiembro.objects.get_or_create(
                        lista=lista_obj,
                        usuario=sgd_user,
                        defaults={'orden': orden or 0},
                    )
                    miembros_ok += 1
                else:
                    miembros_sin_usuario += 1

        self.stdout.write(self.style.SUCCESS(
            f'Importadas {creadas} listas nuevas, {actualizadas} actualizadas. '
            f'Miembros mapeados: {miembros_ok}, sin usuario SGD: {miembros_sin_usuario}'
        ))
