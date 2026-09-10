"""Carpetas Virtuales (F2-F) — clasificación operativa por Unidad.

Reglas funcionales:
  R1 — los documentos EN ELABORACIÓN (borrador / en_revision) no se clasifican.
  R2 — administrar el árbol (crear/renombrar/mover/desactivar/activar) es
       exclusivo de ADMIN_GENERAL / superusuario.
  R3 — el usuario normal consulta su árbol y clasifica documentos formalizados.
  R4 — "eliminar" carpeta = desactivación lógica recursiva (nunca borra filas
       ni documentos ni toca bandejas).
  R5 — matriz de bandejas: SÍ Recibidos/Enviados/Archivados/Tareas Recibidas/
       Tareas Enviadas; NO En Elaboración/No Enviados/Reasignados/Informados/
       Eliminados. Desde Tareas se clasifica el DOCUMENTO, no la Tarea (F2-D).
"""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario, Rol, UsuarioRol
from .models import (
    BandejaDocumento, Destinatario, Documento, TipoDocumento, Tarea,
    CarpetaVirtual, DocumentoCarpetaVirtual, SeguimientoDocumento,
)
from . import numeracion


class CarpetaBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.jur = Unidad.objects.create(nivel=nivel, codigo='DAJ', nombre='Dir. Jurídica', siglas='DAJ', tipo='direccion')
        self.fin = Unidad.objects.create(nivel=nivel, codigo='DAF', nombre='Dir. Financiera', siglas='DAF', tipo='direccion')
        self.juan = Usuario.objects.create_user(email='juan@t.local', nombres='Juan', apellidos='J', unidad=self.jur)  # normal, Jurídica
        self.jose = Usuario.objects.create_user(email='jose@t.local', nombres='José', apellidos='J', unidad=self.jur)  # normal, misma unidad
        self.fabi = Usuario.objects.create_user(email='fabi@t.local', nombres='Fabi', apellidos='F', unidad=self.fin)  # normal, otra unidad
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')

        # admin del árbol: ADMIN_GENERAL (no superusuario) — R2
        rol_admin = Rol.objects.get_or_create(codigo='ADMIN_GENERAL', defaults={'nombre': 'Administrador General'})[0]
        self.admin = Usuario.objects.create_user(email='adm@t.local', nombres='Adm', apellidos='G', unidad=self.fin)
        UsuarioRol.objects.create(usuario=self.admin, rol=rol_admin, activo=True)
        # RESPONSABLE_ARCHIVO NO administra carpetas (R2)
        rol_resp = Rol.objects.get_or_create(codigo='RESPONSABLE_ARCHIVO', defaults={'nombre': 'Responsable de Archivo'})[0]
        self.resp = Usuario.objects.create_user(email='resp@t.local', nombres='Resp', apellidos='A', unidad=self.jur)
        UsuarioRol.objects.create(usuario=self.resp, rol=rol_resp, activo=True)

        self.cj = APIClient(); self.cj.force_authenticate(self.juan)   # normal Jurídica
        self.cf = APIClient(); self.cf.force_authenticate(self.fabi)   # normal Financiera
        self.ca = APIClient(); self.ca.force_authenticate(self.admin)  # ADMIN_GENERAL
        self.cr = APIClient(); self.cr.force_authenticate(self.resp)   # RESPONSABLE_ARCHIVO

    # ── helpers ──
    def _carpeta(self, nombre, padre=None, unidad=None, cli=None, expect=201):
        """Crea una carpeta como ADMIN (R2). `cli` para probar denegaciones."""
        cli = cli or self.ca
        payload = {'nombre': nombre}
        if padre is not None:
            payload['padre'] = padre
        if unidad is not None:
            payload['unidad'] = unidad
        elif cli is self.ca:
            payload['unidad'] = self.jur.id            # admin siempre declara la unidad
        r = cli.post('/api/v1/documentos/carpetas/', payload, format='json')
        assert r.status_code == expect, (r.status_code, r.data)
        return r

    def _doc(self, *, creado_por=None, dest=None, estado='enviado', asunto='X', bandeja_creador=None):
        creador = creado_por or self.juan
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.jur, creado_por=creador, anio=2026, estado=estado)
        numeracion.numero_provisional(d); d.save()
        for u in (dest or []):
            Destinatario.objects.create(documento=d, usuario=u, unidad=u.unidad, tipo='principal')
        if bandeja_creador:
            BandejaDocumento.objects.create(documento=d, usuario=creador, bandeja=bandeja_creador)
        return d

    def _recibido_por(self, usuario, **kw):
        d = self._doc(**kw)
        BandejaDocumento.objects.create(documento=d, usuario=usuario, bandeja='recibidos')
        Destinatario.objects.get_or_create(documento=d, usuario=usuario, defaults={'unidad': usuario.unidad, 'tipo': 'principal'})
        return d

    def _en_bandeja(self, usuario, bandeja, asunto='B'):
        """Documento formalizado que `usuario` tiene en `bandeja` (R5)."""
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.jur, creado_por=self.jose, anio=2026, estado='enviado')
        numeracion.numero_provisional(d); d.save()
        BandejaDocumento.objects.create(documento=d, usuario=usuario, bandeja=bandeja)
        Destinatario.objects.get_or_create(documento=d, usuario=usuario, defaults={'unidad': usuario.unidad, 'tipo': 'principal'})
        return d

    def _carpeta_jur(self, nombre='Convenios', padre=None):
        c = CarpetaVirtual.objects.create(unidad=self.jur, nombre=nombre, padre=padre, creada_por=self.admin)
        return c

    def _clasificar(self, cli, doc_ids, carpeta_id, expect=200):
        r = cli.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': doc_ids, 'carpeta_id': carpeta_id}, format='json')
        assert r.status_code == expect, (r.status_code, r.data)
        return r


