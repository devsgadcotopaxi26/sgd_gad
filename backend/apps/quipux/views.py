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

# Mapa de etiquetas más descriptivas para las transacciones Quipux.
# Las claves son el sgd_ttr_descrip en minúsculas tal como viene de la BD.
_QUIPUX_TRANS_LABELS: dict[str, str] = {
    'registro':          'Registro e ingreso al sistema',
    'recibido':          'Recibido',
    'despacho':          'Enviado (despacho)',
    'reasignado':        'Reasignado',
    'archivado':         'Archivado',
    'respondido':        'Respondido',
    'en elaboracion':    'En elaboración',
    'en elaboración':    'En elaboración',
    'no enviado':        'Borrador / No enviado',
    'elaborado':         'En elaboración',
    'firmado':           'Firmado',
    'anulado':           'Anulado',
    'comentado':         'Comentario registrado',
}


def _etiqueta_quipux(ttr_descrip, hist_obse: str) -> str:
    """Convierte la etiqueta cruda de sgd_ttr_transaccion en una más descriptiva."""
    raw = (ttr_descrip or '').strip()
    if not raw:
        obs = (hist_obse or '').strip()
        return obs[:80] if obs else 'Evento registrado'
    mapped = _QUIPUX_TRANS_LABELS.get(raw.lower())
    return mapped if mapped else raw

# Nombre de columna en 'anexos' que enlaza a 'radicado.radi_nome_radi'.
# Construido con chr(117)='u' para evitar confusion visual u/o/i en editores.
_COL_ANEX_RADI = 'anex_radi_n' + chr(117) + 'me'

# (tipo en usuarios_radicado, estados en radicado)
# tipo=None → sin filtro de radi_usua_tipo (cualquier tipo en la bandeja del usuario)
BANDEJA_MAP = {
    'recibidos':      (TIPO_RECIBIDO, [2, 3, 4, 5, 6, 9]),
    'enviados':       (TIPO_ENVIADO,  [2, 6]),
    'en_elaboracion': (TIPO_ENVIADO,  [1]),
    'no_enviados':    (TIPO_ENVIADO,  [3, 4, 5]),
    'archivados':     (None,          [0]),
    'copia':          (TIPO_COPIA,    [2, 6]),
}


def _cedula_usuario(user):
    return getattr(user, 'cedula', '') or ''


def _es_admin(user):
    # Igual que documentos._es_admin_bandeja: consulta de bandeja histórica
    # ajena por responsabilidad documental, no administración general.
    return user.is_superuser or user.roles.filter(
        rol__codigo__in=['ADMIN_GENERAL', 'RESPONSABLE_ARCHIVO'], activo=True
    ).exists()


