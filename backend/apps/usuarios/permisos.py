"""
Sistema de permisos por rol para el SGD GAD Cotopaxi
"""

PERMISOS_ROL = {
    # ── Rol 1: USUARIO — crea y gestiona documentos, sin menús de módulos ──
    'USUARIO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
    },

    # ── Rol 2: ARCHIVO — funcionario que trabaja con trámites y archivo ────
    'ARCHIVO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'reasignar'],
        'archivo':       ['ver', 'crear', 'editar', 'transferir'],
        'organigrama':   ['ver'],
        'reportes':      ['ver'],
        'ajustes':       [],
    },

    # ── Rol 3: ADMIN_ARCHIVO — administrador del módulo de archivo ─────────
    'ADMIN_ARCHIVO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'editar', 'resolver', 'reasignar'],
        'archivo':       ['ver', 'crear', 'editar', 'eliminar', 'transferir'],
        'organigrama':   ['ver', 'editar'],
        'usuarios':      ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },

    # ── Rol 4: ADMIN_GENERAL — administrador completo del sistema ──────────
    'ADMIN_GENERAL': {
        'documentos':    ['ver', 'crear', 'editar', 'eliminar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'editar', 'eliminar', 'resolver', 'reasignar'],
        'archivo':       ['ver', 'crear', 'editar', 'eliminar', 'transferir'],
        'usuarios':      ['ver', 'crear', 'editar', 'eliminar', 'bloquear'],
        'organigrama':   ['ver', 'crear', 'editar', 'eliminar'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       ['ver', 'editar'],
    },

}


def get_permisos_usuario(usuario) -> dict:
    """Retorna los permisos combinados de todos los roles activos del usuario."""
    permisos = {}
    roles_activos = usuario.roles.filter(activo=True).values_list('rol__codigo', flat=True)

    for rol_codigo in roles_activos:
        rol_permisos = PERMISOS_ROL.get(rol_codigo, {})
        for modulo, acciones in rol_permisos.items():
            if modulo not in permisos:
                permisos[modulo] = set()
            permisos[modulo].update(acciones)

    # Superusuario Django siempre tiene todos los permisos de ADMIN_GENERAL
    if usuario.is_superuser:
        for modulo, acciones in PERMISOS_ROL['ADMIN_GENERAL'].items():
            permisos[modulo] = set(acciones)

    # Fallback: cualquier usuario sin roles asignados recibe permisos de USUARIO.
    if not permisos:
        for modulo, acciones in PERMISOS_ROL['USUARIO'].items():
            permisos[modulo] = set(acciones)

    return {modulo: list(acciones) for modulo, acciones in permisos.items()}


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
