from django.core.management.base import BaseCommand
from apps.organizacion.models import Nivel, Funcion, Unidad

NIVELES = [
    {'codigo': 'NIV-DIR', 'nombre': 'Nivel Directivo',  'orden': 1},
    {'codigo': 'NIV-ASE', 'nombre': 'Nivel Asesor',      'orden': 2},
    {'codigo': 'NIV-APO', 'nombre': 'Nivel de Apoyo',    'orden': 3},
    {'codigo': 'NIV-OPE', 'nombre': 'Nivel Operativo',   'orden': 4},
]

FUNCIONES = [
    {'codigo': 'FUN-LEG', 'nombre': 'Función de Legislación, Normatividad y Fiscalización'},
    {'codigo': 'FUN-EJE', 'nombre': 'Función Ejecutiva'},
    {'codigo': 'FUN-PAR', 'nombre': 'Función de Participación Ciudadana y Control Social'},
]

UNIDADES = [
    (None,  'NIV-DIR','FUN-EJE','PRE',  'Prefectura',                                                        'PRE',  'prefectura',     1),
    (None,  'NIV-DIR','FUN-EJE','VPR',  'Viceprefectura',                                                    'VPR',  'viceprefectura', 2),
    (None,  'NIV-DIR','FUN-LEG','CPR',  'Consejo Provincial',                                                'CPR',  'consejo',        3),
    (None,  'NIV-DIR','FUN-PAR','SPC',  'Sistema de Participación Ciudadana y Control Social',               'SPC',  'zona',           4),
    ('PRE', 'NIV-ASE','FUN-EJE','ASE',  'Asesoría',                                                          'ASE',  'asesoria',       5),
    ('PRE', 'NIV-ASE','FUN-EJE','COP',  'Coordinación de Prefectura',                                       'COP',  'coordinacion',   6),
    ('PRE', 'NIV-ASE','FUN-EJE','CCR',  'Coordinación de Comunicación, Relaciones Públicas y Radio',        'CCR',  'coordinacion',   7),
    ('VPR', 'NIV-ASE','FUN-EJE','PSI',  'Procuraduría Síndica',                                              'PSI',  'procuraduria',   8),
    ('PSI', 'NIV-ASE','FUN-EJE','UJI',  'Unidad de Justicia Integrada Institucional',                       'UJI',  'unidad',         9),
    ('PRE', 'NIV-ASE','FUN-EJE','DPG',  'Dirección de Planificación, Ordenamiento Territorial y Gobernanza','DPG',  'direccion',     10),
    ('DPG', 'NIV-ASE','FUN-EJE','UPT',  'Unidad de Planificación Territorial e Institucional',              'UPT',  'unidad',        11),
    ('DPG', 'NIV-ASE','FUN-EJE','UPG',  'Unidad de Planificación y Gobernanza',                             'UPG',  'unidad',        12),
    ('DPG', 'NIV-ASE','FUN-EJE','USG',  'Unidad de Seguridad Ciudadana y Gestión de Riesgos',               'USG',  'unidad',        13),
    ('DPG', 'NIV-ASE','FUN-EJE','UPE',  'Unidad de Planificación Estratégica, Procesos y Mejora Continua',  'UPE',  'unidad',        14),
    ('DPG', 'NIV-ASE','FUN-EJE','UMS',  'Unidad de Monitoreo, Seguimiento y Evaluación',                   'UMS',  'unidad',        15),
    (None,  'NIV-APO','FUN-EJE','SEC',  'Secretaría General',                                                'SEC',  'secretaria',    20),
    ('SEC', 'NIV-APO','FUN-EJE','UDA',  'Unidad de Documentación y Archivo',                                'UDA',  'unidad',        21),
    ('SEC', 'NIV-APO','FUN-EJE','UNO',  'Unidad de Normativa',                                              'UNO',  'unidad',        22),
    ('SEC', 'NIV-APO','FUN-EJE','SCO',  'Secretaría de Comisiones',                                         'SCO',  'secretaria',    23),
    (None,  'NIV-APO','FUN-EJE','DTH',  'Dirección de Talento Humano',                                      'DTH',  'direccion',     24),
    ('DTH', 'NIV-APO','FUN-EJE','UAP',  'Unidad de Administración del Personal',                            'UAP',  'unidad',        25),
    ('DTH', 'NIV-APO','FUN-EJE','USO',  'Unidad de Salud y Seguridad Ocupacional',                          'USO',  'unidad',        26),
    (None,  'NIV-APO','FUN-EJE','DFI',  'Dirección Financiera',                                             'DFI',  'direccion',     27),
    ('DFI', 'NIV-APO','FUN-EJE','UPR',  'Unidad de Presupuesto',                                            'UPR',  'unidad',        28),
    ('DFI', 'NIV-APO','FUN-EJE','UCO',  'Unidad de Contabilidad',                                           'UCO',  'unidad',        29),
    ('DFI', 'NIV-APO','FUN-EJE','UTE',  'Unidad de Tesorería',                                              'UTE',  'unidad',        30),
    (None,  'NIV-APO','FUN-EJE','DAD',  'Dirección Administrativa',                                         'DAD',  'direccion',     31),
    ('DAD', 'NIV-APO','FUN-EJE','USI',  'Unidad de Servicios Institucionales y Generales',                  'USI',  'unidad',        32),
    ('DAD', 'NIV-APO','FUN-EJE','UAB',  'Unidad Administrativa de Bienes e Inventarios',                    'UAB',  'unidad',        33),
    ('DAD', 'NIV-APO','FUN-EJE','UTI',  'Unidad de Tecnologías de la Información y Comunicación',           'UTI',  'unidad',        34),
    (None,  'NIV-APO','FUN-EJE','DCP',  'Dirección de Compras Públicas',                                    'DCP',  'direccion',     35),
    (None,  'NIV-OPE','FUN-EJE','DOP',  'Dirección de Obras Públicas',                                      'DOP',  'direccion',     40),
    ('DOP', 'NIV-OPE','FUN-EJE','UEO',  'Unidad de Ejecución y Administración de Obras Viales',             'UEO',  'unidad',        41),
    ('DOP', 'NIV-OPE','FUN-EJE','UMV',  'Unidad de Mantenimiento Vial',                                     'UMV',  'unidad',        42),
    ('DOP', 'NIV-OPE','FUN-EJE','UTA',  'Unidad de Administración de Talleres',                             'UTA',  'unidad',        43),
    (None,  'NIV-OPE','FUN-EJE','DFP',  'Dirección de Fomento Productivo',                                  'DFP',  'direccion',     44),
    ('DFP', 'NIV-OPE','FUN-EJE','UPT2', 'Unidad de Producción, Comercialización, Turismo y Cultura',       'UPT2', 'unidad',        45),
    (None,  'NIV-OPE','FUN-EJE','DRI',  'Dirección de Riego y Drenaje',                                     'DRI',  'direccion',     46),
    ('DRI', 'NIV-OPE','FUN-EJE','UOE',  'Unidad Operativa y Ejecutora',                                     'UOE',  'unidad',        47),
    ('DRI', 'NIV-OPE','FUN-EJE','UCE',  'Unidad de Canales Estatales',                                      'UCE',  'unidad',        48),
    (None,  'NIV-OPE','FUN-EJE','DAM',  'Dirección de Ambiente',                                            'DAM',  'direccion',     49),
    ('DAM', 'NIV-OPE','FUN-EJE','URA',  'Unidad de Regularización Ambiental',                               'URA',  'unidad',        50),
    ('DAM', 'NIV-OPE','FUN-EJE','UCA',  'Unidad de Calidad Ambiental y Acreditación',                       'UCA',  'unidad',        51),
    ('DAM', 'NIV-OPE','FUN-EJE','URN',  'Unidad de Recursos Naturales',                                     'URN',  'unidad',        52),
    ('DAM', 'NIV-OPE','FUN-EJE','UPP',  'Unidad de Producción de Plantas Putzalahua',                       'UPP',  'unidad',        53),
    (None,  'NIV-OPE','FUN-EJE','DEP',  'Dirección de Estudios y Proyectos',                                'DEP',  'direccion',     54),
    ('DEP', 'NIV-OPE','FUN-EJE','UEI',  'Unidad de Estudios de Infraestructura Vial',                       'UEI',  'unidad',        55),
    ('DEP', 'NIV-OPE','FUN-EJE','UEP',  'Unidad de Estudios y Proyectos de Riego y Drenaje',                'UEP',  'unidad',        56),
    ('DEP', 'NIV-OPE','FUN-EJE','UPI',  'Unidad de Proyectos de Investigación y Cooperación Internacional', 'UPI',  'unidad',        57),
    (None,  'NIV-OPE','FUN-EJE','DFZ',  'Dirección de Fiscalización',                                       'DFZ',  'direccion',     58),
    (None,  'NIV-OPE','FUN-EJE','DZS',  'Dirección Zonal Subtrópico',                                       'DZS',  'zona',          59),
]