def _get_tareas_quipux(cedula, bandeja, page, page_size, es_admin):
    """
    Consulta la tabla `tarea` de Quipux para tareas_recibidas / tareas_enviadas.
    La tabla usa usua_codi (entero), no cédula — resuelve con JOIN a usuario.
    """
    def _fmt_dt(v):
        return v.isoformat() if v else None

    try:
        with connections['quipux_transaccional'].cursor() as cursor:
            cursor.execute(
                "SELECT usua_codi FROM usuario WHERE usua_cedula = %s LIMIT 1",
                [cedula],
            )
            row = cursor.fetchone()
            if not row:
                return Response({
                    'count': 0, 'page': page, 'page_size': page_size,
                    'results': [], 'es_admin': es_admin,
                })
            usua_codi = row[0]

            if bandeja == 'tareas_recibidas':
                cond_col   = "t.usua_codi_dest"
                estado_sql = "AND t.estado = 1"
            else:
                cond_col   = "t.usua_codi_ori"
                estado_sql = ""

            cursor.execute(
                f"SELECT COUNT(*) FROM tarea t WHERE {cond_col} = %s {estado_sql}",
                [usua_codi],
            )
            total = cursor.fetchone()[0]

            offset = (page - 1) * page_size
            cursor.execute(f"""
                SELECT t.tarea_codi,
                       t.radi_nume_radi,
                       t.fecha_inicio,
                       t.fecha_maxima,
                       t.estado         AS tarea_estado,
                       t.avance,
                       t.leido          AS tarea_leido,
                       t.usua_codi_ori,
                       r.radi_asunto,
                       r.radi_nume_text,
                       r.esta_codi,
                       r.radi_fech_radi,
                       COALESCE(r.arch_codi, 0)      AS arch_codi,
                       COALESCE(r.arch_codi_firma, 0) AS arch_codi_firma,
                       r.radi_cuentai,
                       r.radi_usua_radi
                FROM tarea t
                JOIN radicado r ON r.radi_nume_radi = t.radi_nume_radi
                WHERE {cond_col} = %s {estado_sql}
                ORDER BY t.fecha_maxima ASC NULLS LAST, t.fecha_inicio DESC
                LIMIT %s OFFSET %s
            """, [usua_codi, page_size, offset])

            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]

    except Exception as e:
        return Response(
            {'detail': f'Base de datos Quipux no disponible: {e}'},
            status=503,
        )

    user_ids = {r['radi_usua_radi'] for r in rows if r.get('radi_usua_radi')}
    user_ids.update({r['usua_codi_ori'] for r in rows if r.get('usua_codi_ori')})
    users = {}
    if user_ids:
        try:
            for u in QuipuxUsuario.objects.using('quipux_transaccional').filter(usua_codi__in=user_ids):
                users[u.usua_codi] = u
        except Exception:
            pass

    results = []
    for r in rows:
        u = users.get(r['radi_usua_radi'])
        results.append({
            'radi_nume_radi':       str(r['radi_nume_radi']),
            'radi_nume_text':       r['radi_nume_text'] or '',
            'radi_fech_radi':       _fmt_dt(r['radi_fech_radi']),
            'radi_asunto':          r['radi_asunto'] or '',
            'radi_tipo':            0,
            'esta_codi':            r['esta_codi'],
            'estado_nombre':        ESTADO_MAP.get(r['esta_codi'], f'Estado {r["esta_codi"]}'),
            'radi_permiso':         0,
            'radi_fech_firma':      None,
            'radi_nomb_usua_firma': '',
            'radi_cuentai':         r['radi_cuentai'] or '',
            'tiene_pdf':            (r['arch_codi'] or 0) > 0,
            'tiene_pdf_firmado':    (r['arch_codi_firma'] or 0) > 0,
            'tiene_anexos':         False,
            'num_anexos':           0,
            'creador_nombre':       u.usua_nombre if u else '',
            'area_nombre':          u.depe_nomb   if u else '',
            'es_tarea':             True,
            'tarea_codi':           r['tarea_codi'],
            'tarea_estado':         r['tarea_estado'],
            'tarea_avance':         r['avance'],
            'fecha_maxima':         _fmt_dt(r['fecha_maxima']),
        })

    return Response({
        'count':     total,
        'page':      page,
        'page_size': page_size,
        'results':   results,
        'es_admin':  es_admin,
    })


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

        # Admin puede ver la bandeja de otro usuario pasando ?cedula_usuario=xxx
        cedula_usuario_param = request.query_params.get('cedula_usuario', '').strip()
        if es_admin and cedula_usuario_param:
            cedula = cedula_usuario_param

        # ── Tareas: tabla distinta, ruta especial ──
        if bandeja in ('tareas_recibidas', 'tareas_enviadas'):
            if not cedula:
                return Response({
                    'count': 0, 'page': page, 'page_size': page_size,
                    'results': [], 'es_admin': es_admin,
                })
            return _get_tareas_quipux(cedula, bandeja, page, page_size, es_admin)

        # ── Construir WHERE dinámico con parámetros seguros ──
        where_parts = []
        params: list = []

        if cedula:
            bandeja_info   = BANDEJA_MAP.get(bandeja)
            tipo_filtro    = bandeja_info[0] if bandeja_info else None
            estados_filtro = bandeja_info[1] if bandeja_info else None

            # Condiciones Quipux nativas (sí aplican filtro de esta_codi)
            native_subs:   list = []
            native_params: list = []

            if tipo_filtro is not None:
                native_subs.append(
                    "r.radi_nume_radi IN "
                    "(SELECT radi_nume_radi FROM usuarios_radicado "
                    " WHERE usua_cedula = %s AND radi_usua_tipo = %s)"
                )
                native_params.extend([cedula, tipo_filtro])
            else:
                # archivados: cualquier tipo del usuario
                native_subs.append(
                    "r.radi_nume_radi IN "
                    "(SELECT radi_nume_radi FROM usuarios_radicado WHERE usua_cedula = %s)"
                )
                native_params.append(cedula)

            # Copia: también incluir tabla `informados`
            if bandeja == 'copia':
                native_subs.append(
                    "r.radi_nume_radi IN ("
                    "  SELECT i.radi_nume_radi FROM informados i"
                    "  JOIN usuarios u ON u.usua_codi = i.usua_codi"
                    "  WHERE u.usua_cedula = %s"
                    ")"
                )
                native_params.append(cedula)

            # Construir condición nativa con filtro de estado incorporado
            if estados_filtro:
                ph_e = ','.join(['%s'] * len(estados_filtro))
                native_condition = (
                    f"(({' OR '.join(native_subs)}) AND r.esta_codi IN ({ph_e}))"
                )
                native_all_params = native_params + list(estados_filtro)
            else:
                native_condition = f"({' OR '.join(native_subs)})"
                native_all_params = native_params

            # Documentos reasignados via SGD — NO aplican filtro de esta_codi
            # (el estado Quipux no debe ocultar un documento reasignado activamente)
            sgd_condition: str | None = None
            sgd_params:    list       = []
            try:
                from apps.documentos.models import QuipuxBandejaSGD
                sgd_f = {'cedula_usuario': cedula}
                if tipo_filtro:
                    sgd_f['tipo'] = tipo_filtro
                sgd_extras = list(
                    QuipuxBandejaSGD.objects.filter(**sgd_f)
                    .values_list('radi_nume_text', flat=True)
                    .distinct()
                )
                if sgd_extras:
                    ph = ','.join(['%s'] * len(sgd_extras))
                    sgd_condition = f"r.radi_nume_text IN ({ph})"
                    sgd_params    = sgd_extras
            except Exception:
                pass

            # Combinar: (nativa_con_estado) OR (sgd_sin_estado)
            if sgd_condition:
                where_parts.append(f"({native_condition} OR {sgd_condition})")
                params.extend(native_all_params + sgd_params)
            else:
                where_parts.append(native_condition)
                params.extend(native_all_params)
        else:
            # Sin cédula: no mostrar ningún documento
            where_parts.append("1=0")

        # Parámetros de búsqueda avanzada (AND independientes)
        numero = request.query_params.get('numero', '').strip()
        asunto = request.query_params.get('asunto', '').strip()

        if search:
            where_parts.append(
                "(r.radi_asunto ILIKE %s OR r.radi_nume_text ILIKE %s OR r.radi_cuentai ILIKE %s)"
            )
            like = f'%{search}%'
            params.extend([like, like, like])
        if numero:
            where_parts.append("r.radi_nume_text ILIKE %s")
            params.append(f'%{numero}%')
        if asunto:
            where_parts.append("r.radi_asunto ILIKE %s")
            params.append(f'%{asunto}%')
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
                    sibling_anexos AS (
                        -- Cuenta anexos de TODOS los hermanos (mismo radi_nume_text),
                        -- no solo de las filas filtradas en base.
                        SELECT r2.radi_nume_text, COUNT(DISTINCT ax.anex_codigo) AS num_ax
                        FROM base b
                        JOIN radicado r2 ON r2.radi_nume_text = b.radi_nume_text
                        JOIN anexos ax
                               ON ax.anex_radi_nume = r2.radi_nume_radi
                              AND ax.anex_borrado = 'N'
                        GROUP BY r2.radi_nume_text
                    ),
                    agg AS (
                        SELECT
                            b.radi_nume_text,
                            MAX(b.radi_nume_radi)          AS repr_id,
                            MAX(b.arch_codi)               AS best_arch_codi,
                            MAX(b.arch_codi_firma)         AS best_arch_codi_firma,
                            COALESCE(sa.num_ax, 0)         AS num_anexos
                        FROM base b
                        LEFT JOIN sibling_anexos sa ON sa.radi_nume_text = b.radi_nume_text
                        GROUP BY b.radi_nume_text, sa.num_ax
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
                        a.num_anexos > 0 AS tiene_anexos,
                        a.num_anexos
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
                'num_anexos':          int(r.get('num_anexos') or 0),
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
                h._transaccion     = _etiqueta_quipux(
                    trans.get(h.sgd_ttr_codigo), h.hist_obse or ''
                )

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

        # Acciones SGD (comentarios y reasignaciones registradas en SGD)
        acciones_sgd: list = []
        try:
            from apps.documentos.models import QuipuxBandejaSGD
            for a in QuipuxBandejaSGD.objects.filter(
                radi_nume_text=doc.radi_nume_text
            ).select_related('creado_por').order_by('creado_en'):
                acciones_sgd.append({
                    'id':          a.id,
                    'accion':      a.accion,
                    'observacion': a.observacion,
                    'usuario':     a.creado_por.nombre_completo,
                    'creado_en':   a.creado_en.isoformat(),
                })
        except Exception:
            pass

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
            'recorrido':    list(eventos),
            'acciones_sgd': acciones_sgd,
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

        # Recuperación centralizada (misma lógica que reutiliza
        # DocumentoPDFView en FASE 0B.1).
        from .pdf_original import recuperar_pdf_original, QuipuxNoDisponible
        try:
            pdf_bytes = recuperar_pdf_original(arch_id)
        except QuipuxNoDisponible as e:
            return Response({'detail': f'Base documental Quipux no disponible: {e}'}, status=503)
        except Exception as e:
            return Response({'detail': f'Error al recuperar el archivo: {e}'}, status=500)

        if not pdf_bytes:
            return Response(
                {'detail': 'Archivo no encontrado en la base documental.'},
                status=404,
            )

        filename = doc.radi_nume_text or str(doc.radi_nume_radi)
        if firmado:
            filename += '_firmado'
        filename += '.pdf'

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


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
        cedula_param = request.query_params.get('cedula_usuario', '').strip()
        if _es_admin(request.user) and cedula_param:
            cedula = cedula_param
        if not cedula:
            return Response({
                'recibidos': 0, 'enviados': 0, 'en_elaboracion': 0,
                'no_enviados': 0, 'archivados': 0, 'copia': 0,
                'tareas_recibidas': 0, 'total': 0,
            })

        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                # Una sola query con CASE WHEN para contar por bandeja con filtro de estado
                cursor.execute("""
                    SELECT
                        COUNT(DISTINCT CASE WHEN ur.radi_usua_tipo=2 AND r.esta_codi IN (2,3,4,5,6,9) THEN r.radi_nume_text END) AS recibidos,
                        COUNT(DISTINCT CASE WHEN ur.radi_usua_tipo=1 AND r.esta_codi IN (2,6)          THEN r.radi_nume_text END) AS enviados,
                        COUNT(DISTINCT CASE WHEN ur.radi_usua_tipo=1 AND r.esta_codi=1                  THEN r.radi_nume_text END) AS en_elaboracion,
                        COUNT(DISTINCT CASE WHEN ur.radi_usua_tipo=1 AND r.esta_codi IN (3,4,5)         THEN r.radi_nume_text END) AS no_enviados,
                        COUNT(DISTINCT CASE WHEN r.esta_codi=0                                           THEN r.radi_nume_text END) AS archivados,
                        COUNT(DISTINCT CASE WHEN ur.radi_usua_tipo=3 AND r.esta_codi IN (2,6)           THEN r.radi_nume_text END) AS copia
                    FROM usuarios_radicado ur
                    JOIN radicado r ON r.radi_nume_radi = ur.radi_nume_radi
                    WHERE ur.usua_cedula = %s
                """, [cedula])
                fila = cursor.fetchone()
                counts = {
                    'recibidos':      int(fila[0] or 0),
                    'enviados':       int(fila[1] or 0),
                    'en_elaboracion': int(fila[2] or 0),
                    'no_enviados':    int(fila[3] or 0),
                    'archivados':     int(fila[4] or 0),
                    'copia':          int(fila[5] or 0),
                }

                # Copia: también contar tabla informados (separada de usuarios_radicado tipo=3)
                cursor.execute("""
                    SELECT COUNT(DISTINCT r.radi_nume_text)
                    FROM informados i
                    JOIN usuarios u ON u.usua_codi = i.usua_codi
                    JOIN radicado r ON r.radi_nume_radi = i.radi_nume_radi
                    WHERE u.usua_cedula = %s AND r.esta_codi IN (2,6)
                """, [cedula])
                counts['copia'] += int(cursor.fetchone()[0] or 0)

                # Informados no leídos (info_leido=0) — per-user unread tracking nativo de Quipux
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM informados i
                    JOIN usuarios u ON u.usua_codi = i.usua_codi
                    WHERE u.usua_cedula = %s AND i.info_leido = 0
                """, [cedula])
                counts['copia_no_leidos'] = int(cursor.fetchone()[0] or 0)

                # Tareas pendientes recibidas
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM tarea t
                    JOIN usuario u ON u.usua_codi = t.usua_codi_dest
                    WHERE u.usua_cedula = %s AND t.estado = 1
                """, [cedula])
                counts['tareas_recibidas'] = int(cursor.fetchone()[0] or 0)

            # SGD reasignados (suman a recibidos/enviados/copia)
            reasig_no_leidas = 0
            try:
                from apps.documentos.models import QuipuxBandejaSGD
                for tipo_val, key in [(TIPO_RECIBIDO, 'recibidos'), (TIPO_ENVIADO, 'enviados'), (TIPO_COPIA, 'copia')]:
                    extra = (
                        QuipuxBandejaSGD.objects
                        .filter(cedula_usuario=cedula, tipo=tipo_val)
                        .values('radi_nume_text').distinct().count()
                    )
                    counts[key] += extra
                # Reasignaciones pendientes de leer (no leídas)
                reasig_no_leidas = QuipuxBandejaSGD.objects.filter(
                    cedula_usuario=cedula, accion='reasignacion', leido=False
                ).count()
            except Exception:
                pass

            counts['reasig_no_leidas'] = reasig_no_leidas
            counts['total'] = sum(v for k, v in counts.items() if k not in ('copia_no_leidos', 'reasig_no_leidas'))
            return Response(counts)
        except Exception as e:
            return Response({'detail': str(e)}, status=503)


