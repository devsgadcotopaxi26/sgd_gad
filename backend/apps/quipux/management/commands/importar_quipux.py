"""
Management command para importar datos del Quipux transaccional
al nuevo SGD GAD Cotopaxi.

Importa: unidades, usuarios, tipos de documento, secuenciales,
documentos (496K en lotes) y seguimiento (hist_eventos).

Uso:
    docker exec -it sgd_backend python manage.py importar_quipux
    docker exec -it sgd_backend python manage.py importar_quipux --solo-unidades
    docker exec -it sgd_backend python manage.py importar_quipux --solo-usuarios
    docker exec -it sgd_backend python manage.py importar_quipux --solo-tipos
    docker exec -it sgd_backend python manage.py importar_quipux --solo-documentos
    docker exec -it sgd_backend python manage.py importar_quipux --solo-seguimiento
    docker exec -it sgd_backend python manage.py importar_quipux --dry-run
"""
import time
from django.core.management.base import BaseCommand
from django.db import connections, transaction
from django.utils import timezone


# ---------------------------------------------------------------------------
# Mapeo de tiporad (Quipux) a nuestro TipoDocumento
# ---------------------------------------------------------------------------
TIPO_RAD_MAP = {
    1: {'codigo': 'oficio',      'nombre': 'Oficio',            'prefijo': 'OFI', 'orden': 1,  'requiere_firma': True},
    2: {'codigo': 'externo',     'nombre': 'Externo',           'prefijo': 'EXT', 'orden': 2,  'requiere_firma': False},
    3: {'codigo': 'memorando',   'nombre': 'Memorando',         'prefijo': 'MEM', 'orden': 3,  'requiere_firma': True},
    4: {'codigo': 'circular',    'nombre': 'Circular',          'prefijo': 'CIR', 'orden': 4,  'requiere_firma': True},
    5: {'codigo': 'acuerdo',     'nombre': 'Acuerdo',           'prefijo': 'ACU', 'orden': 5,  'requiere_firma': True},
    6: {'codigo': 'nota',        'nombre': 'Nota',              'prefijo': 'NOT', 'orden': 6,  'requiere_firma': False},
    7: {'codigo': 'carta',       'nombre': 'Carta Ciudadano',   'prefijo': 'CAR', 'orden': 7,  'requiere_firma': False},
    8: {'codigo': 'resolucion',  'nombre': 'Resolución',        'prefijo': 'RES', 'orden': 8,  'requiere_firma': True},
    9: {'codigo': 'providencia', 'nombre': 'Providencia',       'prefijo': 'PRV', 'orden': 9,  'requiere_firma': True},
}

# ---------------------------------------------------------------------------
# Mapeo de estado Quipux a nuestro estado
# ---------------------------------------------------------------------------
ESTADO_MAP = {
    0: 'archivado',
    1: 'borrador',
    2: 'recibido',
    3: 'borrador',
    4: 'borrador',
    5: 'borrador',
    6: 'enviado',
    7: 'anulado',
    8: 'anulado',
}

# ---------------------------------------------------------------------------
# Mapeo de sgd_ttr_codigo (hist_eventos) a nuestra etapa de seguimiento
# ---------------------------------------------------------------------------
ETAPA_MAP = {
    2:  'elaborado',
    8:  'informado',
    9:  'reasignado',
    12: 'respondido',
    13: 'archivado',
    18: 'enviado',
    21: 'comentado',
    40: 'firmado',
    65: 'enviado',
    67: 'respondido',
}


