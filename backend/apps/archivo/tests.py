"""
F3-A — Saneamiento y seguridad de la base archivística.

Cubre EXCLUSIVAMENTE el alcance de F3-A:
  · autorización por módulo `archivo` en toda la API (`PermisoModulo`);
  · ACL documental (F2-E) dentro del detalle de Expediente;
  · `agregar_documento`: expediente abierto + ACL del documento vinculado;
  · bloqueo del bypass de campos de transición vía PATCH/PUT genérico.

NO cubre (brechas diferidas): ciclo vital, baja documental, foliación,
cardinalidad Documento↔Expediente, transferencias, archivo físico, TPCD.
"""
import uuid as _uuid
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario, Rol, UsuarioRol
from apps.documentos.models import Documento, TipoDocumento, BandejaDocumento
from apps.documentos import numeracion
from apps.tramites.models import Tramite
from .models import Fondo, Seccion, Serie, Expediente, ExpedienteDocumento

API = '/api/v1/archivo'


class ArchivoBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='DAJ', nombre='Dir. Jurídica',
                                       siglas='DAJ', tipo='direccion')

        def _rol(codigo):
            return Rol.objects.get_or_create(codigo=codigo, defaults={'nombre': codigo})[0]

        def _user(email, rol_codigo=None, superuser=False):
            us = Usuario.objects.create_user(email=email, nombres=email[:3], apellidos='T', unidad=self.u)
            if superuser:
                us.is_superuser = True
                us.save(update_fields=['is_superuser'])
            if rol_codigo:
                UsuarioRol.objects.create(usuario=us, rol=_rol(rol_codigo), activo=True)
            return us

        self.sin_perm    = _user('nop@t.local',  'USUARIO')            # sin módulo archivo
        self.gestor      = _user('ges@t.local',  'GESTOR_DOCUMENTAL')  # ver/crear/editar/transferir
        self.responsable = _user('res@t.local',  'RESPONSABLE_ARCHIVO')  # + eliminar, + bypass ACL lectura
        self.admin       = _user('adm@t.local',  'ADMIN_GENERAL')
        self.superus     = _user('su@t.local',   superuser=True)

        self.c_nop = self._cli(self.sin_perm)
        self.c_ges = self._cli(self.gestor)
        self.c_res = self._cli(self.responsable)
        self.c_adm = self._cli(self.admin)
        self.c_su  = self._cli(self.superus)
        self.anon  = APIClient()

        # Cuadro de clasificación mínimo
        self.fondo   = Fondo.objects.create(nombre='GADPC')
        self.seccion = Seccion.objects.create(fondo=self.fondo, unidad=self.u, codigo='S1', nombre='Sección 1')
        self.serie   = Serie.objects.create(seccion=self.seccion, codigo='SER-001', nombre='Convenios')
        self.tipo    = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')
        self.tramite = Tramite.objects.create(
            uuid=_uuid.uuid4(), numero_tramite='TR-2026-0001', asunto='Trámite de prueba',
            fecha_limite=date(2026, 12, 31),
        )

    def _cli(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def _expediente(self, estado='abierto', expurgado=False, foliado=False):
        exp = Expediente.objects.create(
            serie=self.serie, unidad=self.u, titulo='Expediente prueba',
            creado_por=self.responsable, estado=estado,
            expurgado=expurgado, foliado=foliado,
        )
        exp.generar_codigo()
        exp.save()
        return exp

    def _doc(self, creado_por, asunto='Doc', bandeja_de=None):
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=creado_por, anio=2026, estado='enviado')
        numeracion.numero_provisional(d)
        d.save()
        if bandeja_de is not None:
            BandejaDocumento.objects.create(documento=d, usuario=bandeja_de, bandeja='recibidos')
        return d


