"""
Vistas API para consulta del sistema Quipux historico (solo lectura).

Todas las consultas van a bases de datos externas restauradas desde
backups de Quipux. Si las bases no estan disponibles, se retorna 503.
"""

import base64
import mimetypes

from django.db import connections
from django.http import HttpResponse
from django.db.models import Q, Subquery, OuterRef
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    QuipuxAnexo,
    QuipuxHistEventos,
    QuipuxRadicado,
    QuipuxTransaccion,
    QuipuxUsuario,
    QuipuxUsuariosRadicado,
)
from .serializers import (
    ESTADO_MAP,
    TIPO_MIME,
    TIPO_EXT,
    QuipuxAnexoSerializer,
    QuipuxHistEventoSerializer,
    QuipuxRadicadoListSerializer,
)

# Roles en usuarios_radicado
TIPO_ENVIADO  = 1
TIPO_RECIBIDO = 2
TIPO_COPIA    = 3


def _cedula_usuario(user):
    """Retorna la cédula del usuario SGD actual."""
    return getattr(user, 'cedula', '') or ''


def _es_admin(user):
    return user.is_superuser or user.roles.filter(nombre__in=['ADMIN', 'ARCHIVO']).exists()


class QuipuxDocumentosView(APIView):
    """
    Listado paginado de documentos radicados.
    - Admin/Archivo: ve todos (o puede filtrar por bandeja global)
    - Resto de usuarios: solo ve sus documentos según su cédula + bandeja
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search    = request.query_params.get('search', '')
        estado    = request.query_params.get('estado', '')
        tipo      = request.query_params.get('tipo', '')
        desde     = request.query_params.get('desde', '')
        hasta     = request.query_params.get('hasta', '')
        bandeja   = request.query_params.get('bandeja', '')   # recibidos|enviados|copia|todos
        page      = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))

        es_admin = _es_admin(request.user)
        cedula   = _cedula_usuario(request.user)

        try:
            qs = QuipuxRadicado.objects.using('quipux_transaccional').all()
        except Exception:
            return Response(
                {'detail': 'Base de datos Quipux no disponible. Contacte al administrador.'},
                status=503,
            )

        # ── Filtro por usuario si no es admin ──
        TIPO_MAP = {'recibidos': TIPO_RECIBIDO, 'enviados': TIPO_ENVIADO, 'copia': TIPO_COPIA}
        if not es_admin and cedula:
            try:
                ur_filter = {'usua_cedula': cedula}
                tipo_filtro = TIPO_MAP.get(bandeja)
                if tipo_filtro:
                    ur_filter['radi_usua_tipo'] = tipo_filtro
                mis_ids = QuipuxUsuariosRadicado.objects.using('quipux_transaccional').filter(
                    **ur_filter
                ).values_list('radi_nume_radi', flat=True)
                qs = qs.filter(radi_nume_radi__in=mis_ids)
            except Exception:
                pass
        elif es_admin and bandeja and bandeja != 'todos':
            tipo_filtro = TIPO_MAP.get(bandeja)
            if tipo_filtro:
                try:
                    mis_ids = QuipuxUsuariosRadicado.objects.using('quipux_transaccional').filter(
                        radi_usua_tipo=tipo_filtro
                    ).values_list('radi_nume_radi', flat=True)
                    qs = qs.filter(radi_nume_radi__in=mis_ids)
                except Exception:
                    pass

        # ── Filtros adicionales ──
        if search:
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

        # Deduplicar: Quipux crea un registro por cada paso del flujo
        # (elaboracion -> tramite -> enviado). Quedarse solo con el mas reciente.
        latest_date = qs.filter(
            radi_nume_text=OuterRef('radi_nume_text')
        ).order_by('-radi_fech_radi').values('radi_fech_radi')[:1]
        qs = qs.filter(radi_fech_radi=Subquery(latest_date))

        total  = qs.count()
        offset = (page - 1) * page_size
        items  = list(qs.order_by('-radi_fech_radi')[offset:offset + page_size])

        user_ids = {u for item in items for u in [item.radi_usua_radi, item.radi_usua_actu] if u}
        users = {}
        if user_ids:
            try:
                for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(usua_codi__in=user_ids):
                    users[u.usua_codi] = u
            except Exception:
                pass

        for item in items:
            u = users.get(item.radi_usua_radi)
            item._creador_nombre = u.usua_nombre if u else ''
            item._area_nombre    = u.depe_nomb  if u else ''

        return Response({
            'count': total, 'page': page, 'page_size': page_size,
            'results': QuipuxRadicadoListSerializer(items, many=True).data,
            'es_admin': es_admin,
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


class QuipuxAnexosView(APIView):
    """Lista los anexos (adjuntos) de un radicado."""
    permission_classes = [IsAuthenticated]

    def get(self, request, radi_id):
        try:
            anexos = QuipuxAnexo.objects.using('quipux_transaccional').filter(
                anex_radi_nume=radi_id,
                anex_borrado='N',
            ).order_by('anex_numero')
        except Exception:
            return Response({'detail': 'Base de datos Quipux no disponible.'}, status=503)

        return Response(QuipuxAnexoSerializer(anexos, many=True).data)


class QuipuxAnexoDownloadView(APIView):
    """Descarga el archivo de un anexo desde la base documental."""
    permission_classes = [IsAuthenticated]

    def get(self, request, anex_codigo):
        try:
            anexo = QuipuxAnexo.objects.using('quipux_transaccional').get(
                anex_codigo=anex_codigo
            )
        except QuipuxAnexo.DoesNotExist:
            return Response({'detail': 'Anexo no encontrado.'}, status=404)
        except Exception:
            return Response({'detail': 'Base de datos Quipux no disponible.'}, status=503)

        arch_id = anexo.arch_codi
        if not arch_id or arch_id == 0:
            return Response({'detail': 'Este anexo no tiene archivo almacenado.'}, status=404)

        try:
            with connections['quipux_documental'].cursor() as cursor:
                cursor.execute('SELECT func_recuperar_archivo(%s)', [arch_id])
                row = cursor.fetchone()
                if not row or not row[0]:
                    return Response({'detail': 'Archivo no encontrado en la base documental.'}, status=404)

                file_bytes = base64.b64decode(row[0])

                nombre   = anexo.anex_nombre or f'anexo_{anex_codigo}'
                ext      = TIPO_EXT.get(anexo.anex_tipo, 'bin')
                if not nombre.lower().endswith(f'.{ext}'):
                    nombre = f'{nombre}.{ext}'
                mime = TIPO_MIME.get(anexo.anex_tipo, 'application/octet-stream')

                response = HttpResponse(file_bytes, content_type=mime)
                response['Content-Disposition'] = f'attachment; filename="{nombre}"'
                return response
        except Exception as e:
            return Response({'detail': f'Error al recuperar archivo: {str(e)}'}, status=500)


class QuipuxMisBandejasView(APIView):
    """Conteo de documentos del usuario actual por bandeja en Quipux histórico."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cedula = _cedula_usuario(request.user)
        if not cedula:
            return Response({'recibidos': 0, 'enviados': 0, 'copia': 0, 'total': 0})

        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                cursor.execute("""
                    SELECT radi_usua_tipo, COUNT(DISTINCT radi_nume_radi)
                    FROM usuarios_radicado
                    WHERE usua_cedula = %s
                    GROUP BY radi_usua_tipo
                """, [cedula])
                rows = {row[0]: row[1] for row in cursor.fetchall()}

            return Response({
                'recibidos': rows.get(TIPO_RECIBIDO, 0),
                'enviados':  rows.get(TIPO_ENVIADO, 0),
                'copia':     rows.get(TIPO_COPIA, 0),
                'total':     sum(rows.values()),
            })
        except Exception as e:
            return Response({'detail': str(e)}, status=503)