class QuipuxMarcarLeidoView(APIView):
    """
    Marca una reasignación Quipux como leída.
    Cuando el usuario abre un doc Quipux reasignado, se llama a este endpoint
    para limpiar el badge de 'no leído' en su bandeja.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, radi_id):
        cedula = _cedula_usuario(request.user)
        if not cedula:
            return Response({'detail': 'Usuario sin cédula registrada.'}, status=400)

        # Buscar radi_nume_text desde el radicado (para hacer match en QuipuxBandejaSGD)
        radi_nume_text = None
        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
            radi_nume_text = doc.radi_nume_text
        except Exception:
            radi_nume_text = str(radi_id)

        from django.utils import timezone
        from apps.documentos.models import QuipuxBandejaSGD
        updated = QuipuxBandejaSGD.objects.filter(
            radi_nume_text=radi_nume_text,
            cedula_usuario=cedula,
            accion='reasignacion',
            leido=False,
        ).update(leido=True, leido_en=timezone.now())

        return Response({'detail': 'Marcado como leído.', 'updated': updated})


class QuipuxActualizarTareaView(APIView):
    """
    Actualiza el avance de una tarea Quipux.
    La tabla `tarea` de Quipux es read-only; el avance se guarda en SGD.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tarea_codi):
        avance = request.data.get('avance')
        observacion = request.data.get('observacion', '').strip()

        if avance is None or not (0 <= int(avance) <= 100):
            return Response({'detail': 'avance debe ser un número entre 0 y 100.'}, status=400)

        from apps.documentos.models import QuipuxTareaAvance
        reg = QuipuxTareaAvance.objects.create(
            tarea_codi=int(tarea_codi),
            avance=int(avance),
            observacion=observacion,
            creado_por=request.user,
        )
        return Response({
            'detail': f'Avance actualizado a {avance}%.',
            'id': reg.pk,
            'avance': reg.avance,
            'creado_en': reg.creado_en.isoformat(),
        }, status=201)

    def get(self, request, tarea_codi):
        """Historial de actualizaciones de avance para una tarea."""
        from apps.documentos.models import QuipuxTareaAvance
        qs = QuipuxTareaAvance.objects.filter(
            tarea_codi=int(tarea_codi)
        ).select_related('creado_por').order_by('-creado_en')
        return Response([{
            'id':          r.pk,
            'avance':      r.avance,
            'observacion': r.observacion,
            'usuario':     r.creado_por.nombre_completo,
            'creado_en':   r.creado_en.isoformat(),
        } for r in qs])