# ── §19 — autorización por módulo ─────────────────────────────────────────
class PermisosModuloTest(ArchivoBase):
    RUTAS = ['fondos', 'secciones', 'series', 'expedientes',
             'transferencias', 'bajas-documentales', 'prestamos', 'copias-certificadas']

    def test_anonimo_401(self):
        for r in self.RUTAS:
            self.assertEqual(self.anon.get(f'{API}/{r}/').status_code, 401, r)

    def test_sin_permiso_no_lista(self):
        for r in self.RUTAS:
            self.assertEqual(self.c_nop.get(f'{API}/{r}/').status_code, 403, r)

    def test_sin_permiso_no_consulta_detalle(self):
        exp = self._expediente()
        self.assertEqual(self.c_nop.get(f'{API}/expedientes/{exp.id}/').status_code, 403)

    def test_sin_permiso_no_crea(self):
        r = self.c_nop.post(f'{API}/fondos/', {'nombre': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_sin_permiso_no_patch(self):
        r = self.c_nop.patch(f'{API}/series/{self.serie.id}/', {'nombre': 'Z'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_sin_permiso_no_delete(self):
        exp = self._expediente()
        self.assertEqual(self.c_nop.delete(f'{API}/expedientes/{exp.id}/').status_code, 403)

    def test_sin_permiso_no_acciones_custom(self):
        exp = self._expediente()
        self.assertEqual(self.c_nop.get(f'{API}/secciones/arbol/').status_code, 403)
        self.assertEqual(self.c_nop.get(f'{API}/expedientes/estadisticas/').status_code, 403)
        self.assertEqual(self.c_nop.post(f'{API}/expedientes/{exp.id}/expurgar/').status_code, 403)

    def test_gestor_ver_crear_editar_pero_no_eliminar(self):
        self.assertEqual(self.c_ges.get(f'{API}/expedientes/').status_code, 200)
        r = self.c_ges.post(f'{API}/expedientes/', {
            'serie': self.serie.id, 'unidad': self.u.id, 'titulo': 'Nuevo', 'soporte': 'digital',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        exp_id = r.data['id']
        self.assertEqual(
            self.c_ges.patch(f'{API}/expedientes/{exp_id}/', {'titulo': 'Editado'}, format='json').status_code, 200)
        # eliminar → 403 (GESTOR_DOCUMENTAL no tiene `archivo:eliminar`)
        self.assertEqual(self.c_ges.delete(f'{API}/expedientes/{exp_id}/').status_code, 403)
        self.assertTrue(Expediente.objects.filter(pk=exp_id).exists())

    def test_responsable_si_elimina(self):
        exp = self._expediente()
        self.assertEqual(self.c_res.delete(f'{API}/expedientes/{exp.id}/').status_code, 204)
        self.assertFalse(Expediente.objects.filter(pk=exp.id).exists())

    def test_admin_general_y_superuser_acceso_total(self):
        for cli in (self.c_adm, self.c_su):
            self.assertEqual(cli.get(f'{API}/fondos/').status_code, 200)
            r = cli.post(f'{API}/fondos/', {'nombre': f'F-{id(cli)}'}, format='json')
            self.assertEqual(r.status_code, 201, r.data)
            self.assertEqual(cli.delete(f'{API}/fondos/{r.data["id"]}/').status_code, 204)


# ── §20 / F3-A.1 — ACL del nodo del Expediente (documento y trámite) ─────
# Campos ADMITIDOS en un nodo restringido: EXACTAMENTE {id, acceso_restringido}.
_CAMPOS_PROHIBIDOS_RESTRINGIDO = {
    'documento', 'documento_numero', 'documento_asunto',
    'tramite', 'tramite_id', 'tramite_numero',
    'agregado_por', 'agregado_por_nombre', 'agregado_en',
    'orden_foja', 'expediente',
}


def _assert_nodo_restringido_minimo(test, nodo):
    test.assertEqual(set(nodo.keys()), {'id', 'acceso_restringido'}, nodo)
    test.assertTrue(nodo['acceso_restringido'])
    for k in _CAMPOS_PROHIBIDOS_RESTRINGIDO:
        test.assertNotIn(k, nodo)


class ACLDocumentalTest(ArchivoBase):
    def test_documento_sin_acl_nodo_minimo(self):
        exp = self._expediente()
        visible = self._doc(creado_por=self.gestor, asunto='VISIBLE')       # gestor lo creó → lo ve
        oculto  = self._doc(creado_por=self.responsable, asunto='SECRETO')  # gestor no participa
        ExpedienteDocumento.objects.create(expediente=exp, documento=visible, agregado_por=self.responsable)
        ExpedienteDocumento.objects.create(expediente=exp, documento=oculto,  agregado_por=self.responsable)

        r = self.c_ges.get(f'{API}/expedientes/{exp.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['documentos']), 2)   # estructura conservada

        vis = next(d for d in r.data['documentos'] if not d['acceso_restringido'])
        self.assertEqual(vis['documento'], visible.id)
        self.assertEqual(vis['documento_asunto'], 'VISIBLE')

        restr = next(d for d in r.data['documentos'] if d['acceso_restringido'])
        _assert_nodo_restringido_minimo(self, restr)

    def test_documento_sin_acl_y_tramite_sin_acl_no_filtra_tramite_id(self):
        exp = self._expediente()
        oculto = self._doc(creado_por=self.responsable, asunto='SECRETO')
        # nodo puramente de trámite
        ExpedienteDocumento.objects.create(expediente=exp, tramite=self.tramite, agregado_por=self.responsable)
        # nodo de documento sin ACL
        ExpedienteDocumento.objects.create(expediente=exp, documento=oculto, agregado_por=self.responsable)

        r = self.c_ges.get(f'{API}/expedientes/{exp.id}/')
        self.assertEqual(len(r.data['documentos']), 2)
        for nodo in r.data['documentos']:
            _assert_nodo_restringido_minimo(self, nodo)      # ambos enmascarados
        # tramite_id NO aparece en ningún lado de la respuesta
        import json
        self.assertNotIn(str(self.tramite.id), json.dumps(r.data['documentos']))
        self.assertNotIn(self.tramite.numero_tramite, json.dumps(r.data))

    def test_tramite_es_fail_closed_no_existe_acl_central(self):
        # §5.4 — hoy NO existe una ACL de lectura de Tramite (RF-TRAM-011 no
        # implementado). F3-A.1 no la crea → un nodo de trámite se enmascara
        # SIEMPRE, incluso para el rol que gestiona archivo.
        exp = self._expediente()
        ExpedienteDocumento.objects.create(expediente=exp, tramite=self.tramite, agregado_por=self.responsable)
        for cli in (self.c_ges, self.c_res, self.c_adm):
            r = cli.get(f'{API}/expedientes/{exp.id}/')
            _assert_nodo_restringido_minimo(self, r.data['documentos'][0])

    def test_documento_visible_comportamiento_normal(self):
        exp = self._expediente()
        d = self._doc(creado_por=self.gestor, asunto='A')
        ExpedienteDocumento.objects.create(expediente=exp, documento=d, agregado_por=self.responsable)
        r = self.c_ges.get(f'{API}/expedientes/{exp.id}/')
        nodo = r.data['documentos'][0]
        self.assertFalse(nodo['acceso_restringido'])
        self.assertEqual(nodo['documento'], d.id)
        self.assertEqual(nodo['documento_asunto'], 'A')
        self.assertEqual(nodo['agregado_por'], self.responsable.id)   # metadata de custodia OK en nodo visible

    def test_admin_ve_toda_la_metadata_documental(self):
        exp = self._expediente()
        d1 = self._doc(creado_por=self.gestor,      asunto='A')
        d2 = self._doc(creado_por=self.responsable, asunto='B')
        ExpedienteDocumento.objects.create(expediente=exp, documento=d1, agregado_por=self.responsable)
        ExpedienteDocumento.objects.create(expediente=exp, documento=d2, agregado_por=self.responsable)
        # RESPONSABLE_ARCHIVO y ADMIN_GENERAL: bypass F2-E ya establecido centralmente
        for cli in (self.c_res, self.c_adm):
            r = cli.get(f'{API}/expedientes/{exp.id}/')
            self.assertTrue(all(not d['acceso_restringido'] for d in r.data['documentos']))
            self.assertEqual({d['documento_asunto'] for d in r.data['documentos']}, {'A', 'B'})

    def test_relacion_no_concede_acceso_ni_a_documento_ni_a_tramite(self):
        exp = self._expediente()
        doc_oculto = self._doc(creado_por=self.responsable, asunto='SECRETO')
        ExpedienteDocumento.objects.create(expediente=exp, documento=doc_oculto, agregado_por=self.responsable)
        ExpedienteDocumento.objects.create(expediente=exp, tramite=self.tramite, agregado_por=self.responsable)
        # abrir el expediente NO abre el documento directo
        self.assertEqual(self.c_ges.get(f'/api/v1/documentos/{doc_oculto.id}/').status_code, 404)
        r = self.c_ges.get(f'{API}/expedientes/{exp.id}/')
        for nodo in r.data['documentos']:
            _assert_nodo_restringido_minimo(self, nodo)

    def test_num_documentos_lista_cuenta_total(self):
        # §4 — semántica documentada, SIN cambiar la política.
        exp = self._expediente()
        d1 = self._doc(creado_por=self.gestor)
        d2 = self._doc(creado_por=self.responsable)  # oculto para gestor
        ExpedienteDocumento.objects.create(expediente=exp, documento=d1, agregado_por=self.responsable)
        ExpedienteDocumento.objects.create(expediente=exp, documento=d2, agregado_por=self.responsable)
        lista = self.c_ges.get(f'{API}/expedientes/')
        fila = next(e for e in lista.data['results'] if e['id'] == exp.id)
        self.assertEqual(fila['num_documentos'], 2)   # total (incluye el restringido); no hay contador de "ocultos"


# ── §21 — agregar_documento: abierto + ACL ───────────────────────────────
class AgregarDocumentoTest(ArchivoBase):
    def test_expediente_abierto_documento_con_acl_ok(self):
        exp = self._expediente()
        d = self._doc(creado_por=self.gestor)
        r = self.c_ges.post(f'{API}/expedientes/{exp.id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(ExpedienteDocumento.objects.filter(expediente=exp, documento=d).exists())

    def test_expediente_cerrado_rechaza(self):
        exp = self._expediente(estado='cerrado')
        d = self._doc(creado_por=self.gestor)
        r = self.c_ges.post(f'{API}/expedientes/{exp.id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 409, r.data)
        self.assertFalse(ExpedienteDocumento.objects.filter(expediente=exp).exists())

    def test_documento_sin_acl_rechaza(self):
        exp = self._expediente()
        d = self._doc(creado_por=self.responsable)  # gestor no lo ve
        r = self.c_ges.post(f'{API}/expedientes/{exp.id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 404, r.data)
        self.assertFalse(ExpedienteDocumento.objects.filter(expediente=exp).exists())

    def test_sin_permiso_archivo_rechaza(self):
        exp = self._expediente()
        d = self._doc(creado_por=self.sin_perm)
        r = self.c_nop.post(f'{API}/expedientes/{exp.id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_ruta_agregar_documento_resuelve(self):
        from django.urls import resolve
        m = resolve('/api/v1/archivo/expedientes/1/agregar_documento/')
        self.assertEqual(m.func.cls.__name__, 'ExpedienteViewSet')

    def test_flujo_modal_expediente_existente(self):
        """Replica `VincularExpedienteModal.vincularMutation`:
        elegibles → seleccionar → agregar_documento."""
        exp = self._expediente()
        d = self._doc(creado_por=self.gestor)
        eleg = self.c_ges.get(f'{API}/expedientes/elegibles/')
        self.assertEqual(eleg.status_code, 200)
        self.assertIn(exp.id, [e['id'] for e in eleg.data])          # aparece como abierto
        r = self.c_ges.post(f'{API}/expedientes/{exp.id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 201, r.data)

    def test_flujo_modal_crear_expediente_nuevo(self):
        """Replica `VincularExpedienteModal.crearYVincularMutation`:
        POST crear → id de la respuesta → agregar_documento."""
        d = self._doc(creado_por=self.gestor)
        alta = self.c_ges.post(f'{API}/expedientes/', {
            'serie': self.serie.id, 'unidad': self.u.id,
            'titulo': 'Expediente nuevo desde modal', 'soporte': 'digital',
        }, format='json')
        self.assertEqual(alta.status_code, 201, alta.data)
        self.assertIn('id', alta.data)                               # el alta DEVUELVE id (fix G-13)
        self.assertTrue(alta.data.get('codigo_expediente'))
        nuevo_id = alta.data['id']
        r = self.c_ges.post(f'{API}/expedientes/{nuevo_id}/agregar_documento/',
                            {'documento_id': d.id}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(ExpedienteDocumento.objects.filter(expediente_id=nuevo_id, documento=d).exists())


# ── §22 — bloqueo de bypass de transiciones vía PATCH ────────────────────
class PatchBypassTest(ArchivoBase):
    def test_patch_estado_cerrado_es_ignorado(self):
        exp = self._expediente()  # abierto, sin expurgar ni foliar
        r = self.c_res.patch(f'{API}/expedientes/{exp.id}/',
                             {'estado': 'cerrado', 'fecha_cierre': '2026-01-01'}, format='json')
        self.assertEqual(r.status_code, 200)
        exp.refresh_from_db()
        self.assertEqual(exp.estado, 'abierto')      # NO se cerró
        self.assertIsNone(exp.fecha_cierre)

    def test_patch_no_reabre_expediente_cerrado(self):
        exp = self._expediente(estado='cerrado')
        self.c_res.patch(f'{API}/expedientes/{exp.id}/', {'estado': 'abierto'}, format='json')
        exp.refresh_from_db()
        self.assertEqual(exp.estado, 'cerrado')

    def test_patch_no_toca_expurgo_ni_foliacion_ni_categoria(self):
        exp = self._expediente()
        self.c_res.patch(f'{API}/expedientes/{exp.id}/', {
            'expurgado': True, 'fecha_expurgo': '2026-01-01',
            'foliado': True, 'fecha_foliacion': '2026-01-01',
            'categoria_actual': 'historico', 'num_fojas': 999,
        }, format='json')
        exp.refresh_from_db()
        self.assertFalse(exp.expurgado)
        self.assertFalse(exp.foliado)
        self.assertEqual(exp.categoria_actual, 'gestion')
        self.assertEqual(exp.num_fojas, 0)

    def test_patch_campos_ordinarios_si_funciona(self):
        exp = self._expediente()
        r = self.c_res.patch(f'{API}/expedientes/{exp.id}/', {
            'titulo': 'Título nuevo', 'descripcion': 'desc', 'ubicacion_fisica': 'Caja 3',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        exp.refresh_from_db()
        self.assertEqual(exp.titulo, 'Título nuevo')
        self.assertEqual(exp.ubicacion_fisica, 'Caja 3')

    def test_accion_cerrar_sigue_funcionando_con_su_gate(self):
        exp = self._expediente()
        # sin expurgar/foliar → la acción dedicada lo rechaza
        self.assertEqual(self.c_res.post(f'{API}/expedientes/{exp.id}/cerrar/').status_code, 400)
        self.c_res.post(f'{API}/expedientes/{exp.id}/expurgar/')
        self.c_res.post(f'{API}/expedientes/{exp.id}/foliar/')
        r = self.c_res.post(f'{API}/expedientes/{exp.id}/cerrar/')
        self.assertEqual(r.status_code, 200, r.data)
        exp.refresh_from_db()
        self.assertEqual(exp.estado, 'cerrado')
        self.assertIsNotNone(exp.fecha_cierre)
