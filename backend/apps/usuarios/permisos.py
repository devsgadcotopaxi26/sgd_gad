"""
Sistema de permisos por rol para el SGD GAD Cotopaxi

Nota F2-F (Carpetas Virtuales): la ADMINISTRACIÓN del árbol de carpetas
virtuales (crear/renombrar/mover/desactivar/reactivar) está hoy restringida a
ADMIN_GENERAL / superusuario en `apps.documentos.servicios_carpeta`
(`es_admin_carpetas`), sin usar este catálogo. En el futuro podría añadirse
un rol `GESTOR_CARPETAS_VIRTUALES` o un módulo `carpetas` con acciones
['ver','clasificar','administrar']; por ahora NO se crea. El usuario normal
solo consulta el árbol de su unidad y clasifica documentos.
"""

# El módulo 'tramites' tiene una estructura especial: canal -> acciones,
# porque el acceso a trámites depende del canal por el que ingresó
# (ventanilla, email, web). Todos los demás módulos son modulo -> [acciones].
PERMISOS_ROL = {
    # ── USUARIO — funcionario normal, gestión documental tipo Quipux ───────
    'USUARIO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
    },

    # ── ASISTENTE_ARCHIVO (antes ARCHIVO) — personal de Archivo/Ventanilla ──
    # Trabaja de lleno los trámites de ventanilla; solo consulta los de
    # email/web para detectar duplicidades o informar al ciudadano.
    'ASISTENTE_ARCHIVO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites': {
            'ventanilla': ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
            'email':      ['ver'],
            'web':        ['ver'],
        },
    },

    # ── GESTOR_DOCUMENTAL — opera los 3 canales de trámites + archivo ──────
    # Todo lo de ASISTENTE_ARCHIVO, más manejo pleno de los 3 canales (puede suplir a
    # Ventanilla) y operación normal del módulo de archivo (expedientes,
    # cuadro de clasificación, ciclo vital, transferencias, baja documental,
    # préstamos, copias certificadas, digitalización masiva). No administra
    # usuarios, roles ni configuración técnica general.
    'GESTOR_DOCUMENTAL': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites': {
            'ventanilla': ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
            'email':      ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
            'web':        ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
        },
        'archivo':       ['ver', 'crear', 'editar', 'transferir'],
    },

    # ── RESPONSABLE_ARCHIVO (antes ADMIN_ARCHIVO) — autoridad funcional ────
    # del área documental/archivística. Todo lo de GESTOR_DOCUMENTAL, más
    # administración de la configuración archivística (expedientes,
    # clasificación documental, organigrama) y reportes. NO administra
    # usuarios ni roles — eso es exclusivo de ADMIN_GENERAL.
    'RESPONSABLE_ARCHIVO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites': {
            'ventanilla': ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
            'email':      ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
            'web':        ['ver', 'crear', 'editar', 'reasignar', 'resolver'],
        },
        'archivo':       ['ver', 'crear', 'editar', 'eliminar', 'transferir'],
        'organigrama':   ['ver', 'editar'],
        'usuarios':      ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },

    # ── ADMIN_GENERAL — superadministrador funcional/técnico del sistema ───
    'ADMIN_GENERAL': {
        'documentos':    ['ver', 'crear', 'editar', 'eliminar', 'firmar', 'enviar', 'archivar'],
        'tramites': {
            'ventanilla': ['ver', 'crear', 'editar', 'eliminar', 'reasignar', 'resolver'],
            'email':      ['ver', 'crear', 'editar', 'eliminar', 'reasignar', 'resolver'],
            'web':        ['ver', 'crear', 'editar', 'eliminar', 'reasignar', 'resolver'],
        },
        'archivo':       ['ver', 'crear', 'editar', 'eliminar', 'transferir'],
        'usuarios':      ['ver', 'crear', 'editar', 'eliminar', 'bloquear'],
        'organigrama':   ['ver', 'crear', 'editar', 'eliminar'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       ['ver', 'editar'],
    },

}


def _acumular_modulo(permisos: dict, canales_tramite: dict, modulo: str, acciones, sobrescribir: bool = False):
    """Agrega las acciones de un módulo a `permisos` (o a `canales_tramite`
    si el módulo es 'tramites', que tiene la forma canal -> acciones)."""
    if modulo == 'tramites':
        for canal, acciones_canal in acciones.items():
            if sobrescribir:
                canales_tramite[canal] = set(acciones_canal)
            else:
                canales_tramite.setdefault(canal, set()).update(acciones_canal)
    else:
        if sobrescribir:
            permisos[modulo] = set(acciones)
        else:
            permisos.setdefault(modulo, set()).update(acciones)


