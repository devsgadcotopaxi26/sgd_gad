from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

Usuario = get_user_model()


class CedulaEmailBackend(ModelBackend):
    """
    Autenticación por cédula O email.
    Acepta un campo genérico 'username' que puede ser cédula o correo.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None

        user = None
        # Intentar por cédula primero
        try:
            user = Usuario.objects.get(cedula=username)
        except Usuario.DoesNotExist:
            pass

        # Si no se encontró por cédula, intentar por email
        if user is None:
            try:
                user = Usuario.objects.get(email=username)
            except Usuario.DoesNotExist:
                return None

        # ── TEMPORAL DE PRUEBAS ── contraseña = cédula del usuario ──────────
        # Para restaurar el login normal: eliminar el bloque cedula y
        # descomentar la línea check_password.
        cedula = user.cedula or ''
        if cedula and password == cedula and self.user_can_authenticate(user):
            return user
        # Fallback a contraseña real para usuarios sin cédula (ej. cuenta admin).
        # if user.check_password(password) and self.user_can_authenticate(user):
        #     return user
        if not cedula and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
