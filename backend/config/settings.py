"""
SGD — Sistema de Gestión Documental
GAD Provincia de Cotopaxi
Django Settings
"""

from pathlib import Path
from datetime import timedelta
from decouple import config
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Seguridad ─────────────────────────────────────────────
SECRET_KEY    = config('DJANGO_SECRET_KEY')
DEBUG         = config('DJANGO_DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost').split(',')

# ── Apps instaladas ───────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
]

LOCAL_APPS = [
    'apps.usuarios',
    'apps.organizacion',
    'apps.documentos',
    'apps.tramites',
    'apps.correos',
    'apps.archivo',
    'apps.auditoria',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ────────────────────────────────────────────
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Base de datos PostgreSQL ──────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   config('DB_ENGINE',   default='django.db.backends.postgresql'),
        'NAME':     config('DB_NAME',     default='sgd_gad_cotopaxi'),
        'USER':     config('DB_USER',     default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='sgd2026'),
        'HOST':     config('DB_HOST',     default='host.docker.internal'),
        'PORT':     config('DB_PORT',     default='5432'),
        'OPTIONS':  { 'options': '-c search_path=public' },
    }
}

# ── Usuario personalizado ─────────────────────────────────
AUTH_USER_MODEL = 'usuarios.Usuario'

# ── Internacionalización ──────────────────────────────────
LANGUAGE_CODE = 'es-ec'
TIME_ZONE     = 'America/Guayaquil'
USE_I18N      = True
USE_TZ        = True

# ── Archivos estáticos ────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ─────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
}

# ── JWT ───────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'USER_ID_FIELD':            'id',
    'USER_ID_CLAIM':            'user_id',
}

# ── CORS ──────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

# ── Celery ────────────────────────────────────────────────
CELERY_BROKER_URL       = config('CELERY_BROKER_URL',       default='redis://redis:6379/0')
CELERY_RESULT_BACKEND   = config('CELERY_RESULT_BACKEND',   default='redis://redis:6379/1')
CELERY_TIMEZONE         = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_BEAT_SCHEDULER   = 'django_celery_beat.schedulers:DatabaseScheduler'

# ── Email ─────────────────────────────────────────────────
EMAIL_BACKEND      = config('EMAIL_BACKEND',      default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST         = config('EMAIL_HOST',         default='localhost')
EMAIL_PORT         = config('EMAIL_PORT',         default=587, cast=int)
EMAIL_USE_TLS      = config('EMAIL_USE_TLS',      default=True, cast=bool)
EMAIL_HOST_USER    = config('EMAIL_HOST_USER',    default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='SGD GAD Cotopaxi <sgd@cotopaxi.gob.ec>')

# ── Logging ───────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level':    'INFO',
    },
    'loggers': {
        'django': {
            'handlers':  ['console'],
            'level':     'INFO',
            'propagate': False,
        },
    },
}

# ── Configuración de producción (solo si DEBUG=False) ─────
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER      = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True
    X_FRAME_OPTIONS                = 'DENY'
    SECURE_HSTS_SECONDS            = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SESSION_COOKIE_SECURE          = True
    CSRF_COOKIE_SECURE             = True

    LOGGING['handlers']['file'] = {
        'class':     'logging.FileHandler',
        'filename':  '/app/logs/sgd.log',
        'formatter': 'verbose',
    }
    LOGGING['root']['handlers'] = ['console', 'file']