class Command(BaseCommand):
    help = 'Carga el organigrama completo del GAD Provincia de Cotopaxi'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.MIGRATE_HEADING('Cargando organigrama...'))

        for data in NIVELES:
            Nivel.objects.update_or_create(codigo=data['codigo'], defaults=data)

        for data in FUNCIONES:
            Funcion.objects.update_or_create(codigo=data['codigo'], defaults={'nombre': data['nombre']})

        nivel_map   = {n.codigo: n for n in Nivel.objects.all()}
        funcion_map = {f.codigo: f for f in Funcion.objects.all()}
        unidad_map  = {}
        creadas     = 0

        for padre_cod, nivel_cod, func_cod, codigo, nombre, siglas, tipo, orden in UNIDADES:
            padre = unidad_map.get(padre_cod) if padre_cod else None
            obj, created = Unidad.objects.update_or_create(
                codigo=codigo,
                defaults={
                    'padre':         padre,
                    'nivel':         nivel_map[nivel_cod],
                    'funcion':       funcion_map.get(func_cod),
                    'nombre':        nombre,
                    'siglas':        siglas,
                    'tipo':          tipo,
                    'orden_display': orden,
                    'activo':        True,
                }
            )
            unidad_map[codigo] = obj
            if created:
                creadas += 1

        self.stdout.write(self.style.SUCCESS(
            f'Organigrama cargado: {creadas} nuevas, {Unidad.objects.count()} total.'
        ))