class QuipuxResponderView(APIView):
    """
    Crea un documento SGD como respuesta a un radicado Quipux.
    El nuevo documento queda en 'en_elaboracion' vinculado al original Quipux.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, radi_id):
        asunto     = request.data.get('asunto', '').strip()
        tipo_id    = request.data.get('tipo_documento_id')
        cuerpo     = request.data.get('cuerpo', '').strip()

        if not asunto or not tipo_id:
            return Response({'detail': 'asunto y tipo_documento_id son requeridos.'}, status=400)

        # Obtener el radi_nume_text del original
        radi_nume_text = str(radi_id)
        try:
            doc_orig = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
            radi_nume_text = doc_orig.radi_nume_text or str(radi_id)
        except Exception:
            pass

        from apps.documentos.models import Documento, TipoDocumento
        from apps.documentos.numeracion import numero_provisional
        from django.utils import timezone

        try:
            tipo = TipoDocumento.objects.get(pk=tipo_id)
        except TipoDocumento.DoesNotExist:
            return Response({'detail': 'Tipo de documento no encontrado.'}, status=404)

        # Numeración configurable (misma vía que DocumentoCrearSerializer):
        # el borrador nace con número PROVISIONAL "…-TEMP"; el definitivo se
        # asigna al oficializar (firma/envío).
        doc = Documento(
            tipo_documento=tipo,
            anio=timezone.now().year,
            asunto=asunto,
            cuerpo=cuerpo or f'<p>En respuesta al documento {radi_nume_text}.</p>',
            estado='borrador',
            creado_por=request.user,
            unidad_origen=request.user.unidad,
            quipux_origen=radi_nume_text,
            fecha_elaboracion=timezone.now().date(),
        )
        numero_provisional(doc)
        doc.save()

        return Response({
            'detail': 'Documento de respuesta creado en elaboración.',
            'documento_id': doc.pk,
            'numero': doc.numero_documento,
            'quipux_origen': radi_nume_text,
        }, status=201)


class QuipuxBuscarContenidoView(APIView):
    """
    Búsqueda full-text en el contenido de PDFs Quipux indexados.
    Devuelve los radi_nume_text que contienen el término buscado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 3:
            return Response({'detail': 'Mínimo 3 caracteres.'}, status=400)

        from apps.documentos.models import QuipuxContenidoPDF
        from django.contrib.postgres.search import SearchQuery, SearchVector

        resultados = (
            QuipuxContenidoPDF.objects
            .filter(tiene_contenido=True)
            .annotate(search=SearchVector('contenido_texto', config='spanish'))
            .filter(search=SearchQuery(q, config='spanish'))
            .values_list('radi_nume_text', flat=True)[:200]
        )
        return Response({'resultados': list(resultados), 'total': len(resultados)})


class QuipuxEstadoIndexacionView(APIView):
    """Estado del índice de contenido PDF Quipux."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.documentos.models import QuipuxContenidoPDF

        total_indexados = QuipuxContenidoPDF.objects.count()
        con_texto       = QuipuxContenidoPDF.objects.filter(tiene_contenido=True).count()
        escaneados      = QuipuxContenidoPDF.objects.filter(es_escaneado=True).count()
        con_error       = QuipuxContenidoPDF.objects.exclude(error_extraccion='').count()

        total_quipux = 0
        try:
            with connections['quipux_transaccional'].cursor() as cur:
                cur.execute("SELECT COUNT(DISTINCT radi_nume_text) FROM radicado WHERE arch_codi > 0")
                total_quipux = cur.fetchone()[0]
        except Exception:
            pass

        return Response({
            'total_quipux_con_pdf': total_quipux,
            'total_indexados':      total_indexados,
            'con_texto':            con_texto,
            'escaneados':           escaneados,
            'con_error':            con_error,
            'pendientes':           max(0, total_quipux - total_indexados),
            'porcentaje':           round(total_indexados / max(total_quipux, 1) * 100, 1),
        })


class QuipuxReasignarView(APIView):
    """
    Reasigna un documento Quipux a otro usuario SGD.
    El historial se almacena en SGD (la DB Quipux es solo lectura).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, radi_id):
        usuario_id    = request.data.get('usuario_id')
        instrucciones = request.data.get('instrucciones', '').strip()

        if not usuario_id:
            return Response({'detail': 'usuario_id es requerido.'}, status=400)

        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception:
            return Response({'detail': 'Base Quipux no disponible.'}, status=503)

        from apps.usuarios.models import Usuario
        try:
            target = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        cedula_destino = getattr(target, 'cedula', '') or ''
        if not cedula_destino:
            return Response({'detail': 'El usuario destino no tiene cédula registrada.'}, status=400)

        from apps.documentos.models import QuipuxBandejaSGD
        QuipuxBandejaSGD.objects.create(
            radi_nume_text=doc.radi_nume_text or str(doc.radi_nume_radi),
            radi_asunto=doc.radi_asunto or '',
            cedula_usuario=cedula_destino,
            tipo=TIPO_RECIBIDO,
            accion='reasignacion',
            observacion=instrucciones,
            creado_por=request.user,
        )

        return Response({'detail': f'Documento reasignado a {target.nombre_completo}.'})


class QuipuxComentarView(APIView):
    """Guarda un comentario sobre un documento Quipux. Se almacena en SGD."""
    permission_classes = [IsAuthenticated]

    def post(self, request, radi_id):
        observacion = request.data.get('observacion', '').strip()
        if not observacion:
            return Response({'detail': 'La observación es requerida.'}, status=400)

        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception:
            return Response({'detail': 'Base Quipux no disponible.'}, status=503)

        cedula = _cedula_usuario(request.user)
        from apps.documentos.models import QuipuxBandejaSGD
        QuipuxBandejaSGD.objects.create(
            radi_nume_text=doc.radi_nume_text or str(doc.radi_nume_radi),
            radi_asunto=doc.radi_asunto or '',
            cedula_usuario=cedula,
            tipo=TIPO_RECIBIDO,
            accion='comentario',
            observacion=observacion,
            creado_por=request.user,
        )

        return Response({'detail': 'Comentario guardado.'}, status=201)


