"""Envío de borradores "En elaboración" a la papelera — individual y masivo (PAP-01…10)."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento, SeguimientoDocumento
from . import numeracion


class PapeleraTestCase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='Unidad Uno', siglas='U1', tipo='unidad')
        self.u2 = Unidad.objects.create(nivel=nivel, codigo='U2', nombre='Unidad Dos', siglas='U2', tipo='unidad')
        self.creador = Usuario.objects.create_user(email='c@t.local', nombres='C', apellidos='Uno', unidad=self.u)
        self.otro    = Usuario.objects.create_user(email='o@t.local', nombres='O', apellidos='Dos', unidad=self.u2)
        self.tipo = TipoDocumento.objects.create(codigo='MEM', nombre='Memorando', prefijo_numeracion='MEM')
        self.client = APIClient()
        self.client.force_authenticate(user=self.creador)

    def _borrador(self, creador=None, asunto='B'):
        creador = creador or self.creador
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=creador.unidad, creado_por=creador, anio=2026)
        numeracion.numero_provisional(d)
        d.save()
        Destinatario.objects.create(documento=d, usuario=self.otro, unidad=self.u2, tipo='principal')
        BandejaDocumento.objects.create(documento=d, usuario=creador, bandeja='en_elaboracion')
        return d

    # PAP-01 — individual
    def test_individual_a_papelera(self):
        d = self._borrador()
        r = self.client.post(f'/api/v1/documentos/{d.id}/eliminar_borrador/', {'comentario': 'ya no sirve'})
        self.assertEqual(r.status_code, 200, r.data)
        d.refresh_from_db()
        self.assertIsNotNone(d.eliminado_en)
        self.assertEqual(d.eliminado_por_id, self.creador.id)
        it = BandejaDocumento.objects.get(documento=d)
        self.assertEqual(it.bandeja, 'eliminados')
        self.assertTrue(Documento.objects.filter(pk=d.id).exists())          # no borrado físico
        self.assertEqual(d.destinatarios.count(), 1)                         # anexos/destinatarios intactos
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='eliminado').exists())

    # Trazabilidad — el TEXTO EXACTO del comentario queda en el seguimiento
    def test_comentario_exacto_en_seguimiento_papelera(self):
        txt = 'Se elimina porque el trámite fue anulado por el solicitante.'
        d = self._borrador()
        self.client.post(f'/api/v1/documentos/{d.id}/eliminar_borrador/', {'comentario': f'  {txt}  '})
        seg = SeguimientoDocumento.objects.get(documento=d, etapa='eliminado')
        self.assertEqual(seg.observacion, txt)          # texto exacto (trim)
        self.assertEqual(seg.usuario_id, self.creador.id)
        self.assertIsNotNone(seg.creado_en)
        d.refresh_from_db()
        self.assertEqual(d.motivo_eliminacion, txt)
        self.assertEqual(d.eliminado_por_id, self.creador.id)

    def test_comentario_exacto_en_seguimiento_papelera_masivo(self):
        txt = 'Limpieza de borradores duplicados del período.'
        docs = [self._borrador(asunto=f'B{i}') for i in range(3)]
        self.client.post('/api/v1/documentos/enviar_papelera/',
                         {'documentos': [x.id for x in docs], 'comentario': txt}, format='json')
        for d in docs:
            seg = SeguimientoDocumento.objects.get(documento=d, etapa='eliminado')
            self.assertEqual(seg.observacion, txt)      # MISMO texto en CADA documento
            self.assertEqual(seg.usuario_id, self.creador.id)

    # PAP-01 sin comentario -> 400
    def test_sin_comentario_rechaza(self):
        d = self._borrador()
        r = self.client.post(f'/api/v1/documentos/{d.id}/eliminar_borrador/', {})
        self.assertEqual(r.status_code, 400)
        d.refresh_from_db()
        self.assertIsNone(d.eliminado_en)

    # PAP-03 — masivo 3
    def test_masivo_3(self):
        docs = [self._borrador(asunto=f'B{i}') for i in range(3)]
        r = self.client.post('/api/v1/documentos/enviar_papelera/',
                             {'documentos': [d.id for d in docs], 'comentario': 'limpieza'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(r.data['movidos']), sorted(d.id for d in docs))
        for d in docs:
            d.refresh_from_db()
            self.assertIsNotNone(d.eliminado_en)
            self.assertEqual(BandejaDocumento.objects.get(documento=d).bandeja, 'eliminados')

    # PAP-04 — restaurar
    def test_restaurar(self):
        d = self._borrador()
        self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        r = self.client.post(f'/api/v1/documentos/{d.id}/restaurar_eliminado/', {'comentario': 'lo necesito'})
        self.assertEqual(r.status_code, 200, r.data)
        d.refresh_from_db()
        self.assertIsNone(d.eliminado_en)
        self.assertEqual(d.estado, 'borrador')
        self.assertEqual(BandejaDocumento.objects.get(documento=d).bandeja, 'en_elaboracion')
        self.assertEqual(d.destinatarios.count(), 1)
        self.assertEqual(d.cuerpo, '<p>c</p>')
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='restaurado').exists())

    # PAP-05 — usuario que reasignó ya no puede
    def test_reasignado_usuario_anterior_no_puede(self):
        d = self._borrador()
        self.client.post(f'/api/v1/documentos/{d.id}/reasignar_a/', {'usuario_id': self.otro.id}, format='json')
        r = self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertIn('responsabilidad', r.data['errores'][0]['detalle'])
        d.refresh_from_db()
        self.assertIsNone(d.eliminado_en)

    # PAP-06 — responsable actual sí puede
    def test_reasignado_responsable_actual_si_puede(self):
        d = self._borrador()
        self.client.post(f'/api/v1/documentos/{d.id}/reasignar_a/', {'usuario_id': self.otro.id}, format='json')
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        r = c2.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'ok'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        d.refresh_from_db()
        self.assertIsNotNone(d.eliminado_en)

    # PAP-07 — documento enviado no entra por esta operación
    def test_enviado_no_entra(self):
        d = self._borrador()
        self.client.post(f'/api/v1/documentos/{d.id}/enviar/')
        d.refresh_from_db()
        self.assertEqual(d.estado, 'enviado')
        r = self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        d.refresh_from_db()
        self.assertIsNone(d.eliminado_en)

    # §10 — todo-o-nada: 1 válido + 1 inválido -> ninguno se mueve
    def test_todo_o_nada(self):
        ok = self._borrador(asunto='ok')
        malo = self._borrador(asunto='malo')
        self.client.post(f'/api/v1/documentos/{malo.id}/enviar/')     # malo -> enviado
        r = self.client.post('/api/v1/documentos/enviar_papelera/',
                             {'documentos': [ok.id, malo.id], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        ok.refresh_from_db()
        self.assertIsNone(ok.eliminado_en)                           # el válido tampoco se movió

    # PAP-10 — lista vacía
    def test_lista_vacia(self):
        r = self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 400)

    # ── Consistencia bandejas activas vs papelera ──────────────────────────
    def _bandeja_ids(self, cliente, bandeja):
        r = cliente.get('/api/v1/documentos/bandeja/por_bandeja/', {'bandeja': bandeja})
        return [x['documento_id'] for x in r.data['results']], r.data['count']

    def _conteo(self, cliente, bandeja):
        return cliente.get('/api/v1/documentos/bandeja/conteos/').data[bandeja]['total']

    # PAP-CONS-01/02/03 — un documento en papelera NO aparece en En Elaboración
    def test_eliminado_fuera_de_bandejas_activas(self):
        d = self._borrador()
        self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        elab_ids, elab_n = self._bandeja_ids(self.client, 'en_elaboracion')
        elim_ids, _      = self._bandeja_ids(self.client, 'eliminados')
        self.assertNotIn(d.id, elab_ids)                     # PAP-CONS-02
        self.assertIn(d.id, elim_ids)                        # PAP-CONS-03
        self.assertEqual(elab_n, self._conteo(self.client, 'en_elaboracion'))   # PAP-CONS-05

    # PAP-CONS-05 — contadores no cuentan el mismo doc en dos bandejas
    def test_contadores_sin_doble_conteo(self):
        d = self._borrador()
        c_elab_0 = self._conteo(self.client, 'en_elaboracion')
        c_elim_0 = self._conteo(self.client, 'eliminados')
        self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        self.assertEqual(self._conteo(self.client, 'en_elaboracion'), c_elab_0 - 1)
        self.assertEqual(self._conteo(self.client, 'eliminados'), c_elim_0 + 1)

    # doc creado por A con remitente/DE B → 2 ítems 'en_elaboracion'.
    # Enviar a papelera debe sacarlo de AMBAS bandejas.
    def test_creador_y_de_ambos_pierden_el_documento(self):
        d = Documento(tipo_documento=self.tipo, asunto='DE', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.creador, anio=2026,
                      remitente=self.otro)
        numeracion.numero_provisional(d)
        d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.creador, bandeja='en_elaboracion')
        BandejaDocumento.objects.create(documento=d, usuario=self.otro, bandeja='en_elaboracion')
        self.assertEqual(BandejaDocumento.objects.filter(documento=d, bandeja='en_elaboracion').count(), 2)

        self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        d.refresh_from_db()
        self.assertIsNotNone(d.eliminado_en)
        # TODOS los ítems activos movidos a 'eliminados'
        self.assertEqual(BandejaDocumento.objects.filter(documento=d, bandeja='en_elaboracion').count(), 0)
        self.assertEqual(BandejaDocumento.objects.filter(documento=d, bandeja='eliminados').count(), 2)
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        elab_ids, _ = self._bandeja_ids(c2, 'en_elaboracion')
        self.assertNotIn(d.id, elab_ids)

    # PAP-CONS-04 — restaurar devuelve el doc a En Elaboración y lo saca de Eliminados
    def test_restaurar_consistente(self):
        d = self._borrador()
        self.client.post('/api/v1/documentos/enviar_papelera/', {'documentos': [d.id], 'comentario': 'x'}, format='json')
        self.client.post(f'/api/v1/documentos/{d.id}/restaurar_eliminado/', {'comentario': 'vuelve'})
        elab_ids, _ = self._bandeja_ids(self.client, 'en_elaboracion')
        elim_ids, _ = self._bandeja_ids(self.client, 'eliminados')
        self.assertIn(d.id, elab_ids)
        self.assertNotIn(d.id, elim_ids)
        self.assertEqual(BandejaDocumento.objects.filter(documento=d).exclude(bandeja='en_elaboracion').count(), 0)


class RestaurarMasivoTestCase(TestCase):
    """Restauración MASIVA desde la selección de "Eliminados" (todo-o-nada)."""

    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='Unidad Uno', siglas='U1', tipo='unidad')
        self.u2 = Unidad.objects.create(nivel=nivel, codigo='U2', nombre='Unidad Dos', siglas='U2', tipo='unidad')
        self.creador = Usuario.objects.create_user(email='c@t.local', nombres='C', apellidos='Uno', unidad=self.u)
        self.otro    = Usuario.objects.create_user(email='o@t.local', nombres='O', apellidos='Dos', unidad=self.u2)
        self.tipo = TipoDocumento.objects.create(codigo='MEM', nombre='Memorando', prefijo_numeracion='MEM')
        self.client = APIClient()
        self.client.force_authenticate(user=self.creador)

    def _en_papelera(self, asunto='B'):
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.creador.unidad, creado_por=self.creador, anio=2026)
        numeracion.numero_provisional(d)
        d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.creador, bandeja='en_elaboracion')
        r = self.client.post('/api/v1/documentos/enviar_papelera/',
                             {'documentos': [d.id], 'comentario': 'a papelera'}, format='json')
        assert r.status_code == 200, r.data
        d.refresh_from_db()
        return d

    def test_masivo_restaura_todos(self):
        docs = [self._en_papelera(f'B{i}') for i in range(3)]
        r = self.client.post('/api/v1/documentos/restaurar_eliminados/',
                             {'documentos': [d.id for d in docs], 'comentario': 'los necesito'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(r.data['restaurados']), sorted(d.id for d in docs))
        for d in docs:
            d.refresh_from_db()
            self.assertIsNone(d.eliminado_en)
            self.assertEqual(d.estado, 'borrador')
            self.assertEqual(BandejaDocumento.objects.get(documento=d).bandeja, 'en_elaboracion')
            self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='restaurado').exists())

    def test_masivo_sin_comentario_rechaza(self):
        d = self._en_papelera()
        r = self.client.post('/api/v1/documentos/restaurar_eliminados/',
                             {'documentos': [d.id], 'comentario': '  '}, format='json')
        self.assertEqual(r.status_code, 400)
        d.refresh_from_db()
        self.assertIsNotNone(d.eliminado_en)

    def test_masivo_lista_vacia_rechaza(self):
        r = self.client.post('/api/v1/documentos/restaurar_eliminados/',
                             {'documentos': [], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_masivo_todo_o_nada(self):
        # uno en papelera + uno que NO está en papelera → 409, ninguno se restaura
        ok = self._en_papelera('ok')
        fuera = Documento(tipo_documento=self.tipo, asunto='fuera', cuerpo='<p>c</p>',
                          unidad_origen=self.u, creado_por=self.creador, anio=2026)
        numeracion.numero_provisional(fuera)
        fuera.save()
        BandejaDocumento.objects.create(documento=fuera, usuario=self.creador, bandeja='en_elaboracion')
        r = self.client.post('/api/v1/documentos/restaurar_eliminados/',
                             {'documentos': [ok.id, fuera.id], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(any(e['documento_id'] == fuera.id for e in r.data['errores']))
        ok.refresh_from_db()
        self.assertIsNotNone(ok.eliminado_en)  # el válido tampoco se movió

    def test_masivo_sin_permiso_rechaza(self):
        # `otro` no tiene el documento en su papelera ni es admin → 409 todo-o-nada
        d = self._en_papelera()
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        r = c2.post('/api/v1/documentos/restaurar_eliminados/',
                    {'documentos': [d.id], 'comentario': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        d.refresh_from_db()
        self.assertIsNotNone(d.eliminado_en)

    def test_individual_sigue_funcionando(self):
        # el refactor a servicios_bandeja no rompe la acción individual
        d = self._en_papelera()
        r = self.client.post(f'/api/v1/documentos/{d.id}/restaurar_eliminado/', {'comentario': 'vuelve'})
        self.assertEqual(r.status_code, 200, r.data)
        d.refresh_from_db()
        self.assertIsNone(d.eliminado_en)
        self.assertEqual(d.estado, 'borrador')

    # Trazabilidad — el TEXTO EXACTO del comentario queda en cada seguimiento
    def test_comentario_exacto_en_seguimiento_restaurar_individual(self):
        txt = 'Se restaura porque corresponde continuar con la elaboración.'
        d = self._en_papelera()
        self.client.post(f'/api/v1/documentos/{d.id}/restaurar_eliminado/', {'comentario': f'  {txt} '})
        seg = SeguimientoDocumento.objects.get(documento=d, etapa='restaurado')
        self.assertEqual(seg.observacion, txt)
        self.assertEqual(seg.usuario_id, self.creador.id)
        self.assertIsNotNone(seg.creado_en)

    def test_comentario_exacto_en_seguimiento_restaurar_masivo(self):
        txt = 'Se restaura porque corresponde continuar con la elaboración.'
        docs = [self._en_papelera(f'B{i}') for i in range(3)]
        self.client.post('/api/v1/documentos/restaurar_eliminados/',
                         {'documentos': [x.id for x in docs], 'comentario': txt}, format='json')
        for d in docs:
            seg = SeguimientoDocumento.objects.get(documento=d, etapa='restaurado')
            self.assertEqual(seg.observacion, txt)      # MISMO texto en CADA documento
            self.assertEqual(seg.usuario_id, self.creador.id)
            self.assertIsNotNone(seg.creado_en)

    def test_restaurar_masivo_sin_comentario_rechaza_y_no_toca_nada(self):
        docs = [self._en_papelera(f'B{i}') for i in range(2)]
        r = self.client.post('/api/v1/documentos/restaurar_eliminados/',
                             {'documentos': [x.id for x in docs], 'comentario': ''}, format='json')
        self.assertEqual(r.status_code, 400)
        for d in docs:
            d.refresh_from_db()
            self.assertIsNotNone(d.eliminado_en)
            self.assertFalse(SeguimientoDocumento.objects.filter(documento=d, etapa='restaurado').exists())
