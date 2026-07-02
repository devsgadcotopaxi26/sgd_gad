"""
Sistema de permisos por rol para el SGD GAD Cotopaxi
"""

PERMISOS_ROL = {
    'ADMIN': {
        'documentos':    ['ver', 'crear', 'editar', 'eliminar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'editar', 'eliminar', 'resolver', 'reasignar'],
        'archivo':       ['ver', 'crear', 'editar', 'eliminar', 'transferir'],
        'usuarios':      ['ver', 'crear', 'editar', 'eliminar', 'bloquear'],
        'organigrama':   ['ver', 'crear', 'editar', 'eliminar'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       ['ver', 'editar'],
    },
    'PREFECTO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'resolver', 'reasignar'],
        'archivo':       ['ver'],
        'usuarios':      ['ver'],
        'organigrama':   ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },
    'SECRETARIO': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'reasignar'],
        'archivo':       ['ver', 'crear', 'archivar'],
        'usuarios':      ['ver'],
        'organigrama':   ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },
    'DIRECTOR': {
        'documentos':    ['ver', 'crear', 'editar', 'firmar', 'enviar', 'archivar'],
        'tramites':      ['ver', 'crear', 'editar', 'resolver', 'reasignar'],
        'archivo':       ['ver', 'crear'],
        'usuarios':      ['ver'],
        'organigrama':   ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },
    'ANALISTA': {
        'documentos':    ['ver', 'crear', 'editar', 'enviar'],
        'tramites':      ['ver', 'crear', 'editar', 'resolver'],
        'archivo':       ['ver', 'crear'],
        'usuarios':      ['ver'],
        'organigrama':   ['ver'],
        'reportes':      ['ver'],
        'ajustes':       [],
    },
    'ASISTENTE': {
        'documentos':    ['ver', 'crear', 'editar'],
        'tramites':      ['ver', 'crear'],
        'archivo':       ['ver'],
        'usuarios':      ['ver'],
        'organigrama':   ['ver'],
        'reportes':      ['ver'],
        'ajustes':       [],
    },
    'RECEPCION': {
        'documentos':    ['ver'],
        'tramites':      ['ver', 'crear'],
        'archivo':       ['ver'],
        'usuarios':      [],
        'organigrama':   ['ver'],
        'reportes':      [],
        'ajustes':       [],
    },
    'ARCHIVO': {
        'documentos':    ['ver', 'archivar'],
        'tramites':      ['ver'],
        'archivo':       ['ver', 'crear', 'editar', 'transferir'],
        'usuarios':      [],
        'organigrama':   ['ver'],
        'reportes':      ['ver', 'generar'],
        'ajustes':       [],
    },
    'SOLO_LECTURA': {
        'documentos':    ['ver'],
        'tramites':      ['ver'],
        'archivo':       ['ver'],
        'usuarios':      [],
        'organigrama':   ['ver'],
        'reportes':      ['ver'],
        'ajustes':       [],
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

    # Admin siempre tiene todo
    if usuario.is_superuser:
        for modulo in PERMISOS_ROL['ADMIN']:
            permisos[modulo] = set(PERMISOS_ROL['ADMIN'][modulo])

    # Fallback: cualquier funcionario sin roles asignados recibe permisos
    # minimos de SOLO_LECTURA para poder acceder al sistema (documentos, Quipux).
    if not permisos and getattr(usuario, 'tipo', '') == 'funcionario':
        for modulo, acciones in PERMISOS_ROL['SOLO_LECTURA'].items():
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