class QuipuxEnviarView(APIView):
    """
    Envía un documento Quipux que está en estado 'no enviado' o 'en elaboración'.
    Cambia esta_codi → 6 (Enviado) y registra el evento en hist_eventos.
    """
    permission_classes = [IsAuthenticated]

    ESTADOS_ENVIABLES = [1, 3, 4, 5]  # en_elaboracion, no_enviado y variantes

    def post(self, request, radi_id):
        cedula = _cedula_usuario(request.user)
        try:
            with connections['quipux_transaccional'].cursor() as cur:
                # Verificar que el documento existe y está en estado enviable
                cur.execute(
                    "SELECT esta_codi, radi_usua_radi FROM radicado WHERE radi_nume_radi = %s LIMIT 1",
                    [radi_id],
                )
                row = cur.fetchone()
                if not row:
                    return Response({'detail': 'Documento no encontrado.'}, status=404)
                esta_codi, radi_usua_radi = row
                if esta_codi not in self.ESTADOS_ENVIABLES:
                    return Response({'detail': f'El documento no puede enviarse desde el estado actual ({esta_codi}).'}, status=400)

                # Obtener usua_codi del usuario actual en Quipux
                cur.execute("SELECT usua_codi FROM usuario WHERE usua_cedula = %s LIMIT 1", [cedula])
                u = cur.fetchone()
                usua_codi = u[0] if u else (radi_usua_radi or 0)

                # Cambiar estado a 6 (Enviado)
                cur.execute(
                    "UPDATE radicado SET esta_codi = 6 WHERE radi_nume_radi = %s",
                    [radi_id],
                )

                # Registrar evento en hist_eventos
                cur.execute("SELECT COALESCE(MAX(hist_codi), 0) + 1 FROM hist_eventos")
                next_id = cur.fetchone()[0]
                cur.execute(
                    """INSERT INTO hist_eventos
                       (hist_codi, hist_fech, usua_codi_ori, radi_nume_radi, hist_obse, usua_codi_dest, sgd_ttr_codigo)
                       VALUES (%s, NOW(), %s, %s, %s, NULL, NULL)""",
                    [next_id, usua_codi, radi_id, 'Enviado desde SGD'],
                )
        except Exception as exc:
            return Response({'detail': f'Error al enviar: {exc}'}, status=503)

        return Response({'detail': 'Documento enviado correctamente.'})


class QuipuxArchivarView(APIView):
    """
    Archiva un documento Quipux: cambia esta_codi → 0 (Archivado).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, radi_id):
        cedula = _cedula_usuario(request.user)
        try:
            with connections['quipux_transaccional'].cursor() as cur:
                cur.execute(
                    "SELECT esta_codi FROM radicado WHERE radi_nume_radi = %s LIMIT 1",
                    [radi_id],
                )
                row = cur.fetchone()
                if not row:
                    return Response({'detail': 'Documento no encontrado.'}, status=404)

                cur.execute(
                    "SELECT usua_codi FROM usuario WHERE usua_cedula = %s LIMIT 1", [cedula]
                )
                u = cur.fetchone()
                usua_codi = u[0] if u else 0

                cur.execute(
                    "UPDATE radicado SET esta_codi = 0 WHERE radi_nume_radi = %s",
                    [radi_id],
                )
                cur.execute("SELECT COALESCE(MAX(hist_codi), 0) + 1 FROM hist_eventos")
                next_id = cur.fetchone()[0]
                cur.execute(
                    """INSERT INTO hist_eventos
                       (hist_codi, hist_fech, usua_codi_ori, radi_nume_radi, hist_obse, usua_codi_dest, sgd_ttr_codigo)
                       VALUES (%s, NOW(), %s, %s, %s, NULL, NULL)""",
                    [next_id, usua_codi, radi_id, 'Archivado desde SGD'],
                )
        except Exception as exc:
            return Response({'detail': f'Error al archivar: {exc}'}, status=503)

        return Response({'detail': 'Documento archivado correctamente.'})


class QuipuxUsuariosView(APIView):
    """Lista usuarios de Quipux para selección (buscar por nombre o cédula)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _es_admin(request.user):
            return Response({'detail': 'No autorizado.'}, status=403)
        search = request.query_params.get('search', '').strip()
        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                params: list = []
                where = "WHERE usua_esta = 1"
                if search:
                    where += " AND (usua_nombre ILIKE %s OR usua_cedula ILIKE %s)"
                    params.extend([f'%{search}%', f'%{search}%'])
                cursor.execute(f"""
                    SELECT usua_codi, usua_cedula, usua_nombre, usua_cargo, depe_nomb, dep_sigla
                    FROM usuario
                    {where}
                    ORDER BY usua_nombre
                    LIMIT 100
                """, params)
                cols = [c[0] for c in cursor.description]
                rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
            return Response(rows)
        except Exception as e:
            return Response({'detail': f'Base Quipux no disponible: {e}'}, status=503)