# ── R2/R3 — permisos de administración del árbol ──────────────────────────
class PermisosArbolTest(CarpetaBase):
    def test_admin_general_crea_renombra_mueve(self):
        a = self._carpeta('A').data['id']
        b = self._carpeta('B').data['id']
        self.assertEqual(self.ca.patch(f'/api/v1/documentos/carpetas/{b}/', {'nombre': 'B2'}, format='json').status_code, 200)
        self.assertEqual(self.ca.patch(f'/api/v1/documentos/carpetas/{b}/', {'padre': a}, format='json').status_code, 200)
        self.assertEqual(CarpetaVirtual.objects.get(pk=b).padre_id, a)

    def test_superusuario_tambien_administra(self):
        su = Usuario.objects.create_user(email='su@t.local', nombres='S', apellidos='U', unidad=self.jur)
        su.is_superuser = True; su.save(update_fields=['is_superuser'])
        c = APIClient(); c.force_authenticate(su)
        r = c.post('/api/v1/documentos/carpetas/', {'nombre': 'SU', 'unidad': self.jur.id}, format='json')
        self.assertEqual(r.status_code, 201, r.data)

    def test_usuario_normal_no_crea(self):
        self._carpeta('X', cli=self.cj, expect=403)

    def test_usuario_normal_no_renombra_ni_mueve_ni_desactiva(self):
        c = self._carpeta_jur('Convenios').id
        self.assertEqual(self.cj.patch(f'/api/v1/documentos/carpetas/{c}/', {'nombre': 'Otro'}, format='json').status_code, 403)
        self.assertEqual(self.cj.patch(f'/api/v1/documentos/carpetas/{c}/', {'padre': None}, format='json').status_code, 403)
        self.assertEqual(self.cj.delete(f'/api/v1/documentos/carpetas/{c}/').status_code, 403)
        self.assertEqual(self.cj.post(f'/api/v1/documentos/carpetas/{c}/activar/').status_code, 403)
        self.assertTrue(CarpetaVirtual.objects.filter(pk=c, activa=True).exists())

    def test_responsable_archivo_no_administra_carpetas(self):
        # R2 — no por su rol. (RESPONSABLE_ARCHIVO es autoridad de Archivo, no de Carpetas Virtuales.)
        self._carpeta('X', cli=self.cr, expect=403)
        c = self._carpeta_jur('Convenios').id
        self.assertEqual(self.cr.patch(f'/api/v1/documentos/carpetas/{c}/', {'nombre': 'Y'}, format='json').status_code, 403)
        self.assertEqual(self.cr.delete(f'/api/v1/documentos/carpetas/{c}/').status_code, 403)

    def test_usuario_normal_consulta_su_arbol(self):
        self._carpeta_jur('Convenios')
        self._carpeta_jur('Contratos')
        r = self.cj.get('/api/v1/documentos/carpetas/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual({c['nombre'] for c in r.data['carpetas']}, {'Convenios', 'Contratos'})
        self.assertFalse(r.data['puede_administrar'])
        # …pero NO el de otra unidad
        self.assertEqual(self.cj.get('/api/v1/documentos/carpetas/', {'unidad': self.fin.id}).status_code, 403)

    def test_admin_ve_puede_administrar_flag(self):
        r = self.ca.get('/api/v1/documentos/carpetas/', {'unidad': self.jur.id})
        self.assertTrue(r.data['puede_administrar'])


# ── árbol: ciclos, nombres, unidad ───────────────────────────────────────
class ArbolCarpetasTest(CarpetaBase):
    def test_crear_raiz_y_subcarpeta(self):
        raiz = self._carpeta('Convenios').data['id']
        sub = self._carpeta('Universidades', padre=raiz).data['id']
        self.assertEqual(CarpetaVirtual.objects.get(pk=sub).padre_id, raiz)

    def test_impedir_ciclo(self):
        a = self._carpeta('A').data['id']
        b = self._carpeta('B', padre=a).data['id']
        c = self._carpeta('C', padre=b).data['id']
        self.assertEqual(self.ca.patch(f'/api/v1/documentos/carpetas/{a}/', {'padre': c}, format='json').status_code, 409)
        self.assertEqual(self.ca.patch(f'/api/v1/documentos/carpetas/{a}/', {'padre': a}, format='json').status_code, 409)

    def test_impedir_padre_de_otra_unidad(self):
        raiz_fin = self._carpeta('Presupuesto', unidad=self.fin.id).data['id']
        r = self.ca.post('/api/v1/documentos/carpetas/', {'nombre': 'X', 'padre': raiz_fin, 'unidad': self.jur.id}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_nombres_hermanos_duplicados_rechazados(self):
        self._carpeta('Con  venios')                       # dos espacios → uno
        for v in ('Con venios', 'CON VENIOS', '  con venios  '):
            r = self._carpeta(v, expect=409)
            self.assertIn('Ya existe', r.data['detail'])

    def test_mismo_nombre_distinto_padre_permitido(self):
        y1 = self._carpeta('2025').data['id']
        y2 = self._carpeta('2026').data['id']
        self._carpeta('Convenios', padre=y1)
        self._carpeta('Convenios', padre=y2)
        self.assertEqual(CarpetaVirtual.objects.filter(nombre_norm='convenios').count(), 2)


# ── R1 — en elaboración no se clasifica ──────────────────────────────────
class ClasificarEstadoTest(CarpetaBase):
    def test_borrador_no_clasificable(self):
        c = self._carpeta_jur('Convenios').id
        d = Documento(tipo_documento=self.tipo, asunto='b', cuerpo='<p>c</p>', unidad_origen=self.jur,
                      creado_por=self.juan, anio=2026, estado='borrador')
        numeracion.numero_provisional(d); d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.juan, bandeja='en_elaboracion')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': c}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertIn('elaboración', r.data['errores'][0]['detalle'].lower())
        self.assertFalse(DocumentoCarpetaVirtual.objects.filter(documento=d).exists())

    def test_en_revision_no_clasificable(self):
        c = self._carpeta_jur('Convenios').id
        d = self._recibido_por(self.juan)
        Documento.objects.filter(pk=d.id).update(estado='en_revision')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': c}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_enviado_si_clasificable(self):
        c = self._carpeta_jur('Convenios').id
        d = self._recibido_por(self.juan)              # estado='enviado'
        self._clasificar(self.cj, [d.id], c)
        self.assertTrue(DocumentoCarpetaVirtual.objects.filter(documento=d).exists())

    def test_papelera_no_clasificable(self):
        c = self._carpeta_jur('Convenios').id
        d = Documento(tipo_documento=self.tipo, asunto='b', cuerpo='<p>c</p>', unidad_origen=self.jur,
                      creado_por=self.juan, anio=2026)
        numeracion.numero_provisional(d); d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.juan, bandeja='en_elaboracion')
        self.cj.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': c}, format='json')
        self.assertEqual(r.status_code, 409)


