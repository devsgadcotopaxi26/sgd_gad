"""
Vistas API para consulta del sistema Quipux historico (solo lectura).

Todas las consultas van a bases de datos externas restauradas desde
backups de Quipux. Si las bases no estan disponibles, se retorna 503.
"""

import base64

from django.db import connections
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    QuipuxHistEventos,
    QuipuxRadicado,
    QuipuxTransaccion,
    QuipuxUsuario,
)
from .serializers import (
    ESTADO_MAP,
    QuipuxHistEventoSerializer,
    QuipuxRadicadoListSerializer,
)


class QuipuxDocumentosView(APIView):
    """Listado paginado de documentos radicados con filtros."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search = request.query_params.get('search', '')
        estado = request.query_params.get('estado', '')
        tipo = request.query_params.get('tipo', '')
        desde = request.query_params.get('desde', '')
        hasta = request.query_params.get('hasta', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))

        try:
            qs = QuipuxRadicado.objects.using('quipux_transaccional').all()
        except Exception:
            return Response(
                {'detail': 'Base de datos Quipux no disponible. Contacte al administrador.'},
                status=503,
            )

        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(radi_asunto__icontains=search)
                | Q(radi_nume_text__icontains=search)
                | Q(radi_cuentai__icontains=search)
            )
        if estado:
            qs = qs.filter(esta_codi=int(estado))
        if tipo:
            qs = qs.filter(radi_tipo=int(tipo))
        if desde:
            qs = qs.filter(radi_fech_radi__gte=desde)
        if hasta:
            qs = qs.filter(radi_fech_radi__lte=hasta)

        total = qs.count()
        offset = (page - 1) * page_size
        items = list(qs.order_by('-radi_fech_radi')[offset:offset + page_size])

        # Resolve user names for creators
        user_ids = set()
        for item in items:
            if item.radi_usua_radi:
                user_ids.add(item.radi_usua_radi)
            if item.radi_usua_actu:
                user_ids.add(item.radi_usua_actu)

        users = {}
        if user_ids:
            try:
                for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(
                    usua_codi__in=user_ids
                ):
                    users[u.usua_codi] = u
            except Exception:
                pass

        for item in items:
            u = users.get(item.radi_usua_radi)
            item._creador_nombre = u.usua_nombre if u else ''
            item._area_nombre = u.depe_nomb if u else ''

        data = QuipuxRadicadoListSerializer(items, many=True).data

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': data,
        })


class QuipuxDocumentoDetalleView(APIView):
    """Detalle de un documento radicado con recorrido completo."""
    permission_classes = [IsAuthenticated]

    def get(self, request, radi_id):
        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception:
            return Response(
                {'detail': 'Base de datos Quipux no disponible.'}, status=503
            )

        # Get user info
        users = {}
        user_ids = [doc.radi_usua_radi, doc.radi_usua_actu]
        user_ids = [uid for uid in user_ids if uid]
        try:
            for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(
                usua_codi__in=user_ids
            ):
                users[u.usua_codi] = u
        except Exception:
            pass

        creador = users.get(doc.radi_usua_radi)
        actual = users.get(doc.radi_usua_actu)

        # Get history
        eventos = []
        try:
            hist_qs = QuipuxHistEventos.objects.using('quipux_transaccional').filter(
                radi_nume_radi=doc.radi_nume_radi
            ).order_by('hist_fech')

            # Get all user IDs from events
            evt_user_ids = set()
            for h in hist_qs:
                evt_user_ids.add(h.usua_codi_ori)
                if h.usua_codi_dest:
                    evt_user_ids.add(h.usua_codi_dest)

            evt_users = {}
            if evt_user_ids:
                for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(
                    usua_codi__in=evt_user_ids
                ):
                    evt_users[u.usua_codi] = u.usua_nombre or ''

            # Get transaction types
            trans = {}
            try:
                for t in QuipuxTransaccion.objects.using('quipux_transaccional').all():
                    trans[t.sgd_ttr_codigo] = t.sgd_ttr_descrip
            except Exception:
                pass

            for h in hist_qs:
                h._usuario_origen = evt_users.get(h.usua_codi_ori, '')
                h._usuario_destino = (
                    evt_users.get(h.usua_codi_dest, '') if h.usua_codi_dest else ''
                )
                h._transaccion = trans.get(h.sgd_ttr_codigo, '')

            eventos = QuipuxHistEventoSerializer(hist_qs, many=True).data
        except Exception:
            pass

        return Response({
            'radi_nume_radi': str(doc.radi_nume_radi),
            'radi_nume_text': doc.radi_nume_text or '',
            'radi_fech_radi': doc.radi_fech_radi,
            'radi_fech_ofic': doc.radi_fech_ofic,
            'radi_asunto': doc.radi_asunto or '',
            'radi_resumen': doc.radi_resumen or '',
            'radi_cuentai': doc.radi_cuentai or '',
            'estado': ESTADO_MAP.get(doc.esta_codi, f'Estado {doc.esta_codi}'),
            'esta_codi': doc.esta_codi,
            'radi_permiso': doc.radi_permiso,
            'radi_fech_firma': doc.radi_fech_firma,
            'radi_nomb_usua_firma': doc.radi_nomb_usua_firma or '',
            'tiene_pdf': doc.arch_codi > 0,
            'tiene_pdf_firmado': doc.arch_codi_firma > 0,
            'creador': {
                'nombre': creador.usua_nombre if creador else '',
                'cargo': creador.usua_cargo if creador else '',
                'area': creador.depe_nomb if creador else '',
                'cedula': creador.usua_cedula if creador else '',
            } if creador else None,
            'usuario_actual': {
                'nombre': actual.usua_nombre if actual else '',
                'area': actual.depe_nomb if actual else '',
            } if actual else None,
            'recorrido': eventos,
        })


class QuipuxPDFView(APIView):
    """Recupera el PDF de un documento desde la base documental."""
    permission_classes = [IsAuthenticated]

    def get(self, request, radi_id):
        firmado = request.query_params.get('firmado', 'false') == 'true'

        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception:
            return Response(
                {'detail': 'Base de datos Quipux no disponible.'}, status=503
            )

        arch_id = doc.arch_codi_firma if firmado else doc.arch_codi
        if not arch_id or arch_id == 0:
            return Response(
                {'detail': 'Este documento no tiene PDF asociado.'}, status=404
            )

        try:
            with connections['quipux_documental'].cursor() as cursor:
                cursor.execute("SELECT func_recuperar_archivo(%s)", [arch_id])
                row = cursor.fetchone()
                if not row or not row[0]:
                    return Response(
                        {'detail': 'Archivo no encontrado en la base documental.'},
                        status=404,
                    )

                pdf_bytes = base64.b64decode(row[0])

                filename = f"{doc.radi_nume_text or doc.radi_nume_radi}"
                if firmado:
                    filename += "_firmado"
                filename += ".pdf"

                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
        except Exception as e:
            return Response(
                {'detail': f'Error al recuperar el archivo: {str(e)}'}, status=500
            )


class QuipuxEstadisticasView(APIView):
    """Estadisticas generales de la base Quipux historica."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                cursor.execute("""
                    SELECT esta_codi, COUNT(*)
                    FROM radicado
                    GROUP BY esta_codi
                    ORDER BY esta_codi
                """)
                estados = {row[0]: row[1] for row in cursor.fetchall()}

                cursor.execute("SELECT COUNT(*) FROM radicado")
                total = cursor.fetchone()[0]

                cursor.execute(
                    "SELECT COUNT(DISTINCT usua_codi) FROM usuario WHERE usua_esta = 1"
                )
                total_usuarios = cursor.fetchone()[0]

                cursor.execute(
                    "SELECT MIN(radi_fech_radi), MAX(radi_fech_radi) FROM radicado"
                )
                fechas = cursor.fetchone()

            return Response({
                'total_documentos': total,
                'total_usuarios': total_usuarios,
                'fecha_primer_documento': fechas[0],
                'fecha_ultimo_documento': fechas[1],
                'por_estado': {
                    ESTADO_MAP.get(k, f'Estado {k}'): v for k, v in estados.items()
                },
            })
        except Exception as e:
            return Response(
                {'detail': f'Base Quipux no disponible: {str(e)}'}, status=503
            )
