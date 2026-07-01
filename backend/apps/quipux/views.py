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
    QuipuxAnexo,
    QuipuxHistEventos,
    QuipuxRadicado,
    QuipuxTransaccion,
    QuipuxUsuario,
)
from .serializers import (
    ESTADO_MAP,
    TIPO_MIME,
    TIPO_EXT,
    QuipuxAnexoSerializer,
    QuipuxHistEventoSerializer,
)

# Roles en usuarios_radicado
TIPO_ENVIADO  = 1
TIPO_RECIBIDO = 2
TIPO_COPIA    = 3

TIPO_MAP = {'recibidos': TIPO_RECIBIDO, 'enviados': TIPO_ENVIADO, 'copia': TIPO_COPIA}


def _cedula_usuario(user):
    return getattr(user, 'cedula', '') or ''


def _es_admin(user):
    return user.is_superuser or user.roles.filter(nombre__in=['ADMIN', 'ARCHIVO']).exists()


class QuipuxDocumentosView(APIView):
    """
    Listado paginado de documentos radicados, deduplicado por radi_nume_text.

    Quipux crea un registro en 'radicado' por cada destinatario/paso del flujo,
    por lo que el mismo numero de documento aparece N veces. Esta vista agrupa
    por radi_nume_text, toma el registro con MAX(radi_nume_radi) como representante
    y usa MAX(arch_codi) entre todos los hermanos para saber si hay PDF disponible.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search    = request.query_params.get('search', '').strip()
        estado    = request.query_params.get('estado', '').strip()
        desde     = request.query_params.get('desde', '').strip()
        hasta     = request.query_params.get('hasta', '').strip()
        bandeja   = request.query_params.get('bandeja', '').strip()
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = max(1, min(100, int(request.query_params.get('page_size', 50))))

        es_admin = _es_admin(request.user)
        cedula   = _cedula_usuario(request.user)

        # ── Construir WHERE dinámico con parámetros seguros ──
        where_parts = []
        params: list = []

        if not es_admin and cedula:
            tipo_filtro = TIPO_MAP.get(bandeja)
            if tipo_filtro:
                where_parts.append(
                    "r.radi_nume_radi IN "
                    "(SELECT radi_nume_radi FROM usuarios_radicado "
                    " WHERE usua_cedula = %s AND radi_usua_tipo = %s)"
                )
                params.extend([cedula, tipo_filtro])
            else:
                where_parts.append(
                    "r.radi_nume_radi IN "
                    "(SELECT radi_nume_radi FROM usuarios_radicado WHERE usua_cedula = %s)"
                )
                params.append(cedula)
        elif es_admin and bandeja and bandeja != 'todos':
            tipo_filtro = TIPO_MAP.get(bandeja)
            if tipo_filtro:
                where_parts.append(
                    "r.radi_nume_radi IN "
                    "(SELECT radi_nume_radi FROM usuarios_radicado WHERE radi_usua_tipo = %s)"
                )
                params.append(tipo_filtro)

        if search:
            where_parts.append(
                "(r.radi_asunto ILIKE %s OR r.radi_nume_text ILIKE %s OR r.radi_cuentai ILIKE %s)"
            )
            like = f'%{search}%'
            params.extend([like, like, like])
        if estado:
            where_parts.append("r.esta_codi = %s")
            params.append(int(estado))
        if desde:
            where_parts.append("r.radi_fech_radi >= %s")
            params.append(desde)
        if hasta:
            where_parts.append("r.radi_fech_radi <= %s")
            params.append(hasta)

        where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                # Contar documentos unicos
                cursor.execute(
                    f"SELECT COUNT(DISTINCT r.radi_nume_text) FROM radicado r {where_sql}",
                    params,
                )
                total = cursor.fetchone()[0]

                # Obtener página deduplicada con mejor arch_codi
                offset = (page - 1) * page_size
                cursor.execute(f"""
                    WITH base AS (
                        SELECT
                            r.radi_nume_radi,
                            r.radi_nume_text,
                            r.radi_fech_radi,
                            r.radi_asunto,
                            r.radi_tipo,
                            r.esta_codi,
                            r.radi_permiso,
                            r.radi_fech_firma,
                            r.radi_nomb_usua_firma,
                            r.radi_cuentai,
                            r.radi_usua_radi,
                            r.radi_usua_actu,
                            COALESCE(r.arch_codi, 0)       AS arch_codi,
                            COALESCE(r.arch_codi_firma, 0)  AS arch_codi_firma
                        FROM radicado r
                        {where_sql}
                    ),
                    agg AS (
                        SELECT
                            b.radi_nume_text,
                            MAX(b.radi_nume_radi)          AS repr_id,
                            MAX(b.arch_codi)               AS best_arch_codi,
                            MAX(b.arch_codi_firma)         AS best_arch_codi_firma,
                            COUNT(ax.anex_codigo)          AS num_anexos
                        FROM base b
                        LEFT JOIN anexos ax
                               ON ax.anex_radi_nume = b.radi_nume_radi
                              AND ax.anex_borrado = 'N'
                        GROUP BY b.radi_nume_text
                    )
                    SELECT
                        b.radi_nume_radi,
                        b.radi_nume_text,
                        b.radi_fech_radi,
                        b.radi_asunto,
                        b.radi_tipo,
                        b.esta_codi,
                        b.radi_permiso,
                        b.radi_fech_firma,
                        b.radi_nomb_usua_firma,
                        b.radi_cuentai,
                        b.radi_usua_radi,
                        b.radi_usua_actu,
                        a.best_arch_codi,
                        a.best_arch_codi_firma,
                        a.num_anexos > 0 AS tiene_anexos
                    FROM base b
                    JOIN agg a ON b.radi_nume_radi = a.repr_id
                    ORDER BY b.radi_fech_radi DESC NULLS LAST, b.radi_nume_radi DESC
                    LIMIT %s OFFSET %s
                """, params + [page_size, offset])

                cols = [c[0] for c in cursor.description]
                rows = [dict(zip(cols, row)) for row in cursor.fetchall()]

        except Exception as e:
            return Response(
                {'detail': f'Base de datos Quipux no disponible: {e}'},
                status=503,
            )

        # Resolver nombres de usuario/área
        user_ids = {r['radi_usua_radi'] for r in rows if r.get('radi_usua_radi')}
        users = {}
        if user_ids:
            try:
                for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(
                    usua_codi__in=user_ids
                ):
                    users[u.usua_codi] = u
            except Exception:
                pass

        def _fmt_dt(v):
            return v.isoformat() if v else None

        results = []
        for r in rows:
            u = users.get(r['radi_usua_radi'])
            results.append({
                'radi_nume_radi':      str(r['radi_nume_radi']),
                'radi_nume_text':      r['radi_nume_text'] or '',
                'radi_fech_radi':      _fmt_dt(r['radi_fech_radi']),
                'radi_asunto':         r['radi_asunto'] or '',
                'radi_tipo':           r['radi_tipo'],
                'esta_codi':           r['esta_codi'],
                'estado_nombre':       ESTADO_MAP.get(r['esta_codi'], f'Estado {r["esta_codi"]}'),
                'radi_permiso':        r['radi_permiso'],
                'radi_fech_firma':     _fmt_dt(r['radi_fech_firma']),
                'radi_nomb_usua_firma': r['radi_nomb_usua_firma'] or '',
                'radi_cuentai':        r['radi_cuentai'] or '',
                'tiene_pdf':           (r['best_arch_codi'] or 0) > 0,
                'tiene_pdf_firmado':   (r['best_arch_codi_firma'] or 0) > 0,
                'tiene_anexos':        bool(r.get('tiene_anexos')),
                'creador_nombre':      u.usua_nombre if u else '',
                'area_nombre':         u.depe_nomb  if u else '',
            })

        return Response({
            'count':    total,
            'page':     page,
            'page_size': page_size,
            'results':  results,
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
            return Response({'detail': 'Base de datos Quipux no disponible.'}, status=503)

        # Usuario creador y actual
        user_ids = [uid for uid in [doc.radi_usua_radi, doc.radi_usua_actu] if uid]
        users = {}
        try:
            for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(
                usua_codi__in=user_ids
            ):
                users[u.usua_codi] = u
        except Exception:
            pass

        creador = users.get(doc.radi_usua_radi)
        actual  = users.get(doc.radi_usua_actu)

        # Recorrido: buscar en TODOS los hermanos (mismo radi_nume_text)
        eventos = []
        try:
            sibling_ids = list(
                QuipuxRadicado.objects.using('quipux_transaccional')
                .filter(radi_nume_text=doc.radi_nume_text)
                .values_list('radi_nume_radi', flat=True)
            )
            hist_qs = QuipuxHistEventos.objects.using('quipux_transaccional').filter(
                radi_nume_radi__in=sibling_ids
            ).order_by('hist_fech')

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

            trans = {}
            try:
                for t in QuipuxTransaccion.objects.using('quipux_transaccional').all():
                    trans[t.sgd_ttr_codigo] = t.sgd_ttr_descrip
            except Exception:
                pass

            for h in hist_qs:
                h._usuario_origen  = evt_users.get(h.usua_codi_ori, '')
                h._usuario_destino = evt_users.get(h.usua_codi_dest, '') if h.usua_codi_dest else ''
                h._transaccion     = trans.get(h.sgd_ttr_codigo, '')

            eventos = QuipuxHistEventoSerializer(hist_qs, many=True).data
        except Exception:
            pass

        # arch_codi efectivo: el mejor entre todos los hermanos
        best_arch       = 0
        best_arch_firma = 0
        try:
            for sid in sibling_ids:
                row = QuipuxRadicado.objects.using('quipux_transaccional').get(
                    radi_nume_radi=sid
                )
                best_arch       = max(best_arch,       row.arch_codi or 0)
                best_arch_firma = max(best_arch_firma, row.arch_codi_firma or 0)
        except Exception:
            best_arch       = doc.arch_codi or 0
            best_arch_firma = doc.arch_codi_firma or 0

        return Response({
            'radi_nume_radi':      str(doc.radi_nume_radi),
            'radi_nume_text':      doc.radi_nume_text or '',
            'radi_fech_radi':      doc.radi_fech_radi,
            'radi_fech_ofic':      doc.radi_fech_ofic,
            'radi_asunto':         doc.radi_asunto or '',
            'radi_resumen':        doc.radi_resumen or '',
            'radi_cuentai':        doc.radi_cuentai or '',
            'estado':              ESTADO_MAP.get(doc.esta_codi, f'Estado {doc.esta_codi}'),
            'esta_codi':           doc.esta_codi,
            'radi_permiso':        doc.radi_permiso,
            'radi_fech_firma':     doc.radi_fech_firma,
            'radi_nomb_usua_firma': doc.radi_nomb_usua_firma or '',
            'tiene_pdf':           best_arch > 0,
            'tiene_pdf_firmado':   best_arch_firma > 0,
            'creador': {
                'nombre': creador.usua_nombre if creador else '',
                'cargo':  creador.usua_cargo  if creador else '',
                'area':   creador.depe_nomb   if creador else '',
                'cedula': creador.usua_cedula  if creador else '',
            } if creador else None,
            'usuario_actual': {
                'nombre': actual.usua_nombre if actual else '',
                'area':   actual.depe_nomb   if actual else '',
            } if actual else None,
            'recorrido': eventos,
        })


class QuipuxPDFView(APIView):
    """
    Recupera el PDF de un documento desde la base documental.
    Busca arch_codi en todos los hermanos (mismo radi_nume_text) por si
    el registro representativo tiene arch_codi=0 pero otro hermano lo tiene.
    """
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
            return Response({'detail': 'Base de datos Quipux no disponible.'}, status=503)

        # Buscar el mejor arch_codi entre todos los hermanos
        field = 'arch_codi_firma' if firmado else 'arch_codi'
        try:
            arch_id = (
                QuipuxRadicado.objects.using('quipux_transaccional')
                .filter(radi_nume_text=doc.radi_nume_text)
                .values_list(field, flat=True)
                .order_by(f'-{field}')
                .first()
            ) or 0
        except Exception:
            arch_id = (doc.arch_codi_firma if firmado else doc.arch_codi) or 0

        if not arch_id or arch_id == 0:
            tipo = 'firmado' if firmado else ''
            return Response(
                {'detail': f'Este documento no tiene PDF {tipo} asociado.'.strip()},
                status=404,
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
                filename  = doc.radi_nume_text or str(doc.radi_nume_radi)
                if firmado:
                    filename += '_firmado'
                filename += '.pdf'

                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
        except Exception as e:
            return Response({'detail': f'Error al recuperar el archivo: {e}'}, status=500)


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

                cursor.execute("SELECT COUNT(DISTINCT radi_nume_text) FROM radicado")
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
                'total_documentos':      total,
                'total_usuarios':        total_usuarios,
                'fecha_primer_documento': fechas[0],
                'fecha_ultimo_documento': fechas[1],
                'por_estado': {
                    ESTADO_MAP.get(k, f'Estado {k}'): v for k, v in estados.items()
                },
            })
        except Exception as e:
            return Response({'detail': f'Base Quipux no disponible: {e}'}, status=503)


class QuipuxAnexosView(APIView):
    """
    Lista los anexos de un radicado.
    Busca en TODOS los hermanos (mismo radi_nume_text) para no perder
    adjuntos que se vincularon a una fila diferente del mismo documento.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, radi_id):
        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
            sibling_ids = QuipuxRadicado.objects.using('quipux_transaccional').filter(
                radi_nume_text=doc.radi_nume_text
            ).values_list('radi_nume_radi', flat=True)

            anexos = QuipuxAnexo.objects.using('quipux_transaccional').filter(
                anex_radi_nume__in=sibling_ids,
                anex_borrado='N',
            ).order_by('anex_numero')
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception as e:
            return Response({'detail': f'Base de datos Quipux no disponible: {e}'}, status=503)

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
                    return Response(
                        {'detail': 'Archivo no encontrado en la base documental.'},
                        status=404,
                    )

                file_bytes = base64.b64decode(row[0])
                nombre = anexo.anex_nombre or f'anexo_{anex_codigo}'
                ext    = TIPO_EXT.get(anexo.anex_tipo, 'bin')
                if not nombre.lower().endswith(f'.{ext}'):
                    nombre = f'{nombre}.{ext}'
                mime = TIPO_MIME.get(anexo.anex_tipo, 'application/octet-stream')

                response = HttpResponse(file_bytes, content_type=mime)
                response['Content-Disposition'] = f'attachment; filename="{nombre}"'
                return response
        except Exception as e:
            return Response({'detail': f'Error al recuperar archivo: {e}'}, status=500)


class QuipuxMisBandejasView(APIView):
    """Conteo de documentos unicos del usuario actual por bandeja."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cedula = _cedula_usuario(request.user)
        if not cedula:
            return Response({'recibidos': 0, 'enviados': 0, 'copia': 0, 'total': 0})

        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                # Contar documentos unicos (por radi_nume_text) por tipo de bandeja
                cursor.execute("""
                    SELECT ur.radi_usua_tipo, COUNT(DISTINCT r.radi_nume_text)
                    FROM usuarios_radicado ur
                    JOIN radicado r ON r.radi_nume_radi = ur.radi_nume_radi
                    WHERE ur.usua_cedula = %s
                    GROUP BY ur.radi_usua_tipo
                """, [cedula])
                rows = {row[0]: row[1] for row in cursor.fetchall()}

            return Response({
                'recibidos': rows.get(TIPO_RECIBIDO, 0),
                'enviados':  rows.get(TIPO_ENVIADO,  0),
                'copia':     rows.get(TIPO_COPIA,    0),
                'total':     sum(rows.values()),
            })
        except Exception as e:
            return Response({'detail': str(e)}, status=503)
