"""
Importa usuarios de Quipux transaccional a SGD.

- Importa TODOS los usuarios (activos e inactivos).
- Los inactivos (usua_esta=0) se crean con activo=False, is_active=False.
- Omite al usuario sistema con cedula 0000000000.
- No duplica: si ya existe un usuario con la misma cedula o email, lo actualiza.
- Uso:
    python manage.py importar_usuarios_quipux
    python manage.py importar_usuarios_quipux --solo-inactivos
    python manage.py importar_usuarios_quipux --dry-run
"""

import re

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connections, transaction

Usuario = get_user_model()

# Cedulas que no tienen sentido importar
CEDULAS_EXCLUIR = {'0000000000', ''}


def _limpiar_cedula(raw: str) -> str:
    """'0503731440-216' → '0503731440'"""
    if not raw:
        return ''
    return raw.split('-')[0].strip()


def _limpiar_email(raw: str, cedula: str, idx: int) -> str:
    raw = (raw or '').strip()
    if raw and '@' in raw:
        return raw.lower()
    # Generar email provisional para no romper la constraint unique
    return f'quipux.inactivo.{cedula or idx}@cotopaxi.gob.ec'


def _titulo(cargo_tipo: int) -> str:
    return {1: 'Ing.', 2: 'Dr.', 3: 'Lic.', 4: 'Mgs.', 5: 'Sr.'}.get(cargo_tipo, '')


class Command(BaseCommand):
    help = 'Importa/actualiza usuarios desde Quipux transaccional a SGD'

    def add_arguments(self, parser):
        parser.add_argument(
            '--solo-inactivos', action='store_true',
            help='Importa solo usuarios inactivos (usua_esta=0)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Muestra qué se haría sin escribir nada',
        )

    def handle(self, *args, **options):
        solo_inactivos = options['solo_inactivos']
        dry_run        = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('--- DRY RUN: sin escritura ---'))

        with connections['quipux_transaccional'].cursor() as c:
            where = "WHERE usua_esta = 0" if solo_inactivos else ""
            c.execute(f"""
                SELECT
                    usua_cedula, usua_nomb, usua_apellido, usua_email,
                    usua_cargo, depe_nomb, dep_sigla, usua_esta,
                    usua_titulo, cargo_tipo
                FROM usuario
                {where}
                ORDER BY usua_apellido, usua_nomb
            """)
            filas = c.fetchall()

        self.stdout.write(f'Usuarios leídos de Quipux: {len(filas)}')

        creados   = 0
        actualizados = 0
        omitidos  = 0

        for idx, fila in enumerate(filas):
            (
                raw_cedula, nomb, apellido, email_raw,
                cargo, depe_nomb, dep_sigla, esta,
                titulo_raw, cargo_tipo,
            ) = fila

            cedula = _limpiar_cedula(raw_cedula)
            if cedula in CEDULAS_EXCLUIR:
                omitidos += 1
                continue

            nombres   = (nomb   or '').strip()
            apellidos = (apellido or '').strip()
            if not nombres and not apellidos:
                omitidos += 1
                continue

            activo   = (esta == 1)
            email    = _limpiar_email(email_raw, cedula, idx)
            titulo   = (titulo_raw or '').strip() or _titulo(cargo_tipo or 0)
            cargo_s  = (cargo or '').strip()
            unidad_s = (depe_nomb or '').strip()

            if dry_run:
                self.stdout.write(
                    f'  [{"A" if activo else "I"}] {apellidos} {nombres} '
                    f'| CI:{cedula} | {email} | {cargo_s}'
                )
                continue

            with transaction.atomic():
                # Buscar por cedula primero, luego por email
                u = (
                    Usuario.objects.filter(cedula=cedula).first()
                    or Usuario.objects.filter(email=email).first()
                )

                if u:
                    # Actualizar campos que podrían faltar
                    changed = False
                    if not u.cedula and cedula:
                        u.cedula = cedula; changed = True
                    if not u.cargo and cargo_s:
                        u.cargo = cargo_s; changed = True
                    if not u.titulo and titulo:
                        u.titulo = titulo; changed = True
                    # Sincronizar estado activo
                    if u.activo != activo or u.is_active != activo:
                        u.activo    = activo
                        u.is_active = activo
                        changed = True
                    if changed:
                        u.save()
                        actualizados += 1
                    else:
                        omitidos += 1
                else:
                    # Crear usuario nuevo (sin password usable)
                    u = Usuario(
                        cedula    = cedula,
                        nombres   = nombres,
                        apellidos = apellidos,
                        email     = email,
                        cargo     = cargo_s,
                        titulo    = titulo,
                        activo    = activo,
                        is_active = activo,
                        tipo      = 'funcionario',
                    )
                    u.set_unusable_password()
                    u.save()
                    creados += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'Listo — Creados: {creados} | Actualizados: {actualizados} | Omitidos: {omitidos}'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f'Dry run — Se crearían/actualizarían aprox {len(filas) - omitidos} usuarios'
            ))