class QuipuxRespaldoView(APIView):
    """Exporta la bandeja completa de un usuario Quipux a Excel."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        es_admin = _es_admin(request.user)
        mi_cedula = _cedula_usuario(request.user)

        cedula_param = request.query_params.get('cedula', '').strip()
        # Usuarios normales solo pueden descargar su propio respaldo
        cedula = cedula_param if (es_admin and cedula_param) else mi_cedula
        if not cedula:
            return Response({'detail': 'Usuario sin cédula registrada.'}, status=400)

        bandeja = request.query_params.get('bandeja', '').strip()
        desde = request.query_params.get('desde', '').strip()
        hasta = request.query_params.get('hasta', '').strip()

        if not cedula:
            return Response({'detail': 'Se requiere el parámetro cedula.'}, status=400)

        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        except ImportError:
            return Response({'detail': 'openpyxl no instalado en el servidor.'}, status=500)

        usuario_nombre = cedula
        usuario_cargo = ''
        results = []

        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                cursor.execute(
                    "SELECT usua_nombre, usua_cargo FROM usuario WHERE usua_cedula = %s LIMIT 1",
                    [cedula],
                )
                row = cursor.fetchone()
                if row:
                    usuario_nombre, usuario_cargo = row[0] or cedula, row[1] or ''

                bandejas_a_exportar = (
                    [(bandeja, BANDEJA_MAP[bandeja])]
                    if bandeja and bandeja in BANDEJA_MAP
                    else list(BANDEJA_MAP.items())
                )

                ESTADO_ES = {
                    0: 'Eliminado', 1: 'En elaboración', 2: 'Enviado',
                    3: 'No enviado', 4: 'Devuelto', 5: 'Anulado', 6: 'Archivado', 9: 'En trámite',
                }

                for bname, (tipo_filtro, estados_filtro) in bandejas_a_exportar:
                    where_parts = []
                    params: list = []

                    if tipo_filtro is not None:
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

                    if estados_filtro:
                        ph = ','.join(['%s'] * len(estados_filtro))
                        where_parts.append(f"r.esta_codi IN ({ph})")
                        params.extend(estados_filtro)

                    if desde:
                        where_parts.append("r.radi_fech_radi >= %s")
                        params.append(desde)
                    if hasta:
                        where_parts.append("r.radi_fech_radi <= %s")
                        params.append(hasta)

                    where_sql = "WHERE " + " AND ".join(where_parts)

                    cursor.execute(f"""
                        SELECT DISTINCT ON (r.radi_nume_text)
                            r.radi_nume_text,
                            r.radi_fech_radi,
                            r.radi_asunto,
                            r.esta_codi,
                            r.radi_cuentai,
                            COALESCE(r.arch_codi, 0) AS tiene_pdf
                        FROM radicado r
                        {where_sql}
                        ORDER BY r.radi_nume_text, r.radi_fech_radi DESC
                        LIMIT 10000
                    """, params)

                    cols = [c[0] for c in cursor.description]
                    for row in cursor.fetchall():
                        d = dict(zip(cols, row))
                        d['bandeja'] = bname
                        d['estado_nombre'] = ESTADO_ES.get(d.get('esta_codi'), str(d.get('esta_codi', '')))
                        results.append(d)

        except Exception as e:
            return Response({'detail': f'Base Quipux no disponible: {e}'}, status=503)

        # Construir Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Bandeja'

        azul = PatternFill(start_color='002F6C', end_color='002F6C', fill_type='solid')
        font_hdr = Font(bold=True, color='FFFFFF', size=10)
        font_inf = Font(bold=True, color='002F6C', size=10)
        centro = Alignment(horizontal='center', vertical='center')
        borde = Border(
            bottom=Side(border_style='thin', color='DDDDDD'),
        )

        # Info cabecera
        ws.merge_cells('A1:F1')
        ws['A1'] = f'Respaldo de Bandeja Quipux — {usuario_nombre}'
        ws['A1'].font = Font(bold=True, size=12, color='002F6C')
        ws['A2'] = f'Cargo: {usuario_cargo}   |   Cédula: {cedula}   |   Generado: {timezone.now().strftime("%Y-%m-%d %H:%M")}'
        ws['A2'].font = Font(size=9, color='777777')
        ws.row_dimensions[1].height = 22
        ws.row_dimensions[2].height = 15

        # Encabezados columnas
        headers = ['Número de oficio', 'Fecha', 'Asunto', 'Estado', 'Destinatario/Remitente', 'Bandeja']
        for col, h in enumerate(headers, 1):
            c = ws.cell(row=4, column=col, value=h)
            c.font = font_hdr
            c.fill = azul
            c.alignment = centro

        ws.column_dimensions['A'].width = 24
        ws.column_dimensions['B'].width = 16
        ws.column_dimensions['C'].width = 65
        ws.column_dimensions['D'].width = 16
        ws.column_dimensions['E'].width = 30
        ws.column_dimensions['F'].width = 18
        ws.row_dimensions[4].height = 18

        BANDEJA_ES = {
            'recibidos': 'Recibidos', 'enviados': 'Enviados',
            'en_elaboracion': 'En elaboración', 'no_enviados': 'No enviados',
            'archivados': 'Archivados', 'copia': 'Copia',
        }
        zebra = PatternFill(start_color='F0F4FF', end_color='F0F4FF', fill_type='solid')

        for i, r in enumerate(results):
            row_num = i + 5
            fecha = r.get('radi_fech_radi')
            fecha_str = fecha.strftime('%Y-%m-%d') if fecha else ''
            values = [
                r.get('radi_nume_text', ''),
                fecha_str,
                r.get('radi_asunto', ''),
                r.get('estado_nombre', ''),
                r.get('radi_cuentai', ''),
                BANDEJA_ES.get(r.get('bandeja', ''), r.get('bandeja', '')),
            ]
            for col, val in enumerate(values, 1):
                c = ws.cell(row=row_num, column=col, value=val)
                c.border = borde
                if i % 2 == 1:
                    c.fill = zebra

        # Resumen por bandeja
        ws2 = wb.create_sheet('Resumen')
        ws2['A1'] = 'Resumen por bandeja'
        ws2['A1'].font = font_inf
        resumen: dict = {}
        for r in results:
            resumen[r['bandeja']] = resumen.get(r['bandeja'], 0) + 1
        ws2['A3'] = 'Bandeja'
        ws2['B3'] = 'Documentos'
        ws2['A3'].font = font_hdr
        ws2['A3'].fill = azul
        ws2['B3'].font = font_hdr
        ws2['B3'].fill = azul
        for i, (b, cnt) in enumerate(resumen.items(), 4):
            ws2.cell(row=i, column=1, value=BANDEJA_ES.get(b, b))
            ws2.cell(row=i, column=2, value=cnt)
        ws2.cell(row=len(resumen) + 5, column=1, value='TOTAL')
        ws2.cell(row=len(resumen) + 5, column=1).font = Font(bold=True)
        ws2.cell(row=len(resumen) + 5, column=2, value=len(results))
        ws2.column_dimensions['A'].width = 22
        ws2.column_dimensions['B'].width = 14

        import io
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        filename = f'quipux_{cedula}_{timezone.now().strftime("%Y%m%d")}.xlsx'
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class QuipuxRecorridoPDFView(APIView):
    """
    Genera un PDF institucional con el recorrido completo de un documento Quipux.
    Usa el mismo membrete (escudo, líneas, pie de página) que los documentos SGD.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, radi_id):
        from weasyprint import HTML as WeasyHTML
        from io import BytesIO
        from django.utils import timezone
        from apps.documentos.plantillas import ESCUDO_SRC, LOGO_PREF_SRC, _fecha_es

        # ── 1. Datos del radicado ────────────────────────────────────────────
        try:
            doc = QuipuxRadicado.objects.using('quipux_transaccional').get(
                radi_nume_radi=radi_id
            )
        except QuipuxRadicado.DoesNotExist:
            return Response({'detail': 'Documento no encontrado.'}, status=404)
        except Exception:
            return Response({'detail': 'Base de datos Quipux no disponible.'}, status=503)

        # ── 2. Recorrido (hist_eventos de todos los hermanos) ────────────────
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
                    evt_users[u.usua_codi] = u

            trans = {}
            try:
                for t in QuipuxTransaccion.objects.using('quipux_transaccional').all():
                    trans[t.sgd_ttr_codigo] = t.sgd_ttr_descrip
            except Exception:
                pass

            raw_eventos = []
            for h in hist_qs:
                origen  = evt_users.get(h.usua_codi_ori)
                destino = evt_users.get(h.usua_codi_dest) if h.usua_codi_dest else None
                obs     = (h.hist_obse or '').strip()
                raw_eventos.append({
                    'fecha':          h.hist_fech,
                    '_ttr_codigo':    h.sgd_ttr_codigo,
                    '_ttr_raw':       (trans.get(h.sgd_ttr_codigo) or '').strip().lower(),
                    '_origen_codi':   h.usua_codi_ori,
                    'evento':         _etiqueta_quipux(trans.get(h.sgd_ttr_codigo), obs),
                    'observacion':    obs,
                    'origen_nombre':  origen.usua_nombre  if origen  else '',
                    'origen_area':    origen.depe_nomb    if origen  else '',
                    'destino_nombre': destino.usua_nombre if destino else '',
                    'destino_area':   destino.depe_nomb   if destino else '',
                })

            # Agrupar eventos simultáneos con mismo origen y tipo de transacción
            # (ocurre en el envío inicial: un hist_evento por cada destinatario)
            grouped: list[dict] = []
            used = set()
            for i, ev in enumerate(raw_eventos):
                if i in used:
                    continue
                clave_agrup = (
                    ev['fecha'].strftime('%Y%m%d%H%M') if ev['fecha'] else '',
                    ev['_ttr_codigo'],
                    ev['_origen_codi'],
                )
                hermanos = [
                    j for j, e2 in enumerate(raw_eventos)
                    if j != i and j not in used
                    and (
                        e2['fecha'].strftime('%Y%m%d%H%M') if e2['fecha'] else '',
                        e2['_ttr_codigo'],
                        e2['_origen_codi'],
                    ) == clave_agrup
                ]
                if hermanos:
                    # Combinar todos los destinos en un solo evento
                    todos = [i] + hermanos
                    for idx in todos:
                        used.add(idx)
                    dests = [raw_eventos[j]['destino_nombre'] for j in todos if raw_eventos[j]['destino_nombre']]
                    areas = [raw_eventos[j]['destino_area']   for j in todos if raw_eventos[j]['destino_area']]
                    # Etiqueta mejorada según el tipo
                    raw_tipo = ev['_ttr_raw']
                    if 'registro' in raw_tipo or not raw_tipo:
                        etiq = f'Distribución inicial del documento ({len(dests)} destinatario(s))'
                    else:
                        etiq = ev['evento']
                    merged = dict(ev)
                    merged['evento']          = etiq
                    merged['destino_nombre']  = ' / '.join(dests)
                    merged['destino_area']    = ''
                    merged['observacion']     = f'Enviado a: {", ".join(dests)}' if dests else ev['observacion']
                    grouped.append(merged)
                else:
                    used.add(i)
                    grouped.append(ev)
            eventos = grouped

        except Exception:
            pass

        # ── 3. Creador del documento ─────────────────────────────────────────
        creador = None
        try:
            if doc.radi_usua_radi:
                creador = QuipuxUsuario.objects.using('quipux_transaccional').get(
                    usua_codi=doc.radi_usua_radi
                )
        except Exception:
            pass

        # ── 4. Construir filas de la tabla ───────────────────────────────────
        estado_nombre = ESTADO_MAP.get(doc.esta_codi, f'Estado {doc.esta_codi}')
        fecha_str     = _fecha_es(doc.radi_fech_radi) if doc.radi_fech_radi else '—'
        ahora         = timezone.now()
        generado_str  = _fecha_es(ahora) + f' a las {ahora.strftime("%H:%M")}'

        filas_html = ''
        for i, ev in enumerate(eventos):
            bg = '#f8faff' if i % 2 == 0 else '#ffffff'
            fecha_ev = ''
            if ev['fecha']:
                try:
                    fe = ev['fecha']
                    fecha_ev = f"{fe.strftime('%d/%m/%Y')}<br/>{fe.strftime('%H:%M')}"
                except Exception:
                    fecha_ev = str(ev['fecha'])
            dest_html = (
                f"<b>{ev['destino_nombre']}</b><br/>"
                f"<span style='color:#6b7280;font-size:8pt'>{ev['destino_area']}</span>"
                if ev['destino_nombre'] else '<span style="color:#bbb">—</span>'
            )
            filas_html += f"""
            <tr style="background:{bg}">
              <td style="padding:6px 8px;font-size:9pt;border-bottom:0.5px solid #eef0f5;
                         white-space:nowrap;vertical-align:top">{fecha_ev}</td>
              <td style="padding:6px 8px;font-size:9pt;font-weight:bold;color:#002f6c;
                         border-bottom:0.5px solid #eef0f5;vertical-align:top">{ev['evento']}</td>
              <td style="padding:6px 8px;font-size:9pt;border-bottom:0.5px solid #eef0f5;vertical-align:top">
                <b>{ev['origen_nombre']}</b><br/>
                <span style="color:#6b7280;font-size:8pt">{ev['origen_area']}</span>
              </td>
              <td style="padding:6px 8px;font-size:9pt;border-bottom:0.5px solid #eef0f5;vertical-align:top">
                {dest_html}
              </td>
              <td style="padding:6px 8px;font-size:9pt;color:#374151;font-style:italic;
                         border-bottom:0.5px solid #eef0f5;vertical-align:top">{ev['observacion']}</td>
            </tr>"""

        if not filas_html:
            filas_html = """<tr><td colspan="5" style="text-align:center;color:#9ca3af;
                padding:20px;font-size:9pt">Sin eventos registrados en el recorrido.</td></tr>"""

        # ── 5. HTML completo ─────────────────────────────────────────────────
        #
        # Usamos CSS Running Elements (WeasyPrint ≥43):
        #   position: running(cabecera) / running(pie)
        # WeasyPrint saca esos elementos del flujo normal y los coloca en las
        # áreas de margen @top-left / @bottom-left de CADA página, sin solaparse
        # con el contenido.  El margen superior (30mm) corresponde a la altura
        # real del encabezado; el inferior (20mm) al pie de página.
        #
        creador_area = (creador.depe_nomb or '') if creador else ''
        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @page {{
    size: A4;
    margin: 30mm 15mm 20mm 15mm;

    /* Encabezado repetido en cada página */
    @top-left {{
      content: element(cabecera);
      vertical-align: bottom;
    }}
    /* Pie repetido en cada página */
    @bottom-left {{
      content: element(pie);
      vertical-align: top;
    }}
    /* Número de página (derecha, comparte el espacio inferior) */
    @bottom-right {{
      content: "Pág. " counter(page) " / " counter(pages);
      font-family: Arial, sans-serif;
      font-size: 7pt;
      color: #888;
      vertical-align: top;
      padding-top: 6pt;
    }}
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 9.5pt; color: #111; line-height: 1.4; }}

  /* ── CABECERA (running element) ── */
  .cabecera {{
    position: running(cabecera);
    width: 180mm;          /* ancho del área de margen = 210-15-15 */
  }}
  .enc-row {{
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 8px 0 6px 0;
  }}
  .enc-izq {{ width: 64px; flex-shrink: 0; }}
  .enc-der {{ width: 150px; flex-shrink: 0; }}

  /* ── PIE (running element) ── */
  .pie {{
    position: running(pie);
    width: 140mm;          /* deja ~40mm para el número de página */
    padding-top: 4pt;
  }}
  .pie-texto {{
    font-size: 7pt; color: #333;
    text-align: center; line-height: 1.7;
  }}

  /* ── LÍNEAS separadoras ── */
  .lineas-sep  {{ display: flex; gap: 0; margin-bottom: 1px; }}
  .lineas-sep2 {{ display: flex; gap: 0; }}
  .lin-azul  {{ height: 3px; flex: 58; background: #002f6c; }}
  .lin-gap   {{ flex: 4; }}
  .lin-roja  {{ height: 3px; flex: 38; background: #da291c; }}
  .lin2-azul {{ height: 1px; flex: 58; background: #da291c; }}
  .lin2-gap  {{ flex: 4; }}
  .lin2-roja {{ height: 1px; flex: 38; background: #da291c; }}

  /* ── MARCA DE AGUA ── */
  .marca-agua {{
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 11cm; opacity: 0.04; z-index: 0;
  }}

  /* ── CONTENIDO ── */
  .titulo {{
    text-align: center; font-size: 12pt; font-weight: bold;
    color: #002f6c; margin-bottom: 4px; text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .subtitulo {{
    text-align: center; font-size: 7.5pt; color: #6b7280; margin-bottom: 14px;
  }}
  .ficha {{
    display: flex; flex-wrap: wrap;
    background: #f8faff; border: 0.5px solid #dde3f0;
    border-radius: 3px; padding: 10px 14px;
    margin-bottom: 16px; font-size: 9pt;
  }}
  .ficha-item {{ width: 50%; padding: 2px 0; }}
  .ficha-item-full {{ width: 100%; padding: 2px 0; }}
  .ficha-label {{ color: #6b7280; margin-right: 5px; }}
  .ficha-valor {{ font-weight: 600; color: #111; }}
  .section-title {{
    font-size: 8.5pt; font-weight: 700; color: #fff;
    background: #002f6c; padding: 5px 10px;
    margin-bottom: 0; text-transform: uppercase; letter-spacing: 0.5px;
  }}
  table.recorrido {{
    width: 100%; border-collapse: collapse;
    border: 0.5px solid #dde3f0;
    font-family: Arial, sans-serif;
  }}
  table.recorrido thead tr {{
    display: table-row;
  }}
  table.recorrido thead th {{
    background: #e8f1fd; color: #002f6c; font-size: 8pt;
    font-weight: 700; padding: 6px 7px; text-align: left;
    border-bottom: 1.5px solid #002f6c;
  }}
  table.recorrido tbody td {{
    font-size: 8.5pt; padding: 5px 7px;
    border-bottom: 0.5px solid #eef0f5;
    vertical-align: top;
  }}
</style>
</head>
<body>

<!-- ── CABECERA CORRIENTE (running element) ── -->
<div class="cabecera">
  <div class="enc-row">
    <img src="{ESCUDO_SRC}"    class="enc-izq" alt="GAD Cotopaxi">
    <img src="{LOGO_PREF_SRC}" class="enc-der" alt="Prefectura Cotopaxi">
  </div>
  <div class="lineas-sep">
    <div class="lin-azul"></div><div class="lin-gap"></div><div class="lin-roja"></div>
  </div>
  <div class="lineas-sep2">
    <div class="lin2-azul"></div><div class="lin2-gap"></div><div class="lin2-roja"></div>
  </div>
</div>

<!-- ── PIE CORRIENTE (running element) ── -->
<div class="pie">
  <div class="lineas-sep">
    <div class="lin-azul"></div><div class="lin-gap"></div><div class="lin-roja"></div>
  </div>
  <div class="lineas-sep2" style="margin-bottom:3px">
    <div class="lin2-azul"></div><div class="lin2-gap"></div><div class="lin2-roja"></div>
  </div>
  <div class="pie-texto">
    <strong>Dir:</strong> Calle Tarqui N° 507 y Quito &nbsp;•&nbsp;
    <strong>Telf:</strong> (03) 2800 416 - 2800 418 &nbsp;•&nbsp;
    <strong>Telefax:</strong> 2800 411<br>
    <strong>E-mail:</strong> info@cotopaxi.gob.ec &nbsp;•&nbsp;
    www.cotopaxi.gob.ec &nbsp;•&nbsp; Cotopaxi - Ecuador
  </div>
</div>

<!-- Marca de agua -->
<img src="{ESCUDO_SRC}" class="marca-agua" alt="">

<!-- ── CONTENIDO ── -->
<p class="titulo">Constancia de Recorrido Documental</p>
<p class="subtitulo">
  Generado el {generado_str} &nbsp;·&nbsp;
  Sistema de Gestión Documental — GAD Provincial de Cotopaxi
</p>

<div class="ficha">
  <div class="ficha-item">
    <span class="ficha-label">N° Radicado:</span>
    <span class="ficha-valor" style="color:#002f6c;font-family:monospace">{doc.radi_nume_text or doc.radi_nume_radi}</span>
  </div>
  <div class="ficha-item">
    <span class="ficha-label">Estado actual:</span>
    <span class="ficha-valor">{estado_nombre}</span>
  </div>
  <div class="ficha-item-full">
    <span class="ficha-label">Asunto:</span>
    <span class="ficha-valor">{doc.radi_asunto or '(sin asunto)'}</span>
  </div>
  <div class="ficha-item">
    <span class="ficha-label">Fecha de radicación:</span>
    <span class="ficha-valor">{fecha_str}</span>
  </div>
  <div class="ficha-item">
    <span class="ficha-label">Remitente:</span>
    <span class="ficha-valor">{creador.usua_nombre if creador else '—'}</span>
  </div>
  {'<div class="ficha-item"><span class="ficha-label">Área remitente:</span>' +
    f'<span class="ficha-valor">{creador_area}</span></div>'
    if creador_area else ''}
  {'<div class="ficha-item"><span class="ficha-label">N° cuenta:</span>' +
    f'<span class="ficha-valor">{doc.radi_cuentai}</span></div>'
    if doc.radi_cuentai else ''}
</div>

<div class="section-title">Recorrido del documento — {len(eventos)} evento(s) registrado(s)</div>
<table class="recorrido">
  <thead>
    <tr>
      <th style="width:68px">Fecha / Hora</th>
      <th style="width:110px">Evento</th>
      <th style="width:23%">Origen</th>
      <th style="width:23%">Destino</th>
      <th>Observación</th>
    </tr>
  </thead>
  <tbody>
    {filas_html}
  </tbody>
</table>

</body>
</html>"""

        try:
            pdf_bytes = WeasyHTML(string=html).write_pdf()
        except Exception as e:
            return Response({'detail': f'Error generando PDF: {e}'}, status=500)

        filename = f"recorrido_{doc.radi_nume_text or radi_id}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class QuipuxSecuencialView(APIView):
    """
    Consulta el último número secuencial por prefijo y año en Quipux.
    Útil para configurar secuencial_inicial en TipoDocumento al migrar.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        anio = request.query_params.get('anio', '')
        try:
            with connections['quipux_transaccional'].cursor() as cursor:
                where = ""
                params = []
                if anio:
                    where = "AND SPLIT_PART(radi_nume_text, '-', 4) = %s"
                    params = [str(anio)]
                cursor.execute(f"""
                    SELECT
                        SPLIT_PART(radi_nume_text, '-', 1)    AS prefijo,
                        SPLIT_PART(radi_nume_text, '-', 4)    AS anio,
                        MAX(CAST(NULLIF(SPLIT_PART(radi_nume_text, '-', 2), '') AS INTEGER)) AS ultimo
                    FROM radicado
                    WHERE radi_nume_text ~ '^[A-Z]+-[0-9]+-[A-Z]+-[0-9]{{4}}$'
                    {where}
                    GROUP BY prefijo, anio
                    ORDER BY anio DESC, prefijo
                """, params)
                rows = cursor.fetchall()
            return Response([
                {'prefijo': r[0], 'anio': r[1], 'ultimo_secuencial': r[2]}
                for r in rows if r[0] and r[2]
            ])
        except Exception as e:
            return Response({'detail': f'Base Quipux no disponible: {e}'}, status=503)
