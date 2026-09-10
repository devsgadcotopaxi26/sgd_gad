"""Ciclo de vida de Tarea (F2-D) — crear · iniciar · completar · cancelar."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Documento, TipoDocumento, Tarea, SeguimientoDocumento
from . import numeracion


class TareaBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='U1', siglas='U1', tipo='unidad')
        self.creador = Usuario.objects.create_user(email='c@t.local', nombres='C', apellidos='Uno', unidad=self.u)
        self.asig    = Usuario.objects.create_user(email='a@t.local', nombres='A', apellidos='Dos', unidad=self.u)
        self.otro    = Usuario.objects.create_user(email='o@t.local', nombres='O', apellidos='Tres', unidad=self.u)
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')
        self.cli = APIClient(); self.cli.force_authenticate(self.creador)
        self.cli_a = APIClient(); self.cli_a.force_authenticate(self.asig)

    def _doc_en_recibidos(self):
        d = Documento(tipo_documento=self.tipo, asunto='x', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.creador, anio=2026, estado='enviado')
        numeracion.numero_provisional(d); d.save()
        b = BandejaDocumento.objects.create(documento=d, usuario=self.creador, bandeja='recibidos')
        return d, b

    def _crear_tarea(self, **over):
        d, b = self._doc_en_recibidos()
        payload = {'usuario_id': self.asig.id, 'descripcion': 'Preparar informe técnico', 'prioridad': 'normal'}
        payload.update(over)
        r = self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/', payload, format='json')
        assert r.status_code == 200, r.data
        return d, Tarea.objects.get(pk=r.data['tarea_id'])


class CrearTareaTestCase(TareaBase):
    def test_crea_tarea_y_bandejas(self):
        d, t = self._crear_tarea()
        self.assertEqual(t.estado, 'pendiente')
        self.assertEqual(t.asignada_por_id, self.creador.id)
        self.assertEqual(t.asignada_a_id, self.asig.id)
        # receptor la ve en Tareas Recibidas; creador en Tareas Enviadas
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').exists())
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.creador, bandeja='tareas_enviadas').exists())
        # rastro
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='tarea_creada').exists())
        # NO cambia el responsable / estado del documento
        d.refresh_from_db(); self.assertEqual(d.estado, 'enviado')

    def test_descripcion_obligatoria(self):
        d, b = self._doc_en_recibidos()
        r = self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/',
                          {'usuario_id': self.asig.id, 'descripcion': '  '}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_no_autoasignacion(self):
        d, b = self._doc_en_recibidos()
        r = self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/',
                          {'usuario_id': self.creador.id, 'descripcion': 'algo'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_varias_tareas_mismo_doc_mismo_usuario(self):
        d, t1 = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        r = self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/',
                          {'usuario_id': self.asig.id, 'descripcion': 'segunda tarea'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Tarea.objects.filter(documento=d, asignada_a=self.asig).count(), 2)
        # un único ítem de bandeja Tareas Recibidas para las dos tareas
        self.assertEqual(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').count(), 1)


class CicloTareaTestCase(TareaBase):
    def test_iniciar_completar(self):
        d, t = self._crear_tarea()
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/iniciar/')
        self.assertEqual(r.status_code, 200, r.data)
        t.refresh_from_db(); self.assertEqual(t.estado, 'en_proceso')
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'Informe elaborado y adjuntado.'})
        self.assertEqual(r.status_code, 200, r.data)
        t.refresh_from_db()
        self.assertEqual(t.estado, 'completada')
        self.assertEqual(t.respuesta, 'Informe elaborado y adjuntado.')
        self.assertIsNotNone(t.completada_en)
        # ambos ven el nuevo estado (creador consulta rol=enviadas)
        self.assertEqual(self.cli.get(f'/api/v1/documentos/tareas/{t.id}/').data['estado'], 'completada')
        # el asignado ya no tiene tareas activas → sale de su Tareas Recibidas
        self.assertFalse(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').exists())
        # el creador conserva Tareas Enviadas
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.creador, bandeja='tareas_enviadas').exists())
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='tarea_completada').exists())

    def test_completar_sin_respuesta_rechaza(self):
        d, t = self._crear_tarea()
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': '  '})
        self.assertEqual(r.status_code, 400)
        t.refresh_from_db(); self.assertEqual(t.estado, 'pendiente')

    def test_completar_directo_sin_iniciar(self):
        d, t = self._crear_tarea()
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'hecho'})
        self.assertEqual(r.status_code, 200, r.data)

    def test_solo_asignado_inicia_completa(self):
        d, t = self._crear_tarea()
        self.assertIn(self.cli.post(f'/api/v1/documentos/tareas/{t.id}/iniciar/').status_code, (403,))
        self.assertIn(self.cli.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'x'}).status_code, (403,))

    def test_solo_creador_cancela(self):
        d, t = self._crear_tarea()
        self.assertEqual(self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/cancelar/').status_code, 403)
        r = self.cli.post(f'/api/v1/documentos/tareas/{t.id}/cancelar/', {'motivo': 'ya no aplica'})
        self.assertEqual(r.status_code, 200, r.data)
        t.refresh_from_db(); self.assertEqual(t.estado, 'cancelada')
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=d, etapa='tarea_cancelada').exists())

    def test_doble_completar_rechaza(self):
        d, t = self._crear_tarea()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'hecho'})
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'otra vez'})
        self.assertEqual(r.status_code, 409)

    def test_iniciar_completada_rechaza(self):
        d, t = self._crear_tarea()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'hecho'})
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/iniciar/')
        self.assertEqual(r.status_code, 409)

    def test_cancelar_completada_rechaza(self):
        d, t = self._crear_tarea()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'hecho'})
        r = self.cli.post(f'/api/v1/documentos/tareas/{t.id}/cancelar/')
        self.assertEqual(r.status_code, 409)

    def test_usuario_ajeno_no_ve_ni_actua(self):
        d, t = self._crear_tarea()
        c = APIClient(); c.force_authenticate(self.otro)
        self.assertEqual(c.get(f'/api/v1/documentos/tareas/{t.id}/').status_code, 404)
        self.assertEqual(c.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'x'}).status_code, 404)

    def test_fecha_limite_preservada(self):
        d, t = self._crear_tarea(fecha_limite='2026-12-31')
        self.assertEqual(str(t.fecha_limite), '2026-12-31')
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/iniciar/')
        t.refresh_from_db(); self.assertEqual(str(t.fecha_limite), '2026-12-31')

    def test_varias_tareas_no_confunden_ids(self):
        d, t1 = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/',
                      {'usuario_id': self.asig.id, 'descripcion': 't2'}, format='json')
        t2 = Tarea.objects.filter(documento=d).exclude(pk=t1.id).get()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t1.id}/completar/', {'respuesta': 'solo la 1'})
        t1.refresh_from_db(); t2.refresh_from_db()
        self.assertEqual(t1.estado, 'completada')
        self.assertEqual(t2.estado, 'pendiente')
        # t2 sigue activa → el ítem Tareas Recibidas permanece
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').exists())

    def test_listar_por_documento_y_rol(self):
        d, t = self._crear_tarea()
        r = self.cli_a.get('/api/v1/documentos/tareas/', {'documento': d.id, 'rol': 'recibidas'})
        self.assertEqual(len(r.data['results']), 1)
        r = self.cli.get('/api/v1/documentos/tareas/', {'documento': d.id, 'rol': 'enviadas'})
        self.assertEqual(len(r.data['results']), 1)


class SeguimientoTareaFKTestCase(TareaBase):
    """SeguimientoDocumento.tarea — relación estructurada evento ↔ tarea."""

    def test_ciclo_completo_apunta_a_la_misma_tarea(self):
        d, t = self._crear_tarea()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/iniciar/')
        self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'ok'})
        segs = SeguimientoDocumento.objects.filter(documento=d, etapa__startswith='tarea_')
        self.assertEqual(segs.count(), 3)
        for s in segs:
            self.assertEqual(s.tarea_id, t.id)
        self.assertEqual(
            set(segs.values_list('etapa', flat=True)),
            {'tarea_creada', 'tarea_iniciada', 'tarea_completada'},
        )

    def test_cancelar_apunta_a_la_tarea(self):
        d, t = self._crear_tarea()
        self.cli.post(f'/api/v1/documentos/tareas/{t.id}/cancelar/', {'motivo': 'x'})
        s = SeguimientoDocumento.objects.get(documento=d, etapa='tarea_cancelada')
        self.assertEqual(s.tarea_id, t.id)

    def test_dos_tareas_mismo_doc_no_se_confunden(self):
        d, t1 = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/nueva_tarea/',
                      {'usuario_id': self.asig.id, 'descripcion': 'Revisar informe jurídico'}, format='json')
        t2 = Tarea.objects.filter(documento=d).exclude(pk=t1.id).get()
        self.cli_a.post(f'/api/v1/documentos/tareas/{t1.id}/completar/', {'respuesta': 'r1'})
        self.cli_a.post(f'/api/v1/documentos/tareas/{t2.id}/completar/', {'respuesta': 'r2'})
        comp = SeguimientoDocumento.objects.filter(documento=d, etapa='tarea_completada')
        self.assertEqual(comp.count(), 2)
        self.assertEqual(
            {s.tarea_id for s in comp}, {t1.id, t2.id},   # cada evento -> su tarea
        )

    def test_borrar_tarea_conserva_seguimiento(self):
        d, t = self._crear_tarea()
        tid = t.id
        Tarea.objects.filter(pk=tid).delete()             # SET_NULL, no cascade
        s = SeguimientoDocumento.objects.filter(documento=d, etapa='tarea_creada')
        self.assertTrue(s.exists())
        self.assertIsNone(s.first().tarea_id)             # relación anulada, evento vivo

    def test_seguimientos_no_tarea_intactos(self):
        d, t = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/comentar/', {'comentario': 'nota suelta'}, format='json')
        s = SeguimientoDocumento.objects.get(documento=d, etapa='comentado')
        self.assertIsNone(s.tarea_id)                     # un comentario normal no lleva tarea

    def test_recorrido_expone_tarea_id_y_descripcion(self):
        d, t = self._crear_tarea()
        det = self.cli.get(f'/api/v1/documentos/{d.id}/').data
        eventos = [e for e in det['seguimiento'] if e['etapa'] == 'tarea_creada']
        self.assertEqual(len(eventos), 1)
        self.assertEqual(eventos[0]['tarea'], t.id)
        self.assertEqual(eventos[0]['tarea_descripcion'], t.descripcion)


class InteraccionesTareaTestCase(TareaBase):
    def test_archivar_no_afecta_tarea(self):
        d, t = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/archivar/', format='json')
        t.refresh_from_db(); self.assertEqual(t.estado, 'pendiente')
        # el asignado sigue pudiendo completarla
        r = self.cli_a.post(f'/api/v1/documentos/tareas/{t.id}/completar/', {'respuesta': 'hecho pese al archivado'})
        self.assertEqual(r.status_code, 200, r.data)

    def test_reasignar_no_cancela_tarea(self):
        d, t = self._crear_tarea()
        b = BandejaDocumento.objects.get(documento=d, usuario=self.creador, bandeja='recibidos')
        self.cli.post(f'/api/v1/documentos/bandeja/{b.id}/reasignar/', {'usuario_id': self.otro.id}, format='json')
        t.refresh_from_db(); self.assertEqual(t.estado, 'pendiente')
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').exists())

    def test_papelera_no_arrastra_bandejas_de_tareas(self):
        # borrador en elaboración con tarea → a papelera → restaurar
        d = Documento(tipo_documento=self.tipo, asunto='b', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.creador, anio=2026)
        numeracion.numero_provisional(d); d.save()
        be = BandejaDocumento.objects.create(documento=d, usuario=self.creador, bandeja='en_elaboracion')
        self.cli.post(f'/api/v1/documentos/bandeja/{be.id}/nueva_tarea/',
                      {'usuario_id': self.asig.id, 'descripcion': 'tarea en borrador'}, format='json')
        self.cli.post('/api/v1/documentos/enviar_papelera/',
                      {'documentos': [d.id], 'comentario': 'x'}, format='json')
        # los ítems de tareas NO se movieron a 'eliminados'
        self.assertEqual(BandejaDocumento.objects.get(documento=d, usuario=self.asig, bandeja='tareas_recibidas').bandeja, 'tareas_recibidas')
        self.cli.post(f'/api/v1/documentos/{d.id}/restaurar_eliminado/', {'comentario': 'vuelve'})
        # tras restaurar, el ítem de tarea sigue correcto
        self.assertTrue(BandejaDocumento.objects.filter(documento=d, usuario=self.asig, bandeja='tareas_recibidas').exists())
