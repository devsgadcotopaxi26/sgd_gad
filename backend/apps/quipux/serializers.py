"""
Serializers para el modulo Quipux historico (solo lectura).
"""

from rest_framework import serializers

ESTADO_MAP = {
    0: 'Archivado',
    1: 'En elaboracion',
    2: 'En tramite',
    3: 'No enviado',
    6: 'Enviado',
    7: 'Eliminado',
}


class QuipuxRadicadoListSerializer(serializers.Serializer):
    """Serializer para listado de documentos radicados."""
    radi_nume_radi = serializers.DecimalField(max_digits=20, decimal_places=0)
    radi_nume_text = serializers.CharField()
    radi_fech_radi = serializers.DateTimeField()
    radi_asunto = serializers.CharField()
    radi_tipo = serializers.IntegerField()
    esta_codi = serializers.IntegerField()
    estado_nombre = serializers.SerializerMethodField()
    radi_permiso = serializers.IntegerField()
    radi_fech_firma = serializers.DateTimeField()
    radi_nomb_usua_firma = serializers.CharField()
    radi_cuentai = serializers.CharField()
    tiene_pdf = serializers.SerializerMethodField()
    tiene_pdf_firmado = serializers.SerializerMethodField()
    # Resolved fields from usuario view
    creador_nombre = serializers.SerializerMethodField()
    area_nombre = serializers.SerializerMethodField()

    def get_estado_nombre(self, obj):
        return ESTADO_MAP.get(obj.esta_codi, f'Estado {obj.esta_codi}')

    def get_tiene_pdf(self, obj):
        return obj.arch_codi > 0

    def get_tiene_pdf_firmado(self, obj):
        return obj.arch_codi_firma > 0

    def get_creador_nombre(self, obj):
        return getattr(obj, '_creador_nombre', '')

    def get_area_nombre(self, obj):
        return getattr(obj, '_area_nombre', '')


class QuipuxHistEventoSerializer(serializers.Serializer):
    """Serializer para eventos del recorrido de un documento."""
    hist_codi = serializers.IntegerField()
    hist_fech = serializers.DateTimeField()
    hist_obse = serializers.CharField()
    sgd_ttr_codigo = serializers.IntegerField()
    usuario_origen = serializers.SerializerMethodField()
    usuario_destino = serializers.SerializerMethodField()
    transaccion = serializers.SerializerMethodField()

    def get_usuario_origen(self, obj):
        return getattr(obj, '_usuario_origen', '')

    def get_usuario_destino(self, obj):
        return getattr(obj, '_usuario_destino', '')

    def get_transaccion(self, obj):
        return getattr(obj, '_transaccion', '')