# ── R3 — clasificación por el usuario normal ─────────────────────────────
class ClasificarTest(CarpetaBase):
    def test_usuario_normal_clasifica_documento_permitido(self):
        c = self._carpeta_jur('Convenios').id
        d = self._recibido_por(self.juan)
        antes = (d.estado, d.cuerpo, d.responde_a_id)
        b_antes = BandejaDocumento.objects.get(documento=d, usuario=self.juan).bandeja
        r = self._clasificar(self.cj, [d.id], c)
        self.assertEqual(r.data['clasificados'], [d.id])
        d.refresh_from_db()
        self.assertEqual((d.estado, d.cuerpo, d.responde_a_id), antes)
        self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.juan).bandeja, b_antes)
        self.assertFalse(SeguimientoDocumento.objects.filter(documento=d, etapa__icontains='carpeta').exists())

    def test_idempotente_sin_cambio(self):
        c = self._carpeta_jur('Convenios').id
        d = self._recibido_por(self.juan)
        self._clasificar(self.cj, [d.id], c)
        r = self._clasificar(self.cj, [d.id], c)
        self.assertEqual(r.data['sin_cambio'], [d.id])
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d, unidad=self.jur).count(), 1)

    def test_reclasificar_es_update_no_duplica(self):
        conv = self._carpeta_jur('Convenios').id
        cont = self._carpeta_jur('Contratos').id
        d = self._recibido_por(self.juan)
        self._clasificar(self.cj, [d.id], conv)
        r = self._clasificar(self.cj, [d.id], cont)
        self.assertEqual(r.data['reclasificados'], [d.id])
        rels = DocumentoCarpetaVirtual.objects.filter(documento=d, unidad=self.jur)
        self.assertEqual(rels.count(), 1)
        self.assertEqual(rels.get().carpeta_id, cont)

    def test_mismo_documento_dos_unidades(self):
        conv = self._carpeta_jur('Convenios').id
        pres = CarpetaVirtual.objects.create(unidad=self.fin, nombre='Presupuesto', creada_por=self.admin)
        d = self._doc(estado='enviado')
        BandejaDocumento.objects.create(documento=d, usuario=self.juan, bandeja='recibidos')
        BandejaDocumento.objects.create(documento=d, usuario=self.fabi, bandeja='recibidos')
        self._clasificar(self.cj, [d.id], conv)
        self._clasificar(self.cf, [d.id], pres.id)
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d).count(), 2)
        self.assertEqual(Documento.objects.filter(pk=d.id).count(), 1)

    def test_mismo_doc_dos_carpetas_misma_unidad_no_permitido(self):
        conv = self._carpeta_jur('Convenios').id
        cont = self._carpeta_jur('Contratos').id
        d = self._recibido_por(self.juan)
        self._clasificar(self.cj, [d.id], conv)
        self._clasificar(self.cj, [d.id], cont)
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d, unidad=self.jur).count(), 1)

    def test_no_clasifica_en_carpeta_de_otra_unidad(self):
        pres = CarpetaVirtual.objects.create(unidad=self.fin, nombre='Presupuesto', creada_por=self.admin)
        d = self._recibido_por(self.juan)
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': pres.id}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_clasificar_sin_acl_rechaza(self):
        c = self._carpeta_jur('Convenios').id
        ajeno = self._doc(creado_por=self.fabi, estado='enviado')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [ajeno.id], 'carpeta_id': c}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(any('acceso' in e['detalle'].lower() for e in r.data['errores']))

    def test_batch_exitoso(self):
        c = self._carpeta_jur('Convenios').id
        docs = [self._recibido_por(self.juan, asunto=f'D{i}') for i in range(3)]
        r = self._clasificar(self.cj, [d.id for d in docs], c)
        self.assertEqual(sorted(r.data['clasificados']), sorted(d.id for d in docs))

    def test_batch_todo_o_nada(self):
        c = self._carpeta_jur('Convenios').id
        ok = self._recibido_por(self.juan, asunto='ok')
        malo = self._doc(creado_por=self.fabi, estado='enviado')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [ok.id, malo.id], 'carpeta_id': c}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(DocumentoCarpetaVirtual.objects.filter(documento=ok).exists())

    def test_varios_destinatarios_un_solo_nodo(self):
        c = self._carpeta_jur('Convenios').id
        d = self._doc(estado='enviado', dest=[self.jose, self.fabi, self.admin])
        BandejaDocumento.objects.create(documento=d, usuario=self.juan, bandeja='recibidos')
        Destinatario.objects.create(documento=d, usuario=self.juan, unidad=self.jur, tipo='principal')
        self._clasificar(self.cj, [d.id], c)
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d).count(), 1)
        cont = self.cj.get(f'/api/v1/documentos/carpetas/{c}/documentos/').data
        self.assertEqual([x['id'] for x in cont['results']].count(d.id), 1)

    def test_quitar_de_carpeta_no_borra_documento(self):
        c = self._carpeta_jur('Convenios').id
        d = self._recibido_por(self.juan)
        self._clasificar(self.cj, [d.id], c)
        r = self.cj.post(f'/api/v1/documentos/{d.id}/quitar_de_carpeta/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(DocumentoCarpetaVirtual.objects.filter(documento=d, unidad=self.jur).exists())
        self.assertTrue(Documento.objects.filter(pk=d.id).exists())


# ── R4 — desactivación lógica ────────────────────────────────────────────
class DesactivacionTest(CarpetaBase):
    def test_desactivar_es_recursivo_y_no_borra_filas(self):
        a = self._carpeta('A').data['id']
        b = self._carpeta('B', padre=a).data['id']
        c = self._carpeta('C', padre=b).data['id']
        r = self.ca.delete(f'/api/v1/documentos/carpetas/{a}/')
        self.assertEqual(r.status_code, 204)
        for cid in (a, b, c):
            row = CarpetaVirtual.objects.get(pk=cid)   # la fila SIGUE existiendo
            self.assertFalse(row.activa)               # …desactivada

    def test_desactivar_no_elimina_documentos_ni_altera_bandejas(self):
        c = self._carpeta_jur('Convenios')
        d = self._recibido_por(self.juan)
        self._clasificar(self.cj, [d.id], c.id)
        b_antes = BandejaDocumento.objects.get(documento=d, usuario=self.juan).bandeja
        self.ca.delete(f'/api/v1/documentos/carpetas/{c.id}/')
        d.refresh_from_db()
        self.assertTrue(Documento.objects.filter(pk=d.id).exists())
        self.assertTrue(DocumentoCarpetaVirtual.objects.filter(documento=d, carpeta=c).exists())  # clasificación intacta
        self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.juan).bandeja, b_antes)

    def test_carpeta_desactivada_fuera_del_arbol_y_no_admite_clasificacion(self):
        c = self._carpeta_jur('Convenios')
        self.ca.delete(f'/api/v1/documentos/carpetas/{c.id}/')
        arb = self.cj.get('/api/v1/documentos/carpetas/').data
        self.assertNotIn(c.id, [x['id'] for x in arb['carpetas']])
        # admin puede verla con incluir_inactivas
        arb_adm = self.ca.get('/api/v1/documentos/carpetas/', {'unidad': self.jur.id, 'incluir_inactivas': 'true'}).data
        self.assertIn(c.id, [x['id'] for x in arb_adm['carpetas']])
        # no admite nuevas clasificaciones
        d = self._recibido_por(self.juan)
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': c.id}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_desactivar_libera_el_nombre(self):
        c1 = self._carpeta('Convenios').data['id']
        self.ca.delete(f'/api/v1/documentos/carpetas/{c1}/')
        r = self._carpeta('Convenios')                 # se puede recrear
        self.assertNotEqual(r.data['id'], c1)

    def test_activar_requiere_padre_activo(self):
        a = self._carpeta('A').data['id']
        b = self._carpeta('B', padre=a).data['id']
        self.ca.delete(f'/api/v1/documentos/carpetas/{a}/')   # desactiva a+b
        # activar b directamente → 409 (padre inactivo)
        self.assertEqual(self.ca.post(f'/api/v1/documentos/carpetas/{b}/activar/').status_code, 409)
        # activar a → OK; luego b
        self.assertEqual(self.ca.post(f'/api/v1/documentos/carpetas/{a}/activar/').status_code, 200)
        self.assertEqual(self.ca.post(f'/api/v1/documentos/carpetas/{b}/activar/').status_code, 200)
        self.assertTrue(CarpetaVirtual.objects.get(pk=b).activa)

    def test_auditoria_registra_administracion(self):
        from django.db import connection
        # `aud_log` es managed=False; en la BD de test la creamos mínima.
        with connection.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS aud_log (
                    id BIGSERIAL PRIMARY KEY, tabla VARCHAR(60) NOT NULL, registro_id BIGINT,
                    accion VARCHAR(20) NOT NULL, datos_antes JSONB, datos_despues JSONB,
                    campos_cambiados TEXT, usuario_id INTEGER, usuario_email VARCHAR(200),
                    unidad_id INTEGER, ip_address INET, user_agent TEXT, modulo VARCHAR(40),
                    descripcion TEXT, creado_en TIMESTAMPTZ NOT NULL DEFAULT now())
            """)
            cur.execute("""
                CREATE OR REPLACE FUNCTION fn_auditoria() RETURNS trigger AS $$
                BEGIN
                    INSERT INTO aud_log(tabla, registro_id, accion)
                    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP);
                    RETURN COALESCE(NEW, OLD);
                END; $$ LANGUAGE plpgsql;
            """)
            cur.execute("""
                DROP TRIGGER IF EXISTS trg_aud_cv ON doc_carpeta_virtual;
                CREATE TRIGGER trg_aud_cv AFTER INSERT OR UPDATE OR DELETE ON doc_carpeta_virtual
                FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
            """)
        c = self._carpeta('Convenios').data['id']
        self.ca.patch(f'/api/v1/documentos/carpetas/{c}/', {'nombre': 'Convenios GAD'}, format='json')
        self.ca.delete(f'/api/v1/documentos/carpetas/{c}/')
        with connection.cursor() as cur:
            cur.execute("SELECT accion FROM aud_log WHERE tabla='doc_carpeta_virtual' AND registro_id=%s ORDER BY id", [c])
            acciones = [row[0] for row in cur.fetchall()]
        self.assertIn('INSERT', acciones)
        self.assertIn('UPDATE', acciones)   # renombrar + desactivar son UPDATE
        with connection.cursor() as cur:
            cur.execute("DROP TRIGGER IF EXISTS trg_aud_cv ON doc_carpeta_virtual")


# ── interacción con bandejas ─────────────────────────────────────────────
class InteraccionBandejasTest(CarpetaBase):
    def _clasificado(self, asunto='D'):
        c = CarpetaVirtual.objects.create(unidad=self.jur, nombre=f'Conv-{asunto}', creada_por=self.admin)
        d = self._recibido_por(self.juan, asunto=asunto)
        self._clasificar(self.cj, [d.id], c.id)
        return d, c

    def test_archivar_y_restaurar_conservan_carpeta(self):
        d, c = self._clasificado()
        it = BandejaDocumento.objects.get(documento=d, usuario=self.juan)
        self.cj.post(f'/api/v1/documentos/bandeja/{it.id}/archivar/', format='json')
        self.assertEqual(DocumentoCarpetaVirtual.objects.get(documento=d).carpeta_id, c.id)
        self.cj.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        self.assertEqual(DocumentoCarpetaVirtual.objects.get(documento=d).carpeta_id, c.id)

    def test_reasignar_conserva_clasificacion(self):
        d, c = self._clasificado()
        it = BandejaDocumento.objects.get(documento=d, usuario=self.juan)
        self.cj.post(f'/api/v1/documentos/bandeja/{it.id}/reasignar/', {'usuario_id': self.jose.id}, format='json')
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d).count(), 1)

    def test_informar_no_comparte_clasificacion(self):
        d, c = self._clasificado()
        self.cj.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.fabi.id]}, format='json')
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=d).count(), 1)

    def test_responder_no_hereda_carpeta(self):
        d, c = self._clasificado()
        r = self.cj.post(f'/api/v1/documentos/{d.id}/responder/', {}, format='json')
        self.assertFalse(DocumentoCarpetaVirtual.objects.filter(documento_id=r.data['documento_id']).exists())

    def test_acl_documental_respetada_desde_carpeta(self):
        c = CarpetaVirtual.objects.create(unidad=self.jur, nombre='Reservados', creada_por=self.admin)
        secreto = self._doc(creado_por=self.juan, estado='enviado', asunto='SECRETO', bandeja_creador='enviados')
        self._clasificar(self.cj, [secreto.id], c.id)
        visible = self._recibido_por(self.jose, asunto='visible', bandeja_creador='enviados')
        self._clasificar(self.cj, [visible.id], c.id)   # juan es creador y lo tiene en Enviados
        cli = APIClient(); cli.force_authenticate(self.jose)
        ids = {x['id'] for x in cli.get(f'/api/v1/documentos/carpetas/{c.id}/documentos/').data['results']}
        self.assertIn(visible.id, ids)
        self.assertNotIn(secreto.id, ids)


# ── R5 — matriz de bandejas ──────────────────────────────────────────────
class MatrizBandejasTest(CarpetaBase):
    def setUp(self):
        super().setUp()
        self.c = self._carpeta_jur('Convenios')

    def _clasif(self, doc, expect=200):
        return self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                            {'documentos': [doc.id], 'carpeta_id': self.c.id}, format='json').status_code == expect

    def test_recibidos_enviados_archivados_si(self):
        self.assertTrue(self._clasif(self._en_bandeja(self.juan, 'recibidos')))
        self.assertTrue(self._clasif(self._en_bandeja(self.juan, 'enviados')))
        self.assertTrue(self._clasif(self._en_bandeja(self.juan, 'archivados')))

    def test_tareas_recibidas_y_enviadas_si(self):
        self.assertTrue(self._clasif(self._en_bandeja(self.juan, 'tareas_recibidas')))
        self.assertTrue(self._clasif(self._en_bandeja(self.juan, 'tareas_enviadas')))

    def test_reasignados_no(self):
        # 'reasignados' = físicamente en_elaboracion con accion_tomada='reasignado'
        d = self._en_bandeja(self.juan, 'en_elaboracion')
        BandejaDocumento.objects.filter(documento=d, usuario=self.juan).update(accion_tomada='reasignado')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertIn('bandeja', r.data['errores'][0]['detalle'].lower())

    def test_informados_no(self):
        d = self._en_bandeja(self.juan, 'informados')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(DocumentoCarpetaVirtual.objects.filter(documento=d).exists())

    def test_no_enviados_no(self):
        d = self._en_bandeja(self.juan, 'no_enviados')
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_endpoint_respeta_matriz_aunque_tenga_acl(self):
        # el usuario PUEDE ver el documento (es destinatario) pero solo lo tiene
        # en 'informados' → clasificar rechazado igual.
        d = self._en_bandeja(self.juan, 'informados')
        self.assertIn(d.id, {x['id'] for x in self.cj.get('/api/v1/documentos/').data['results']})  # ACL sí
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 409)                                                        # matriz no

    def test_admin_general_bypass_matriz(self):
        # admin clasifica para una unidad aunque no tenga el doc en bandeja alguna
        d = self._doc(creado_por=self.jose, estado='enviado', bandeja_creador='enviados')
        r = self.ca.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 200, r.data)


# ── R5 — clasificar desde Tareas es sobre el Documento (F2-D) ─────────────
class ClasificarDesdeTareasTest(CarpetaBase):
    def setUp(self):
        super().setUp()
        self.c = self._carpeta_jur('Informes')
        # documento con varias tareas para el mismo asignado
        self.d = self._doc(creado_por=self.jose, estado='enviado', asunto='doc con tareas')
        BandejaDocumento.objects.create(documento=self.d, usuario=self.juan, bandeja='tareas_recibidas')
        BandejaDocumento.objects.create(documento=self.d, usuario=self.jose, bandeja='tareas_enviadas')
        Destinatario.objects.get_or_create(documento=self.d, usuario=self.juan, defaults={'unidad': self.jur, 'tipo': 'principal'})
        self.t1 = Tarea.objects.create(documento=self.d, asignada_por=self.jose, asignada_a=self.juan,
                                       descripcion='tarea 1', estado='pendiente')
        self.t2 = Tarea.objects.create(documento=self.d, asignada_por=self.jose, asignada_a=self.juan,
                                       descripcion='tarea 2', estado='en_proceso')

    def test_clasifica_documento_desde_tareas_recibidas(self):
        r = self._clasificar(self.cj, [self.d.id], self.c.id)
        self.assertEqual(r.data['clasificados'], [self.d.id])
        rel = DocumentoCarpetaVirtual.objects.get(documento=self.d, unidad=self.jur)
        self.assertEqual(rel.carpeta_id, self.c.id)

    def test_varias_tareas_una_sola_clasificacion(self):
        self._clasificar(self.cj, [self.d.id], self.c.id)
        self.assertEqual(DocumentoCarpetaVirtual.objects.filter(documento=self.d).count(), 1)  # no una por tarea

    def test_clasificar_no_modifica_la_tarea(self):
        antes = [(self.t1.estado, self.t1.descripcion), (self.t2.estado, self.t2.descripcion)]
        self._clasificar(self.cj, [self.d.id], self.c.id)
        self.t1.refresh_from_db(); self.t2.refresh_from_db()
        self.assertEqual([(self.t1.estado, self.t1.descripcion), (self.t2.estado, self.t2.descripcion)], antes)

    def test_creador_clasifica_desde_tareas_enviadas(self):
        # jose (Jurídica) tiene el documento en 'tareas_enviadas' → puede clasificar
        cli = APIClient(); cli.force_authenticate(self.jose)
        r = cli.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': [self.d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(DocumentoCarpetaVirtual.objects.get(documento=self.d).asignado_por_id, self.jose.id)


# ── R3 corrección migración: clasificaciones históricas de borradores ────
class MigracionHistoricaBorradorTest(CarpetaBase):
    def test_relacion_historica_de_borrador_se_conserva_pero_no_se_muestra(self):
        c = self._carpeta_jur('Histórico')
        # simula ETL: fila DocumentoCarpetaVirtual sobre un documento en borrador
        borrador = Documento(tipo_documento=self.tipo, asunto='borrador migrado', cuerpo='<p>c</p>',
                             unidad_origen=self.jur, creado_por=self.juan, anio=2025, estado='borrador')
        numeracion.numero_provisional(borrador); borrador.save()
        rel = DocumentoCarpetaVirtual.objects.create(
            documento=borrador, unidad=self.jur, carpeta=c, asignado_por=self.juan,
        )
        # la relación EXISTE en BD
        self.assertTrue(DocumentoCarpetaVirtual.objects.filter(pk=rel.id).exists())
        # …pero el borrador NO aparece en la vista compartida de la carpeta
        cont = self.cj.get(f'/api/v1/documentos/carpetas/{c.id}/documentos/').data
        self.assertNotIn(borrador.id, [x['id'] for x in cont['results']])
        # …ni se puede reclasificar por endpoint (R1)
        r = self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                         {'documentos': [borrador.id], 'carpeta_id': c.id}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_al_formalizar_el_borrador_su_relacion_historica_aparece(self):
        c = self._carpeta_jur('Histórico')
        borrador = Documento(tipo_documento=self.tipo, asunto='borrador migrado', cuerpo='<p>c</p>',
                             unidad_origen=self.jur, creado_por=self.juan, anio=2025, estado='borrador')
        numeracion.numero_provisional(borrador); borrador.save()
        DocumentoCarpetaVirtual.objects.create(documento=borrador, unidad=self.jur, carpeta=c, asignado_por=self.juan)
        BandejaDocumento.objects.create(documento=borrador, usuario=self.juan, bandeja='recibidos')
        # pasa a estado formal
        Documento.objects.filter(pk=borrador.id).update(estado='enviado')
        cont = self.cj.get(f'/api/v1/documentos/carpetas/{c.id}/documentos/').data
        self.assertIn(borrador.id, [x['id'] for x in cont['results']])   # ahora sí visible


# ── n_docs coherente con ACL + estado + lista ────────────────────────────
class NDocsTest(CarpetaBase):
    def setUp(self):
        super().setUp()
        self.c = self._carpeta_jur('Convenios')

    def _clasif_directo(self, doc):
        """Inserta la fila sin pasar por el endpoint (para simular casos que el
        runtime no permitiría, p. ej. borrador histórico o doc sin ACL)."""
        return DocumentoCarpetaVirtual.objects.create(
            documento=doc, unidad=self.jur, carpeta=self.c, asignado_por=self.jose,
        )

    def _n_docs(self, cli):
        arb = cli.get('/api/v1/documentos/carpetas/', {'unidad': self.jur.id}).data
        return next(x['n_docs'] for x in arb['carpetas'] if x['id'] == self.c.id)

    def _lista_count(self, cli):
        return len(cli.get(f'/api/v1/documentos/carpetas/{self.c.id}/documentos/').data['results'])

    def test_documento_sin_acl_no_incrementa_para_usuario_normal(self):
        ajeno = self._doc(creado_por=self.fabi, estado='enviado')   # juan no participa
        self._clasif_directo(ajeno)
        self.assertEqual(self._n_docs(self.cj), 0)                  # juan: no lo ve → no cuenta
        self.assertEqual(self._lista_count(self.cj), 0)            # contador == lista

    def test_borrador_historico_no_incrementa(self):
        borrador = Documento(tipo_documento=self.tipo, asunto='hist', cuerpo='<p>c</p>',
                             unidad_origen=self.jur, creado_por=self.juan, anio=2025, estado='borrador')
        numeracion.numero_provisional(borrador); borrador.save()
        BandejaDocumento.objects.create(documento=borrador, usuario=self.juan, bandeja='recibidos')
        self._clasif_directo(borrador)
        self.assertEqual(self._n_docs(self.cj), 0)                  # R1: borrador no cuenta
        self.assertEqual(self._lista_count(self.cj), 0)

    def test_documento_visible_si_incrementa(self):
        d = self._recibido_por(self.juan, asunto='visible')
        self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        self.assertEqual(self._n_docs(self.cj), 1)
        self.assertEqual(self._lista_count(self.cj), 1)            # coherente

    def test_papelera_no_incrementa(self):
        d = self._recibido_por(self.juan)
        self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': [d.id], 'carpeta_id': self.c.id}, format='json')
        Documento.objects.filter(pk=d.id).update(eliminado_en=timezone.now())
        self.assertEqual(self._n_docs(self.cj), 0)
        self.assertEqual(self._lista_count(self.cj), 0)

    def test_admin_ve_total_segun_su_acl(self):
        # 2 docs de distintos participantes, ambos formalizados
        d1 = self._doc(creado_por=self.juan, estado='enviado', bandeja_creador='enviados')
        d2 = self._doc(creado_por=self.fabi, estado='enviado')
        self._clasif_directo(d1); self._clasif_directo(d2)
        # juan (normal) solo cuenta el suyo
        self.assertEqual(self._n_docs(self.cj), 1)
        # admin (ADMIN_GENERAL → ACL total) cuenta los 2, y su lista también
        self.assertEqual(self._n_docs(self.ca), 2)
        self.assertEqual(self._lista_count(self.ca), 2)

    def test_contador_no_incluye_subcarpetas(self):
        sub = CarpetaVirtual.objects.create(unidad=self.jur, nombre='Universidades',
                                            padre=self.c, creada_por=self.admin)
        d_padre = self._recibido_por(self.juan, asunto='en padre')
        d_hija  = self._recibido_por(self.juan, asunto='en hija')
        self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': [d_padre.id], 'carpeta_id': self.c.id}, format='json')
        self.cj.post('/api/v1/documentos/clasificar_carpeta/',
                     {'documentos': [d_hija.id], 'carpeta_id': sub.id}, format='json')
        arb = self.cj.get('/api/v1/documentos/carpetas/', {'unidad': self.jur.id}).data
        n_padre = next(x['n_docs'] for x in arb['carpetas'] if x['id'] == self.c.id)
        n_hija  = next(x['n_docs'] for x in arb['carpetas'] if x['id'] == sub.id)
        self.assertEqual(n_padre, 1)                # solo el directo, NO el de la hija
        self.assertEqual(n_hija, 1)
