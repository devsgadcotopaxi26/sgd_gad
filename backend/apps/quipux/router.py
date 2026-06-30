"""
Database router for Quipux historical databases.

Routes quipux models to the appropriate read-only database:
- Models ending in 'Doc' or 'Data' -> quipux_documental (84GB PDFs)
- All other quipux models -> quipux_transaccional (522MB metadata)

Never allows migrations or writes on quipux app.
"""


class QuipuxRouter:
    """Route quipux models to their respective read-only databases."""

    DOCUMENTAL_MODELS = {'quipuxarchivodoc', 'quipuxarchivodata'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'quipux':
            if model.__name__.lower() in self.DOCUMENTAL_MODELS:
                return 'quipux_documental'
            return 'quipux_transaccional'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'quipux':
            return False
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if obj1._meta.app_label == 'quipux' or obj2._meta.app_label == 'quipux':
            return obj1._meta.app_label == obj2._meta.app_label
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == 'quipux':
            return False
        if db in ('quipux_transaccional', 'quipux_documental'):
            return False
        return None