class Command(BaseCommand):
    help = 'Importa datos del Quipux transaccional al SGD (unidades, usuarios, tipos, documentos, seguimiento)'

    def add_arguments(self, parser):
        parser.add_argument('--solo-unidades',    action='store_true', help='Solo importar unidades/dependencias')
        parser.add_argument('--solo-usuarios',    action='store_true', help='Solo importar usuarios')
        parser.add_argument('--solo-tipos',       action='store_true', help='Solo importar tipos de documento y secuenciales')
        parser.add_argument('--solo-documentos',  action='store_true', help='Solo importar documentos (496K)')
        parser.add_argument('--solo-seguimiento', action='store_true', help='Solo importar seguimiento (hist_eventos)')
        parser.add_argument('--dry-run',          action='store_true', help='Mostrar lo que se importaria sin escribir')

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        solo_flags = [
            options['solo_unidades'],
            options['solo_usuarios'],
            options['solo_tipos'],
            options['solo_documentos'],
            options['solo_seguimiento'],
        ]
        importar_todo = not any(solo_flags)

        # Verificar conexion a Quipux
        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            self.stderr.write(self.style.ERROR(
                f'No se pudo conectar a quipux_transaccional: {e}\n'
                'Asegurate de que la base este restaurada.'
            ))
            return

        if self.dry_run:
            self.stdout.write(self.style.WARNING('=== MODO DRY-RUN: no se escribiran datos ==='))

        t0 = time.time()

        if importar_todo or options['solo_unidades']:
            self.importar_unidades()

        if importar_todo or options['solo_usuarios']:
            self.importar_usuarios()

        if importar_todo or options['solo_tipos']:
            self.importar_tipos_documento()
            self.importar_secuenciales()

        if importar_todo or options['solo_documentos']:
            self.importar_documentos()

        if importar_todo or options['solo_seguimiento']:
            self.importar_seguimiento()

        elapsed = time.time() - t0
        self.stdout.write(self.style.SUCCESS(
            f'\nImportacion completada en {elapsed:.1f} segundos.'
        ))

    # ======================================================================
    # Helpers: construir diccionarios de lookup
    # ======================================================================

    def _build_user_map(self):
        """Construye dict {quipux usua_codi: nuestro Usuario} por cedula."""
        from apps.usuarios.models import Usuario

        # Leer cedulas de Quipux con su usua_codi
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT usua_codi, usua_cedula
                FROM usuarios
                WHERE usua_cedula IS NOT NULL
                  AND usua_cedula != ''
                  AND usua_cedula != '0000000000'
            """)
            qx_users = cursor.fetchall()

        # Mapa cedula -> Usuario del SGD
        cedula_to_usuario = {}
        for u in Usuario.objects.only('id', 'cedula'):
            if u.cedula:
                cedula_to_usuario[u.cedula.strip()] = u

        # Mapa usua_codi -> Usuario
        user_map = {}
        for usua_codi, cedula in qx_users:
            if cedula:
                usuario = cedula_to_usuario.get(cedula.strip())
                if usuario:
                    user_map[usua_codi] = usuario

        return user_map

    def _build_unidad_map(self):
        """Construye dict {quipux depe_codi: nuestro Unidad.id} por siglas/codigo."""
        from apps.organizacion.models import Unidad

        # Leer deps de Quipux
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT depe_codi, dep_sigla
                FROM dependencia
                WHERE depe_estado = 1
            """)
            qx_deps = cursor.fetchall()

        # Mapa codigo -> Unidad
        codigo_to_unidad = {}
        for u in Unidad.objects.only('id', 'codigo', 'siglas'):
            codigo_to_unidad[u.codigo.upper()] = u.id
            if u.siglas:
                codigo_to_unidad[u.siglas.upper()] = u.id

        unidad_map = {}
        for depe_codi, dep_sigla in qx_deps:
            sigla = (dep_sigla or '').strip().upper()
            fallback = f'QX-{depe_codi}'
            uid = codigo_to_unidad.get(sigla) or codigo_to_unidad.get(fallback)
            if uid:
                unidad_map[depe_codi] = uid

        return unidad_map

    def _build_tipo_map(self):
        """Construye dict {quipux trad_codigo (int): nuestro TipoDocumento}."""
        from apps.documentos.models import TipoDocumento

        tipo_map = {}
        for trad_codigo, info in TIPO_RAD_MAP.items():
            try:
                td = TipoDocumento.objects.get(codigo=info['codigo'])
                tipo_map[trad_codigo] = td
            except TipoDocumento.DoesNotExist:
                pass
        return tipo_map

    # ======================================================================
    # 1. Importar unidades / dependencias
    # ======================================================================

    def importar_unidades(self):
        from apps.organizacion.models import Unidad, Nivel

        self.stdout.write(self.style.MIGRATE_HEADING('Importando dependencias/unidades...'))

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT depe_codi, depe_nomb, dep_sigla, depe_codi_padre, depe_estado
                FROM dependencia
                WHERE depe_estado = 1
                ORDER BY depe_codi
            """)
            deps = cursor.fetchall()

        nivel_default, _ = Nivel.objects.get_or_create(
            codigo='general',
            defaults={'nombre': 'General', 'orden': 1}
        )

        tipo_map = {
            'PREFECTURA': 'prefectura',
            'VICEPREFECTURA': 'viceprefectura',
            'DIRECCIÓN': 'direccion',
            'COORDINACIÓN': 'coordinacion',
            'SECRETARÍA': 'secretaria',
            'SECRETARIA': 'secretaria',
            'PROCURADURÍA': 'procuraduria',
            'UNIDAD': 'unidad',
            'ASESORES': 'asesoria',
            'GESTORES': 'unidad',
        }

        creadas = 0
        existentes = 0
        quipux_to_sgd = {}

        for depe_codi, depe_nomb, dep_sigla, depe_codi_padre, depe_estado in deps:
            if not depe_nomb or not depe_nomb.strip():
                continue

            nombre = depe_nomb.strip()
            siglas = (dep_sigla or '').strip()
            codigo = siglas or f'QX-{depe_codi}'

            tipo = 'unidad'
            nombre_upper = nombre.upper()
            for key, val in tipo_map.items():
                if nombre_upper.startswith(key):
                    tipo = val
                    break

            if self.dry_run:
                self.stdout.write(f'  [DRY] {codigo} - {nombre} ({tipo})')
                quipux_to_sgd[depe_codi] = None
                creadas += 1
                continue

            unidad, created = Unidad.objects.get_or_create(
                codigo=codigo,
                defaults={
                    'nombre': nombre,
                    'nombre_corto': nombre[:80] if len(nombre) > 80 else nombre,
                    'siglas': siglas[:20] if siglas else '',
                    'tipo': tipo,
                    'nivel': nivel_default,
                    'activo': True,
                }
            )
            quipux_to_sgd[depe_codi] = unidad.id

            if created:
                creadas += 1
            else:
                existentes += 1

        if not self.dry_run:
            for depe_codi, depe_nomb, dep_sigla, depe_codi_padre, _ in deps:
                if depe_codi_padre and depe_codi_padre in quipux_to_sgd and depe_codi in quipux_to_sgd:
                    sgd_id = quipux_to_sgd[depe_codi]
                    padre_sgd_id = quipux_to_sgd.get(depe_codi_padre)
                    if sgd_id and padre_sgd_id and sgd_id != padre_sgd_id:
                        Unidad.objects.filter(id=sgd_id).update(padre_id=padre_sgd_id)

        self.stdout.write(self.style.SUCCESS(
            f'Unidades: {creadas} creadas, {existentes} ya existian'
        ))

    # ======================================================================
    # 2. Importar usuarios
    # ======================================================================

    def importar_usuarios(self):
        from apps.usuarios.models import Usuario
        from apps.organizacion.models import Unidad

        self.stdout.write(self.style.MIGRATE_HEADING('Importando usuarios...'))

        siglas_to_unidad = {}
        for u in Unidad.objects.all():
            if u.siglas:
                siglas_to_unidad[u.siglas.upper()] = u
            siglas_to_unidad[u.codigo.upper()] = u

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT
                    u.usua_codi, u.usua_nomb, u.usua_apellido, u.usua_cedula,
                    u.usua_cargo, u.usua_abr_titulo, u.usua_email,
                    u.cargo_tipo, u.depe_codi, u.usua_celular, u.usua_telefono,
                    d.dep_sigla, d.depe_nomb
                FROM usuarios u
                LEFT JOIN dependencia d ON u.depe_codi = d.depe_codi
                WHERE u.usua_esta = 1
                  AND u.usua_codi > 0
                  AND u.usua_cedula IS NOT NULL
                  AND u.usua_cedula != ''
                  AND u.usua_cedula != '0000000000'
                ORDER BY u.usua_apellido
            """)
            users = cursor.fetchall()

        creados = 0
        existentes = 0
        errores = 0

        for row in users:
            (usua_codi, nombres, apellidos, cedula, cargo, titulo,
             email, cargo_tipo, depe_codi, celular, telefono,
             dep_sigla, depe_nomb) = row

            if not nombres or not apellidos or not cedula:
                continue

            nombres = nombres.strip()
            apellidos = apellidos.strip()
            cedula = cedula.strip()
            cargo = (cargo or '').strip()
            titulo = (titulo or '').strip()
            email = (email or '').strip()

            if not email or '@' not in email:
                email = f'{nombres.lower().split()[0]}.{apellidos.lower().split()[0]}@cotopaxi.gob.ec'

            unidad = None
            if dep_sigla:
                unidad = siglas_to_unidad.get(dep_sigla.strip().upper())
            if not unidad and depe_nomb:
                for code, u in siglas_to_unidad.items():
                    if u.nombre.upper() == depe_nomb.strip().upper():
                        unidad = u
                        break

            if self.dry_run:
                self.stdout.write(f'  [DRY] {titulo} {nombres} {apellidos} ({cedula}) - {cargo} - {dep_sigla or "sin unidad"}')
                creados += 1
                continue

            try:
                usuario, created = Usuario.objects.get_or_create(
                    cedula=cedula,
                    defaults={
                        'nombres': nombres,
                        'apellidos': apellidos,
                        'email': email,
                        'email_institucional': email if '@cotopaxi.gob.ec' in email else None,
                        'cargo': cargo,
                        'titulo': titulo,
                        'cargo_tipo': cargo_tipo or 0,
                        'unidad': unidad,
                        'tipo': 'funcionario',
                        'telefono_movil': (celular or '').strip(),
                        'telefono_fijo': (telefono or '').strip(),
                        'activo': True,
                        'is_active': True,
                    }
                )

                if created:
                    usuario.set_password(cedula)
                    usuario.save(update_fields=['password'])
                    creados += 1
                else:
                    changed = False
                    if not usuario.cargo and cargo:
                        usuario.cargo = cargo
                        changed = True
                    if not usuario.titulo and titulo:
                        usuario.titulo = titulo
                        changed = True
                    if not usuario.unidad and unidad:
                        usuario.unidad = unidad
                        changed = True
                    if changed:
                        usuario.save()
                    existentes += 1

            except Exception as e:
                errores += 1
                self.stderr.write(f'  Error con {cedula} ({nombres} {apellidos}): {e}')

        self.stdout.write(self.style.SUCCESS(
            f'Usuarios: {creados} creados, {existentes} ya existian, {errores} errores'
        ))
        if creados > 0 and not self.dry_run:
            self.stdout.write(self.style.WARNING(
                'Password inicial de usuarios nuevos: su numero de cedula'
            ))

    # ======================================================================
    # 3. Importar tipos de documento (tiporad)
    # ======================================================================

    def importar_tipos_documento(self):
        from apps.documentos.models import TipoDocumento

        self.stdout.write(self.style.MIGRATE_HEADING('Importando tipos de documento (tiporad)...'))

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT trad_codigo, trad_descr, trad_abreviatura
                FROM tiporad
                ORDER BY trad_codigo
            """)
            tipos_qx = cursor.fetchall()

        creados = 0
        existentes = 0

        for trad_codigo, trad_descr, trad_abreviatura in tipos_qx:
            info = TIPO_RAD_MAP.get(trad_codigo)
            if not info:
                # Tipo no mapeado, crear con datos genericos
                codigo = (trad_abreviatura or f'QX{trad_codigo}').strip().lower()
                nombre = (trad_descr or f'Tipo {trad_codigo}').strip()
                prefijo = (trad_abreviatura or f'QX{trad_codigo}').strip().upper()[:3]
                info = {
                    'codigo': codigo,
                    'nombre': nombre,
                    'prefijo': prefijo,
                    'orden': 10 + trad_codigo,
                    'requiere_firma': False,
                }

            if self.dry_run:
                self.stdout.write(
                    f'  [DRY] {trad_codigo}: {trad_descr} ({trad_abreviatura}) '
                    f'-> codigo={info["codigo"]}, prefijo={info["prefijo"]}'
                )
                creados += 1
                continue

            td, created = TipoDocumento.objects.get_or_create(
                codigo=info['codigo'],
                defaults={
                    'nombre': info['nombre'],
                    'prefijo_numeracion': info['prefijo'],
                    'requiere_firma': info['requiere_firma'],
                    'orden': info['orden'],
                    'activo': True,
                }
            )

            if created:
                creados += 1
                self.stdout.write(f'  + {td.codigo}: {td.nombre} (prefijo: {td.prefijo_numeracion})')
            else:
                existentes += 1

        self.stdout.write(self.style.SUCCESS(
            f'Tipos documento: {creados} creados, {existentes} ya existian'
        ))

    # ======================================================================
    # 4. Importar secuenciales (formato_numeracion)
    # ======================================================================

    def importar_secuenciales(self):
        from apps.documentos.models import TipoDocumento, Documento

        self.stdout.write(self.style.MIGRATE_HEADING('Leyendo secuenciales de numeracion (formato_numeracion)...'))

        tipo_map = self._build_tipo_map()

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT fn_tiporad, MAX(fn_contador) AS max_contador
                FROM formato_numeracion
                GROUP BY fn_tiporad
                ORDER BY fn_tiporad
            """)
            secuenciales = cursor.fetchall()

        self.stdout.write('')
        self.stdout.write('  Secuenciales maximos por tipo de documento en Quipux:')
        self.stdout.write('  ' + '-' * 55)

        anio_actual = timezone.now().year

        for fn_tiporad, max_contador in secuenciales:
            td = tipo_map.get(fn_tiporad)
            info = TIPO_RAD_MAP.get(fn_tiporad, {})
            nombre = info.get('nombre', f'Tipo {fn_tiporad}')

            self.stdout.write(
                f'  {nombre:20s}: ultimo secuencial = {max_contador}'
            )

            if td and not self.dry_run:
                # Verificar que nuestro sistema no tenga un secuencial mayor
                nuestro_max = Documento.objects.filter(
                    tipo_documento=td, anio=anio_actual
                ).order_by('-numero_secuencial').values_list(
                    'numero_secuencial', flat=True
                ).first() or 0

                if max_contador > nuestro_max:
                    self.stdout.write(self.style.WARNING(
                        f'    -> Nuestro SGD tiene secuencial={nuestro_max}, '
                        f'Quipux tiene {max_contador}. '
                        f'Los nuevos documentos continuaran desde {max_contador + 1}.'
                    ))

        self.stdout.write('  ' + '-' * 55)

        # Leer detalle por dependencia para referencia
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT fn.fn_tiporad, d.dep_sigla, MAX(fn.fn_contador) AS max_c
                FROM formato_numeracion fn
                JOIN dependencia d ON fn.depe_codi = d.depe_codi
                GROUP BY fn.fn_tiporad, d.dep_sigla
                ORDER BY fn.fn_tiporad, max_c DESC
            """)
            detalle = cursor.fetchall()

        if detalle:
            self.stdout.write(f'\n  Detalle por dependencia:')
            for fn_tiporad, dep_sigla, max_c in detalle[:20]:
                info = TIPO_RAD_MAP.get(fn_tiporad, {})
                nombre = info.get('nombre', f'Tipo {fn_tiporad}')
                self.stdout.write(f'    {dep_sigla or "??":10s} {nombre:15s}: {max_c}')
            if len(detalle) > 20:
                self.stdout.write(f'    ... y {len(detalle) - 20} registros mas')

        self.stdout.write(self.style.SUCCESS('Lectura de secuenciales completada.'))

    # ======================================================================
    # 5. Importar documentos (radicado) — en lotes de 1000
    # ======================================================================

    def importar_documentos(self):
        from apps.documentos.models import Documento, TipoDocumento

        self.stdout.write(self.style.MIGRATE_HEADING('Importando documentos (radicado)...'))

        # Construir lookups
        self.stdout.write('  Construyendo mapas de lookup...')
        user_map = self._build_user_map()
        unidad_map = self._build_unidad_map()
        tipo_map = self._build_tipo_map()

        self.stdout.write(f'  Usuarios mapeados: {len(user_map)}')
        self.stdout.write(f'  Unidades mapeadas: {len(unidad_map)}')
        self.stdout.write(f'  Tipos mapeados: {len(tipo_map)}')

        # Obtener numeros de documento ya importados para evitar duplicados
        existing_nums = set(
            Documento.objects.values_list('numero_documento', flat=True)
        )
        self.stdout.write(f'  Documentos existentes en SGD: {len(existing_nums)}')

        # Tipo por defecto para documentos sin tipo valido
        tipo_default = TipoDocumento.objects.filter(codigo='oficio').first()
        if not tipo_default:
            tipo_default = TipoDocumento.objects.first()
        if not tipo_default:
            self.stderr.write(self.style.ERROR(
                'No hay tipos de documento en el SGD. '
                'Ejecuta primero: importar_quipux --solo-tipos'
            ))
            return

        # Contar total
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM radicado")
            total = cursor.fetchone()[0]

        self.stdout.write(f'  Total documentos en Quipux: {total}')

        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                f'  [DRY-RUN] Se importarian hasta {total} documentos.'
            ))
            return

        # Leer e importar en lotes usando cursor del lado servidor
        BATCH_SIZE = 1000
        FETCH_SIZE = 5000
        offset = 0
        importados = 0
        omitidos = 0
        errores = 0
        t0 = time.time()

        # Almacenar mapeo radi_nume_radi -> doc.id para seguimiento
        self.radi_to_doc_id = {}

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.radi_nume_radi,
                    r.radi_fech_radi,
                    r.radi_tipo,
                    r.esta_codi,
                    r.radi_asunto,
                    r.radi_resumen,
                    r.radi_usua_radi,
                    r.radi_nume_text,
                    r.radi_permiso,
                    r.radi_fech_firma,
                    r.radi_nomb_usua_firma,
                    r.radi_cuentai,
                    r.arch_codi,
                    r.arch_codi_firma,
                    u.usua_cedula,
                    u.depe_codi AS usua_depe_codi
                FROM radicado r
                LEFT JOIN usuarios u ON r.radi_usua_radi = u.usua_codi
                ORDER BY r.radi_nume_radi
            """)

            while True:
                rows = cursor.fetchmany(FETCH_SIZE)
                if not rows:
                    break

                batch = []
                for row in rows:
                    (radi_nume_radi, radi_fech_radi, radi_tipo, esta_codi,
                     radi_asunto, radi_resumen, radi_usua_radi,
                     radi_nume_text, radi_permiso, radi_fech_firma,
                     radi_nomb_usua_firma, radi_cuentai,
                     arch_codi, arch_codi_firma,
                     usua_cedula, usua_depe_codi) = row

                    # Numero de documento
                    numero = (radi_nume_text or '').strip()
                    if not numero:
                        numero = str(radi_nume_radi)

                    # Ya existe?
                    if numero in existing_nums:
                        omitidos += 1
                        # Buscar el doc existente para mapear
                        try:
                            doc_existente = Documento.objects.filter(
                                numero_documento=numero
                            ).values_list('id', flat=True).first()
                            if doc_existente:
                                self.radi_to_doc_id[radi_nume_radi] = doc_existente
                        except Exception:
                            pass
                        continue

                    # Usuario creador
                    creado_por = user_map.get(radi_usua_radi)
                    if not creado_por:
                        errores += 1
                        continue

                    # Tipo de documento
                    tipo_doc = tipo_map.get(radi_tipo, tipo_default)

                    # Unidad origen (del usuario)
                    unidad_id = None
                    if usua_depe_codi:
                        unidad_id = unidad_map.get(usua_depe_codi)
                    if not unidad_id:
                        unidad_id = creado_por.unidad_id
                    if not unidad_id:
                        errores += 1
                        continue

                    # Estado
                    estado = ESTADO_MAP.get(esta_codi, 'borrador')

                    # Asunto
                    asunto = (radi_asunto or '').strip()
                    if not asunto:
                        asunto = f'Documento Quipux {numero}'
                    asunto = asunto[:500]

                    # Anio
                    anio = radi_fech_radi.year if radi_fech_radi else timezone.now().year

                    # Firma info
                    firma_info = None
                    if radi_nomb_usua_firma:
                        firma_info = {
                            'firmado_por': (radi_nomb_usua_firma or '').strip(),
                            'origen': 'quipux',
                        }

                    doc = Documento(
                        tipo_documento=tipo_doc,
                        numero_documento=numero,
                        anio=anio,
                        asunto=asunto,
                        resumen=(radi_resumen or '').strip()[:1000],
                        unidad_origen_id=unidad_id,
                        creado_por=creado_por,
                        estado=estado,
                        prioridad='normal',
                        confidencial=(radi_permiso == 1),
                        firma_bce_info=firma_info,
                        fecha_firma=radi_fech_firma,
                    )
                    batch.append((radi_nume_radi, doc))
                    existing_nums.add(numero)

                    if len(batch) >= BATCH_SIZE:
                        saved = self._save_doc_batch(batch)
                        importados += saved
                        batch = []

                        if importados % 10000 < BATCH_SIZE:
                            elapsed = time.time() - t0
                            rate = importados / elapsed if elapsed > 0 else 0
                            self.stdout.write(
                                f'  Importados {importados}/{total}... '
                                f'({rate:.0f} docs/seg, omitidos={omitidos}, errores={errores})'
                            )

                # Guardar batch restante
                if batch:
                    saved = self._save_doc_batch(batch)
                    importados += saved

        elapsed = time.time() - t0
        self.stdout.write(self.style.SUCCESS(
            f'Documentos: {importados} importados, {omitidos} ya existian, '
            f'{errores} errores (en {elapsed:.1f}s)'
        ))

    def _save_doc_batch(self, batch):
        """Guarda un lote de documentos con bulk_create. Retorna cantidad guardada."""
        from apps.documentos.models import Documento

        docs = [doc for _, doc in batch]
        try:
            with transaction.atomic():
                created = Documento.objects.bulk_create(docs, batch_size=1000, ignore_conflicts=True)

            # Mapear radi_nume_radi -> doc.id para seguimiento
            # Despues de bulk_create, los objetos tienen id si no hubo conflicto
            for i, (radi_id, doc) in enumerate(batch):
                if i < len(created) and created[i].id:
                    self.radi_to_doc_id[radi_id] = created[i].id
                else:
                    # Buscar por numero_documento
                    try:
                        real_id = Documento.objects.filter(
                            numero_documento=doc.numero_documento
                        ).values_list('id', flat=True).first()
                        if real_id:
                            self.radi_to_doc_id[radi_id] = real_id
                    except Exception:
                        pass

            return len(created)

        except Exception as e:
            self.stderr.write(f'  Error en batch: {e}')
            # Intentar uno por uno
            saved = 0
            for radi_id, doc in batch:
                try:
                    doc.save()
                    self.radi_to_doc_id[radi_id] = doc.id
                    saved += 1
                except Exception:
                    pass
            return saved

    # ======================================================================
    # 6. Importar seguimiento (hist_eventos)
    # ======================================================================

    def importar_seguimiento(self):
        from apps.documentos.models import SeguimientoDocumento, Documento

        self.stdout.write(self.style.MIGRATE_HEADING('Importando seguimiento (hist_eventos)...'))

        # Construir mapas
        user_map = self._build_user_map()
        unidad_map = self._build_unidad_map()

        # Si no tenemos mapeo radi -> doc (porque se ejecuto --solo-seguimiento),
        # construirlo desde la BD
        if not hasattr(self, 'radi_to_doc_id') or not self.radi_to_doc_id:
            self.stdout.write('  Construyendo mapeo radi_nume_radi -> documento...')
            self.radi_to_doc_id = {}
            # Leer todos los numeros de documento de Quipux
            with connections['quipux_transaccional'].cursor() as cursor:
                cursor.execute("""
                    SELECT radi_nume_radi, radi_nume_text
                    FROM radicado
                    ORDER BY radi_nume_radi
                """)
                radi_rows = cursor.fetchall()

            # Crear un mapa de numero_documento -> doc.id en nuestro SGD
            num_to_id = dict(
                Documento.objects.values_list('numero_documento', 'id')
            )

            for radi_id, radi_text in radi_rows:
                numero = (radi_text or '').strip()
                if not numero:
                    numero = str(radi_id)
                doc_id = num_to_id.get(numero)
                if doc_id:
                    self.radi_to_doc_id[radi_id] = doc_id

        self.stdout.write(f'  Documentos mapeados para seguimiento: {len(self.radi_to_doc_id)}')

        if not self.radi_to_doc_id:
            self.stderr.write(self.style.ERROR(
                'No hay documentos importados para vincular seguimiento. '
                'Ejecuta primero: importar_quipux --solo-documentos'
            ))
            return

        # Contar total de eventos
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM hist_eventos")
            total = cursor.fetchone()[0]

        self.stdout.write(f'  Total eventos en Quipux: {total}')

        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                f'  [DRY-RUN] Se importarian seguimientos de {total} eventos '
                f'para {len(self.radi_to_doc_id)} documentos.'
            ))
            return

        # Leer e importar en lotes
        FETCH_SIZE = 10000
        BATCH_SIZE = 2000
        importados = 0
        omitidos = 0
        errores = 0
        t0 = time.time()

        # Codigos de transaccion que mapeamos
        codigos_validos = set(ETAPA_MAP.keys())

        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute("""
                SELECT
                    h.radi_nume_radi,
                    h.sgd_ttr_codigo,
                    h.usua_codi_ori,
                    h.hist_obse,
                    h.hist_fech
                FROM hist_eventos h
                ORDER BY h.hist_fech
            """)

            batch = []
            while True:
                rows = cursor.fetchmany(FETCH_SIZE)
                if not rows:
                    break

                for row in rows:
                    (radi_id, ttr_codigo, usua_codi,
                     descripcion, fecha_evento) = row

                    # Solo codigos mapeados
                    if ttr_codigo not in codigos_validos:
                        omitidos += 1
                        continue

                    # Documento debe existir en nuestro SGD
                    doc_id = self.radi_to_doc_id.get(radi_id)
                    if not doc_id:
                        omitidos += 1
                        continue

                    # Usuario
                    usuario = user_map.get(usua_codi)
                    if not usuario:
                        errores += 1
                        continue

                    # Unidad (del usuario)
                    unidad_id = usuario.unidad_id

                    etapa = ETAPA_MAP[ttr_codigo]
                    observacion = (descripcion or '').strip()[:1000]

                    seg = SeguimientoDocumento(
                        documento_id=doc_id,
                        etapa=etapa,
                        usuario=usuario,
                        unidad_id=unidad_id,
                        observacion=observacion,
                    )
                    batch.append(seg)

                    if len(batch) >= BATCH_SIZE:
                        try:
                            SeguimientoDocumento.objects.bulk_create(
                                batch, batch_size=2000, ignore_conflicts=True
                            )
                            importados += len(batch)
                        except Exception as e:
                            self.stderr.write(f'  Error en batch seguimiento: {e}')
                            errores += len(batch)
                        batch = []

                        if importados % 20000 < BATCH_SIZE:
                            elapsed = time.time() - t0
                            rate = importados / elapsed if elapsed > 0 else 0
                            self.stdout.write(
                                f'  Importados {importados} seguimientos... '
                                f'({rate:.0f}/seg, omitidos={omitidos}, errores={errores})'
                            )

            # Batch final
            if batch:
                try:
                    SeguimientoDocumento.objects.bulk_create(
                        batch, batch_size=2000, ignore_conflicts=True
                    )
                    importados += len(batch)
                except Exception as e:
                    self.stderr.write(f'  Error en batch seguimiento final: {e}')
                    errores += len(batch)

        elapsed = time.time() - t0
        self.stdout.write(self.style.SUCCESS(
            f'Seguimiento: {importados} importados, {omitidos} omitidos, '
            f'{errores} errores (en {elapsed:.1f}s)'
        ))