def get_permisos_usuario(usuario) -> dict:
    """Retorna los permisos combinados de todos los roles activos del usuario.

    'tramites' se aplana a una lista única (unión de acciones de todos los
    canales) bajo la clave 'tramites', para no romper nada que ya consuma
    ese formato (frontend, tiene_permiso). El detalle por canal se expone
    además en 'tramites_canales' (canal -> acciones), listo para cuando se
    implemente autorización por canal en el backend — hoy no se aplica.
    """
    permisos = {}
    canales_tramite = {}
    roles_activos = usuario.roles.filter(activo=True).values_list('rol__codigo', flat=True)

    for rol_codigo in roles_activos:
        for modulo, acciones in PERMISOS_ROL.get(rol_codigo, {}).items():
            _acumular_modulo(permisos, canales_tramite, modulo, acciones)

    # Superusuario Django siempre tiene todos los permisos de ADMIN_GENERAL
    if usuario.is_superuser:
        for modulo, acciones in PERMISOS_ROL['ADMIN_GENERAL'].items():
            _acumular_modulo(permisos, canales_tramite, modulo, acciones, sobrescribir=True)

    # Fallback: cualquier usuario sin roles asignados recibe permisos de USUARIO.
    if not permisos and not canales_tramite:
        for modulo, acciones in PERMISOS_ROL['USUARIO'].items():
            _acumular_modulo(permisos, canales_tramite, modulo, acciones)

    resultado = {modulo: list(acciones) for modulo, acciones in permisos.items()}
    if canales_tramite:
        resultado['tramites'] = sorted({accion for acciones in canales_tramite.values() for accion in acciones})
        resultado['tramites_canales'] = {canal: sorted(acciones) for canal, acciones in canales_tramite.items()}
    return resultado


def tiene_permiso(usuario, modulo: str, accion: str) -> bool:
    """Verifica si un usuario tiene un permiso específico."""
    if usuario.is_superuser:
        return True
    permisos = get_permisos_usuario(usuario)
    return accion in permisos.get(modulo, [])


class PermisoSGD:
    """Mixin para vistas que requieren permisos específicos."""

    modulo  = ''
    accion  = 'ver'

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.modulo and not tiene_permiso(request.user, self.modulo, self.accion):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                f'No tienes permiso para {self.accion} en {self.modulo}.'
            )


# ── Permiso DRF por MÓDULO para ViewSets (F3-A) ────────────────────────────
from rest_framework.permissions import BasePermission


class PermisoModulo(BasePermission):
    """
    Autorización por MÓDULO del catálogo central `PERMISOS_ROL`, para ViewSets
    (y APIViews) de DRF. NO es un segundo sistema de permisos: solo adapta la
    acción DRF al verbo del catálogo y delega en `tiene_permiso()`
    (que ya incluye el bypass de superusuario).

    Uso en la vista:
        permission_classes = [IsAuthenticated, PermisoModulo]
        modulo_permiso     = 'archivo'
        # opcional, para @action personalizadas:
        acciones_permiso   = {'agregar_documento': 'editar', 'transferir': 'transferir'}

    Mapeo por defecto de la acción del ViewSet → verbo:
        list/retrieve/metadata            → 'ver'
        create                            → 'crear'
        update/partial_update             → 'editar'
        destroy                           → 'eliminar'
        (@action no mapeada)              → 'ver' si es GET, 'editar' en otro caso
    Una vista sin `modulo_permiso` no es afectada (devuelve True).
    """

    message = 'No tiene permiso para acceder a este módulo.'

    _MAP_ACCION = {
        'list': 'ver', 'retrieve': 'ver', 'metadata': 'ver',
        'create': 'crear',
        'update': 'editar', 'partial_update': 'editar',
        'destroy': 'eliminar',
    }
    _METODOS_LECTURA = {'GET', 'HEAD', 'OPTIONS'}

    def _verbo(self, request, view):
        accion = getattr(view, 'action', None)
        overrides = getattr(view, 'acciones_permiso', {}) or {}
        if accion in overrides:
            return overrides[accion]
        if accion in self._MAP_ACCION:
            return self._MAP_ACCION[accion]
        # @action personalizada sin override, o APIView: decidir por método.
        return 'ver' if request.method in self._METODOS_LECTURA else 'editar'

    def has_permission(self, request, view):
        modulo = getattr(view, 'modulo_permiso', None)
        if not modulo:
            return True
        if not (request.user and request.user.is_authenticated):
            return False  # → 401 (DRF: no autenticado)
        return tiene_permiso(request.user, modulo, self._verbo(request, view))
