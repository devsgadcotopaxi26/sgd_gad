from django.contrib import admin
from .models import Nivel, Funcion, Unidad


@admin.register(Nivel)
class NivelAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'orden', 'activo']


@admin.register(Funcion)
class FuncionAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'activo']


@admin.register(Unidad)
class UnidadAdmin(admin.ModelAdmin):
    list_display  = ['codigo', 'siglas', 'nombre', 'tipo', 'padre', 'activo']
    list_filter   = ['tipo', 'activo', 'nivel']
    search_fields = ['nombre', 'codigo', 'siglas']
    ordering      = ['orden_display']
    raw_id_fields = ['padre']