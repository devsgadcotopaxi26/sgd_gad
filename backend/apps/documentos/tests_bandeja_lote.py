"""Acciones de lote sobre bandejas — Fase 2-A: reasignar_lote y comentar_lote.
Todo-o-nada; reutilizan la misma lógica de dominio que la acción individual."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento, SeguimientoDocumento
from . import numeracion


class BandejaLoteBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='Unidad Uno', siglas='U1', tipo='unidad')
        self.yo    = Usuario.objects.create_user(email='yo@t.local', nombres='Yo', apellidos='X', unidad=self.u)
        self.otro  = Usuario.objects.create_user(email='otro@t.local', nombres='Otro', apellidos='Y', unidad=self.u)
        self.tercero = Usuario.objects.create_user(email='ter@t.local', nombres='Ter', apellidos='Z', unidad=self.u)
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')
        self.client = APIClient()
        self.client.force_authenticate(user=self.yo)

    def _recibido(self, asunto='R', estado='enviado', usuario=None):
        usuario = usuario or self.yo
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.otro, anio=2026, estado=estado)
        numeracion.numero_provisional(d)
        d.save()
        BandejaDocumento.objects.create(documento=d, usuario=usuario, bandeja='recibidos')
        return d


class ReasignarLoteTestCase(BandejaLoteBase):
    URL = '/api/v1/documentos/bandeja/reasignar_lote/'

    def test_reasigna_todos(self):
        docs = [self._recibido(f'R{i}') for i in range(3)]
        r = self.client.post(self.URL, {
            'documentos': [d.id for d in docs], 'bandeja': 'recibidos',
            'usuario_id': self.otro.id, 'instrucciones': 'favor atender',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(r.data['reasignados']), sorted(d.id for d in docs))
        for d in docs:
            # ítem de origen marcado reasignado
            self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.yo).accion_tomada, 'reasignado')
            # ítem nuevo en recibidos del destino
            self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.otro, bandeja='recibidos').exists())
            self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='reasignado').exists())

    def test_un_solo_modal_una_sola_reasignacion(self):
        # 2 documentos → 1 request → 2 ítems nuevos, mismos parámetros
        docs = [self._recibido(f'R{i}') for i in range(2)]
        self.client.post(self.URL, {
            'documentos': [d.id for d in docs], 'bandeja': 'recibidos', 'usuario_id': self.tercero.id,
        }, format='json')
        nuevos = BandejaDocumento.objects.filter(usuario=self.tercero, bandeja='recibidos')
        self.assertEqual(nuevos.count(), 2)

    def test_sin_usuario_destino_rechaza(self):
        d = self._recibido()
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_todo_o_nada_documento_anulado(self):
        ok = self._recibido('ok')
        anulado = self._recibido('anulado', estado='anulado')
        r = self.client.post(self.URL, {
            'documentos': [ok.id, anulado.id], 'bandeja': 'recibidos', 'usuario_id': self.otro.id,
        }, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(any(e['documento_id'] == anulado.id for e in r.data['errores']))
        # el válido tampoco se reasignó
        self.assertEqual(BandejaDocumento.objects.get(documento=ok, usuario=self.yo).accion_tomada, 'pendiente')

    def test_todo_o_nada_documento_ajeno(self):
        mio = self._recibido('mio')
        ajeno = self._recibido('ajeno', usuario=self.tercero)  # está en la bandeja de tercero, no la mía
        r = self.client.post(self.URL, {
            'documentos': [mio.id, ajeno.id], 'bandeja': 'recibidos', 'usuario_id': self.otro.id,
        }, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(any(e['documento_id'] == ajeno.id for e in r.data['errores']))
        self.assertEqual(BandejaDocumento.objects.get(documento=mio, usuario=self.yo).accion_tomada, 'pendiente')

    def test_individual_sigue_funcionando(self):
        d = self._recibido()
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        r = self.client.post(f'/api/v1/documentos/bandeja/{item.id}/reasignar/', {
            'usuario_id': self.otro.id, 'instrucciones': 'x',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        item.refresh_from_db()
        self.assertEqual(item.accion_tomada, 'reasignado')
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.otro, bandeja='recibidos').exists())


class ComentarLoteTestCase(BandejaLoteBase):
    URL = '/api/v1/documentos/bandeja/comentar_lote/'

    def test_mismo_comentario_seguimiento_individual(self):
        docs = [self._recibido(f'R{i}') for i in range(3)]
        r = self.client.post(self.URL, {
            'documentos': [d.id for d in docs], 'bandeja': 'recibidos',
            'comentario': 'Se remite para conocimiento.',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        for d in docs:
            segs = SeguimientoDocumento.objects.filter(documento=d, etapa='comentado')
            self.assertEqual(segs.count(), 1)  # 1 registro POR documento
            self.assertEqual(segs.first().observacion, 'Se remite para conocimiento.')
            self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.yo).accion_tomada, 'comentado')

    def test_sin_comentario_rechaza(self):
        d = self._recibido()
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos', 'comentario': '   '}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(SeguimientoDocumento.objects.filter(documento=d, etapa='comentado').exists())

    def test_todo_o_nada_documento_ajeno(self):
        mio = self._recibido('mio')
        ajeno = self._recibido('ajeno', usuario=self.tercero)
        r = self.client.post(self.URL, {
            'documentos': [mio.id, ajeno.id], 'bandeja': 'recibidos', 'comentario': 'hola',
        }, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(SeguimientoDocumento.objects.filter(documento=mio, etapa='comentado').exists())

    def test_individual_sigue_funcionando(self):
        d = self._recibido()
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        r = self.client.post(f'/api/v1/documentos/bandeja/{item.id}/comentar/', {'comentario': 'ok'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='comentado', observacion='ok').exists())

    def test_comentar_lote_bandeja_virtual_reasignados(self):
        # 'reasignados' es virtual (accion_tomada='reasignado', físicamente en
        # 'en_elaboracion'): el lote debe resolverlo igual.
        d = Documento(tipo_documento=self.tipo, asunto='V', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.yo, anio=2026)
        numeracion.numero_provisional(d)
        d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.yo, bandeja='en_elaboracion',
                                        accion_tomada='reasignado')
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'reasignados',
                                        'comentario': 'nota'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='comentado', observacion='nota').exists())


class MarcarLeidoLoteTestCase(BandejaLoteBase):
    URL = '/api/v1/documentos/bandeja/marcar_leido_lote/'

    def test_marca_todos(self):
        docs = [self._recibido(f'R{i}') for i in range(3)]
        r = self.client.post(self.URL, {'documentos': [d.id for d in docs], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        for d in docs:
            it = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
            self.assertTrue(it.leido)
            self.assertIsNotNone(it.leido_en)

    def test_idempotente_no_corre_la_fecha(self):
        d = self._recibido()
        self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos'}, format='json')
        primera = BandejaDocumento.objects.get(documento=d, usuario=self.yo).leido_en
        self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos'}, format='json')
        segunda = BandejaDocumento.objects.get(documento=d, usuario=self.yo).leido_en
        self.assertEqual(primera, segunda)

    def test_todo_o_nada_documento_ajeno(self):
        mio = self._recibido('mio')
        ajeno = self._recibido('ajeno', usuario=self.tercero)
        r = self.client.post(self.URL, {'documentos': [mio.id, ajeno.id], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(BandejaDocumento.objects.get(documento=mio, usuario=self.yo).leido)

    def test_individual_sigue_funcionando(self):
        d = self._recibido()
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        r = self.client.post(f'/api/v1/documentos/bandeja/{item.id}/marcar_leido/', format='json')
        self.assertEqual(r.status_code, 200, r.data)
        item.refresh_from_db()
        self.assertTrue(item.leido)


class ArchivarLoteTestCase(BandejaLoteBase):
    URL = '/api/v1/documentos/bandeja/archivar_lote/'

    def _enviado(self, asunto='E'):
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.yo, anio=2026, estado='enviado')
        numeracion.numero_provisional(d)
        d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.yo, bandeja='enviados')
        return d

    def test_archiva_desde_recibidos(self):
        docs = [self._recibido(f'R{i}') for i in range(3)]
        r = self.client.post(self.URL, {'documentos': [d.id for d in docs], 'bandeja': 'recibidos',
                                        'observacion': 'fin de gestión'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        for d in docs:
            it = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
            self.assertEqual(it.bandeja, 'archivados')
            self.assertEqual(it.bandeja_origen, 'recibidos')       # origen preservado
            self.assertEqual(it.accion_tomada, 'pendiente')        # opción B: NO se toca accion_tomada
            seg = SeguimientoDocumento.objects.get(documento=d, etapa='archivado')
            self.assertEqual(seg.observacion, 'fin de gestión')

    def test_archiva_desde_enviados_guarda_origen(self):
        d = self._enviado()
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'enviados'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        it = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        self.assertEqual(it.bandeja, 'archivados')
        self.assertEqual(it.bandeja_origen, 'enviados')

    def test_no_sobrescribe_origen_existente(self):
        d = self._recibido()
        BandejaDocumento.objects.filter(documento=d, usuario=self.yo).update(bandeja_origen='enviados')
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 409)  # inconsistencia detectada, no se pisa

    def test_sin_observacion_ok(self):
        d = self._recibido()
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)  # observación OPCIONAL para archivar
        self.assertEqual(SeguimientoDocumento.objects.get(documento=d, etapa='archivado').observacion, '')

    def test_bandeja_no_permitida_rechaza(self):
        d = self._recibido()
        BandejaDocumento.objects.filter(documento=d, usuario=self.yo).update(bandeja='en_elaboracion')
        r = self.client.post(self.URL, {'documentos': [d.id], 'bandeja': 'en_elaboracion'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_todo_o_nada_ya_movido(self):
        ok = self._recibido('ok')
        movido = self._recibido('movido')
        BandejaDocumento.objects.filter(documento=movido, usuario=self.yo).update(bandeja='archivados')
        r = self.client.post(self.URL, {'documentos': [ok.id, movido.id], 'bandeja': 'recibidos'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertTrue(any(e['documento_id'] == movido.id for e in r.data['errores']))
        self.assertEqual(BandejaDocumento.objects.get(documento=ok, usuario=self.yo).bandeja, 'recibidos')

    def test_individual_sigue_funcionando(self):
        d = self._recibido()
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        r = self.client.post(f'/api/v1/documentos/bandeja/{item.id}/archivar/', {'observacion': 'x'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        item.refresh_from_db()
        self.assertEqual(item.bandeja, 'archivados')
        self.assertEqual(item.bandeja_origen, 'recibidos')


class RestaurarArchivadosTestCase(BandejaLoteBase):
    LOTE = '/api/v1/documentos/bandeja/restaurar_archivados/'

    def _archivado(self, asunto='A', origen='recibidos'):
        if origen == 'recibidos':
            d = self._recibido(asunto)
        else:
            d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                          unidad_origen=self.u, creado_por=self.yo, anio=2026, estado='enviado')
            numeracion.numero_provisional(d)
            d.save()
            BandejaDocumento.objects.create(documento=d, usuario=self.yo, bandeja='enviados')
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo)
        self.client.post(f'/api/v1/documentos/bandeja/{item.id}/archivar/', format='json')
        item.refresh_from_db()
        assert item.bandeja == 'archivados'
        return d, item

    def test_restaura_a_recibidos(self):
        d, it = self._archivado(origen='recibidos')
        r = self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        self.assertEqual(r.status_code, 200, r.data)
        it.refresh_from_db()
        self.assertEqual(it.bandeja, 'recibidos')
        self.assertIsNone(it.bandeja_origen)                       # NO es histórico
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='desarchivado').exists())

    def test_restaura_a_enviados(self):
        d, it = self._archivado(origen='enviados')
        r = self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        self.assertEqual(r.status_code, 200, r.data)
        it.refresh_from_db()
        self.assertEqual(it.bandeja, 'enviados')
        self.assertIsNone(it.bandeja_origen)

    def test_lote_mixto(self):
        a, ia = self._archivado('A', 'recibidos')
        b, ib = self._archivado('B', 'enviados')
        c, ic = self._archivado('C', 'recibidos')
        r = self.client.post(self.LOTE, {'documentos': [a.id, b.id, c.id], 'observacion': 'reactivar'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        ia.refresh_from_db(); ib.refresh_from_db(); ic.refresh_from_db()
        self.assertEqual(ia.bandeja, 'recibidos')
        self.assertEqual(ib.bandeja, 'enviados')
        self.assertEqual(ic.bandeja, 'recibidos')
        for d in (a, b, c):
            seg = SeguimientoDocumento.objects.get(documento=d, etapa='desarchivado')
            self.assertEqual(seg.observacion, 'reactivar')        # misma observación en cada uno

    def test_lote_todo_o_nada(self):
        a, ia = self._archivado('A', 'recibidos')
        b, ib = self._archivado('B', 'recibidos')
        ib.bandeja = 'recibidos'; ib.bandeja_origen = None; ib.save()   # b ya no está archivado
        r = self.client.post(self.LOTE, {'documentos': [a.id, b.id]}, format='json')
        self.assertEqual(r.status_code, 409)
        ia.refresh_from_db()
        self.assertEqual(ia.bandeja, 'archivados')                # el válido tampoco se restauró

    def test_restaurar_sin_origen_rechaza(self):
        d, it = self._archivado()
        BandejaDocumento.objects.filter(pk=it.id).update(bandeja_origen=None)
        r = self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        self.assertEqual(r.status_code, 409)
        it.refresh_from_db()
        self.assertEqual(it.bandeja, 'archivados')

    def test_usuario_ajeno_rechaza(self):
        d, it = self._archivado()
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        r = c2.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        self.assertIn(r.status_code, (403, 404))

    def test_ciclo_archivar_restaurar_archivar(self):
        d, it = self._archivado(origen='enviados')
        self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        it.refresh_from_db()
        self.assertEqual(it.bandeja, 'enviados')
        # archivar de nuevo → origen se vuelve a registrar
        r = self.client.post(f'/api/v1/documentos/bandeja/{it.id}/archivar/', format='json')
        self.assertEqual(r.status_code, 200, r.data)
        it.refresh_from_db()
        self.assertEqual(it.bandeja, 'archivados')
        self.assertEqual(it.bandeja_origen, 'enviados')

    def test_leido_preservado(self):
        d, it = self._archivado()
        BandejaDocumento.objects.filter(pk=it.id).update(leido=True)
        it.refresh_from_db()
        leido_en_antes = it.leido_en
        self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        it.refresh_from_db()
        self.assertTrue(it.leido)
        self.assertEqual(it.leido_en, leido_en_antes)

    def test_no_modifica_documento(self):
        d, it = self._archivado()
        estado_antes, cuerpo_antes = d.estado, d.cuerpo
        self.client.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        d.refresh_from_db()
        self.assertEqual((d.estado, d.cuerpo), (estado_antes, cuerpo_antes))

    def test_tareas_intactas_al_archivar(self):
        # un doc de Recibidos con una tarea pendiente asociada
        d = self._recibido()
        from .models import Tarea
        t = Tarea.objects.create(documento=d, asignada_por=self.yo, asignada_a=self.otro,
                                 descripcion='hacer algo', estado='pendiente')
        BandejaDocumento.objects.create(documento=d, usuario=self.otro, bandeja='tareas_recibidas')
        item = BandejaDocumento.objects.get(documento=d, usuario=self.yo, bandeja='recibidos')
        self.client.post(f'/api/v1/documentos/bandeja/{item.id}/archivar/', format='json')
        t.refresh_from_db()
        self.assertEqual(t.estado, 'pendiente')  # NO se cancela
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.otro,
                                                        bandeja='tareas_recibidas').exists())


class InformarTestCase(BandejaLoteBase):
    def test_informar_individual(self):
        d = self._recibido()
        r = self.client.post(f'/api/v1/documentos/{d.id}/informar/',
                             {'usuarios': [self.otro.id, self.tercero.id], 'comentario': 'Para su conocimiento'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(r.data['informados']), sorted([self.otro.id, self.tercero.id]))
        for u in (self.otro, self.tercero):
            it = BandejaDocumento.objects.get(documento=d, usuario=u, bandeja='informados')
            self.assertEqual(it.accion_tomada, 'informado')
            self.assertFalse(it.leido)
            self.assertTrue(Destinatario.objects.filter(documento=d, usuario=u, tipo='conocimiento').exists())
        # emisor conserva su ítem; no cambia responsable
        self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.yo).bandeja, 'recibidos')
        self.assertEqual(SeguimientoDocumento.objects.filter(documento=d, etapa='informado').count(), 1)

    def test_informar_idempotente(self):
        d = self._recibido()
        self.client.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.otro.id]}, format='json')
        r = self.client.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.otro.id, self.tercero.id]}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['informados'], [self.tercero.id])
        self.assertEqual(r.data['ya_informados'], [self.otro.id])
        self.assertEqual(BandejaDocumento.objects.filter(documento=d, usuario=self.otro, bandeja='informados').count(), 1)

    def test_informar_sin_acceso_rechaza(self):
        d = self._recibido(usuario=self.tercero)  # yo no participo
        r = self.client.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.otro.id]}, format='json')
        # ACL de lectura: `yo` no puede ni ver el documento → 404 (no revela
        # su existencia); antes era 403 por `_puede_informar`.
        self.assertIn(r.status_code, (403, 404))

    def test_informar_lote_mismos_usuarios_seguimiento_individual(self):
        docs = [self._recibido(f'R{i}') for i in range(3)]
        r = self.client.post('/api/v1/documentos/informar_lote/',
                             {'documentos': [d.id for d in docs], 'usuarios': [self.otro.id], 'comentario': 'cc'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        for d in docs:
            self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.otro, bandeja='informados').exists())
            self.assertEqual(SeguimientoDocumento.objects.filter(documento=d, etapa='informado').count(), 1)

    def test_informar_lote_todo_o_nada_sin_acceso(self):
        mio = self._recibido('mio')
        ajeno = self._recibido('ajeno', usuario=self.tercero)
        r = self.client.post('/api/v1/documentos/informar_lote/',
                             {'documentos': [mio.id, ajeno.id], 'usuarios': [self.otro.id]}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertFalse(BandejaDocumento.objects.filter(documento=mio, bandeja='informados').exists())

    def test_quitar_informado_no_borra_documento(self):
        d = self._recibido()
        self.client.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.otro.id]}, format='json')
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        it = BandejaDocumento.objects.get(documento=d, usuario=self.otro, bandeja='informados')
        r = c2.post(f'/api/v1/documentos/bandeja/{it.id}/quitar_informado/', format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertFalse(BandejaDocumento.objects.filter(pk=it.id).exists())
        self.assertTrue(Documento.objects.filter(pk=d.id).exists())          # el documento sigue
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.yo).exists())  # emisor intacto

    def test_quitar_informados_lote(self):
        docs = [self._recibido(f'R{i}') for i in range(2)]
        for d in docs:
            self.client.post(f'/api/v1/documentos/{d.id}/informar/', {'usuarios': [self.otro.id]}, format='json')
        c2 = APIClient(); c2.force_authenticate(user=self.otro)
        r = c2.post('/api/v1/documentos/bandeja/quitar_informados/',
                    {'documentos': [d.id for d in docs]}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(BandejaDocumento.objects.filter(usuario=self.otro, bandeja='informados').count(), 0)
        for d in docs:
            self.assertTrue(Documento.objects.filter(pk=d.id).exists())
