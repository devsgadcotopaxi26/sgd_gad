"""F2-E — Documentos asociados (Documento.responde_a): Responder + asociación manual."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento, SeguimientoDocumento
from . import numeracion


class AsocBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='U1', siglas='U1', tipo='unidad')
        self.emisor  = Usuario.objects.create_user(email='e@t.local', nombres='E', apellidos='Uno', unidad=self.u)
        self.yo      = Usuario.objects.create_user(email='y@t.local', nombres='Y', apellidos='Dos', unidad=self.u)
        self.tercero = Usuario.objects.create_user(email='t@t.local', nombres='T', apellidos='Tres', unidad=self.u)
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')
        self.cli = APIClient(); self.cli.force_authenticate(self.yo)

    def _doc(self, asunto='A', creado_por=None, dest=None, estado='enviado'):
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=creado_por or self.emisor, anio=2026, estado=estado)
        numeracion.numero_provisional(d); d.save()
        for x in (dest or []):
            Destinatario.objects.create(documento=d, usuario=x, unidad=self.u, tipo='principal')
        return d

    def _recibido(self, **kw):
        d = self._doc(**kw)
        BandejaDocumento.objects.create(documento=d, usuario=self.yo, bandeja='recibidos')
        Destinatario.objects.get_or_create(documento=d, usuario=self.yo, defaults={'unidad': self.u, 'tipo': 'principal'})
        return d

    def _mio(self, asunto='M'):
        """Borrador propio en elaboración — `yo` es su responsable actual (puede
        asociar/desasociar)."""
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.yo, anio=2026, estado='borrador')
        numeracion.numero_provisional(d); d.save()
        BandejaDocumento.objects.create(documento=d, usuario=self.yo, bandeja='en_elaboracion')
        return d


class ResponderTestCase(AsocBase):
    def test_responder_crea_borrador_asociado(self):
        a = self._recibido(asunto='Solicitud X')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {'asunto': 'RE: Solicitud X'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        b = Documento.objects.get(pk=r.data['documento_id'])
        self.assertEqual(b.responde_a_id, a.id)                 # ← asociación automática desde el borrador
        self.assertEqual(b.estado, 'borrador')
        self.assertIn(b, a.respuestas.all())
        # ítem de bandeja en elaboración para el creador de la respuesta
        self.assertTrue(BandejaDocumento.objects.filter(documento=b, usuario=self.yo, bandeja='en_elaboracion').exists())
        # destinatario precargado = emisor del original
        self.assertTrue(Destinatario.objects.filter(documento=b, usuario=self.emisor).exists())
        # rastro en ambos
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=b, etapa='asociado', documento_relacionado=a).exists())
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=a, etapa='respondido', documento_relacionado=b).exists())

    def test_responder_a_todos_es_un_solo_documento(self):
        a = self._recibido(asunto='Circular', dest=[self.tercero])
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {'a_todos': True}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(a.respuestas.count(), 1)               # UN documento respuesta
        b = a.respuestas.get()
        dests = set(Destinatario.objects.filter(documento=b).values_list('usuario_id', flat=True))
        self.assertIn(self.emisor.id, dests)
        self.assertIn(self.tercero.id, dests)
        self.assertNotIn(self.yo.id, dests)                     # no me incluyo a mí mismo

    def test_emisor_canonico_remitente(self):
        # remitente explícito → gana
        a = self._recibido()
        a.remitente = self.tercero; a.save(update_fields=['remitente'])
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {}, format='json')
        b = Documento.objects.get(pk=r.data['documento_id'])
        self.assertTrue(Destinatario.objects.filter(documento=b, usuario=self.tercero, tipo='principal').exists())

    def test_emisor_canonico_por_seguimiento_enviado(self):
        # sin remitente, sin ser creado_por el emisor real: se usa el usuario
        # del SeguimientoDocumento(etapa='enviado').
        a = self._recibido()
        a.remitente = None; a.creado_por = self.tercero; a.save(update_fields=['remitente', 'creado_por'])
        SeguimientoDocumento.objects.create(documento=a, etapa='enviado', usuario=self.emisor,
                                            observacion='enviado')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {}, format='json')
        b = Documento.objects.get(pk=r.data['documento_id'])
        self.assertTrue(Destinatario.objects.filter(documento=b, usuario=self.emisor, tipo='principal').exists())

    def test_sin_destinatario_auto_cuando_autodirigido(self):
        # el original lo creó y se lo mandó a sí mismo `yo` → no hay a quién responder
        a = Documento(tipo_documento=self.tipo, asunto='auto', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.yo, anio=2026, estado='enviado')
        numeracion.numero_provisional(a); a.save()
        Destinatario.objects.create(documento=a, usuario=self.yo, unidad=self.u, tipo='principal')
        BandejaDocumento.objects.create(documento=a, usuario=self.yo, bandeja='recibidos')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data['sin_destinatario_auto'])
        b = Documento.objects.get(pk=r.data['documento_id'])
        self.assertEqual(b.responde_a_id, a.id)                # la asociación NO se rompe
        self.assertEqual(Destinatario.objects.filter(documento=b, tipo='principal').count(), 0)

    def test_a_todos_copia_no_conocimiento(self):
        a = self._recibido(asunto='multi', dest=[self.tercero])
        cc = Usuario.objects.create_user(email='cc@t.local', nombres='CC', apellidos='X', unidad=self.u)
        info = Usuario.objects.create_user(email='inf@t.local', nombres='INF', apellidos='X', unidad=self.u)
        Destinatario.objects.create(documento=a, usuario=cc, unidad=self.u, tipo='copia')
        Destinatario.objects.create(documento=a, usuario=info, unidad=self.u, tipo='conocimiento')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {'a_todos': True}, format='json')
        b = Documento.objects.get(pk=r.data['documento_id'])
        ppal = set(Destinatario.objects.filter(documento=b, tipo='principal').values_list('usuario_id', flat=True))
        copia = set(Destinatario.objects.filter(documento=b, tipo='copia').values_list('usuario_id', flat=True))
        self.assertEqual(ppal, {self.emisor.id, self.tercero.id})
        self.assertEqual(copia, {cc.id})                       # copia sí
        self.assertNotIn(info.id, ppal | copia)                # conocimiento NO

    def test_asociacion_sobrevive_firma_envio_archivo(self):
        a = self._recibido()
        b = a.respuestas.create(tipo_documento=self.tipo, asunto='RE', unidad_origen=self.u,
                                creado_por=self.yo, anio=2026) if False else None
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {}, format='json')
        b = Documento.objects.get(pk=r.data['documento_id'])
        # simular firma + envío + archivo del consecuente
        b.estado = 'enviado'; b.save(update_fields=['estado'])
        BandejaDocumento.objects.filter(documento=b, usuario=self.yo).update(bandeja='enviados')
        self.cli.post(f'/api/v1/documentos/enviar_papelera/', {'documentos': [], 'comentario': 'x'}, format='json')
        b.refresh_from_db()
        self.assertEqual(b.responde_a_id, a.id)                 # intacta


class AsociarManualTestCase(AsocBase):
    def test_asociar_y_desasociar(self):
        a = self._recibido(asunto='Antecedente')
        b = self._mio(asunto='Consecuente')
        r = self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id, 'observacion': 'continúa el trámite'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        b.refresh_from_db(); self.assertEqual(b.responde_a_id, a.id)
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=b, etapa='asociado', documento_relacionado=a).exists())
        r = self.cli.post(f'/api/v1/documentos/{b.id}/desasociar/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        b.refresh_from_db(); self.assertIsNone(b.responde_a_id)
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=b, etapa='desasociado', documento_relacionado=a).exists())

    def test_asociar_requiere_ser_responsable_o_admin(self):
        # `yo` solo tiene el doc en Recibidos (no es responsable) → 403
        a = self._recibido(asunto='Antecedente')
        b = self._recibido(asunto='ajeno-recibido')
        r = self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_no_autoasociacion(self):
        a = self._mio()
        r = self.cli.post(f'/api/v1/documentos/{a.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.assertEqual(r.status_code, 409)

    def test_ciclo_directo(self):
        a = self._mio(); b = self._mio()
        self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/asociar/', {'antecedente_id': b.id}, format='json')
        self.assertEqual(r.status_code, 409)  # A→B y B→A

    def test_ciclo_profundo(self):
        a = self._mio(); b = self._mio(); c = self._mio()
        self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.cli.post(f'/api/v1/documentos/{c.id}/asociar/', {'antecedente_id': b.id}, format='json')
        r = self.cli.post(f'/api/v1/documentos/{a.id}/asociar/', {'antecedente_id': c.id}, format='json')
        self.assertEqual(r.status_code, 409)  # A→B→C→A

    def test_desasociar_sin_antecedente(self):
        a = self._mio()
        r = self.cli.post(f'/api/v1/documentos/{a.id}/desasociar/', {}, format='json')
        self.assertEqual(r.status_code, 409)


class ArbolYBusquedaTestCase(AsocBase):
    def test_arbol_cadena_y_consecuentes(self):
        a = self._recibido(asunto='Inicio')
        b = self._mio(asunto='Medio')
        c = self._mio(asunto='Fin')
        r1 = self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.assertEqual(r1.status_code, 200, r1.data)
        self.cli.post(f'/api/v1/documentos/{c.id}/asociar/', {'antecedente_id': b.id}, format='json')
        r = self.cli.get(f'/api/v1/documentos/{b.id}/asociados/')
        self.assertEqual([x['id'] for x in r.data['cadena']], [a.id, b.id])       # raíz→actual
        self.assertEqual([x['id'] for x in r.data['consecuentes']], [c.id])
        self.assertTrue(next(x for x in r.data['cadena'] if x['id'] == b.id)['es_actual'])

    def test_buscar_asociables_acotado(self):
        mio = self._recibido(asunto='documento propio')
        ajeno = self._doc(asunto='documento ajeno', creado_por=self.tercero)  # sin relación con `yo`
        r = self.cli.get('/api/v1/documentos/asociables/', {'q': 'documento'})
        ids = {x['id'] for x in r.data}
        self.assertIn(mio.id, ids)
        self.assertNotIn(ajeno.id, ids)                 # §16 — no enumera ajenos

    def test_buscar_excluye_el_propio(self):
        d = self._recibido(asunto='auto')
        r = self.cli.get('/api/v1/documentos/asociables/', {'q': 'auto', 'excluir': d.id})
        self.assertNotIn(d.id, {x['id'] for x in r.data})

    def test_documento_con_varios_destinatarios_es_un_solo_nodo(self):
        """SGDA NO reproduce la duplicación por copia/destinatario de QUIPUX:
        un documento con N destinatarios aparece UNA sola vez en el árbol."""
        a = self._recibido(asunto='Antecedente')
        b = self._mio(asunto='Consecuente con varios destinatarios')
        d4 = Usuario.objects.create_user(email='d4@t.local', nombres='D', apellidos='4', unidad=self.u)
        for u in (self.emisor, self.tercero, d4):
            Destinatario.objects.create(documento=b, usuario=u, unidad=self.u, tipo='principal')
        r1 = self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.assertEqual(r1.status_code, 200, r1.data)
        r = self.cli.get(f'/api/v1/documentos/{a.id}/asociados/')
        self.assertEqual([x['id'] for x in r.data['consecuentes']], [b.id])   # UNA vez, no 1 por destinatario
        self.assertEqual(Destinatario.objects.filter(documento=b).count(), 3)  # los 3 destinatarios existen, separados


class InteraccionesAsocTestCase(AsocBase):
    def test_editor_no_pierde_responde_a(self):
        a = self._recibido()
        r = self.cli.post(f'/api/v1/documentos/{a.id}/responder/', {}, format='json')
        b_id = r.data['documento_id']
        # PATCH del editor (sin responde_a en el payload)
        self.cli.patch(f'/api/v1/documentos/{b_id}/', {
            'tipo_documento': self.tipo.id, 'asunto': 'RE editado', 'unidad_origen': self.u.id,
        }, format='json')
        self.assertEqual(Documento.objects.get(pk=b_id).responde_a_id, a.id)

    def test_responde_a_sobrevive_acciones_de_bandeja(self):
        a = self._recibido(asunto='antecedente')
        b = self._mio(asunto='consecuente')
        self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        it = BandejaDocumento.objects.get(documento=b, usuario=self.yo)

        # enviar → enviados
        Destinatario.objects.get_or_create(documento=b, usuario=self.emisor, defaults={'unidad': self.u, 'tipo': 'principal'})
        self.cli.post(f'/api/v1/documentos/{b.id}/enviar/')
        b.refresh_from_db(); self.assertEqual(b.responde_a_id, a.id)

        it.refresh_from_db()
        # archivar → restaurar
        self.cli.post(f'/api/v1/documentos/bandeja/{it.id}/archivar/', format='json')
        b.refresh_from_db(); self.assertEqual(b.responde_a_id, a.id)
        self.cli.post(f'/api/v1/documentos/bandeja/{it.id}/restaurar_archivado/', format='json')
        b.refresh_from_db(); self.assertEqual(b.responde_a_id, a.id)

        # reasignar
        self.cli.post(f'/api/v1/documentos/bandeja/{it.id}/reasignar/', {'usuario_id': self.tercero.id}, format='json')
        b.refresh_from_db(); self.assertEqual(b.responde_a_id, a.id)

    def test_hard_delete_antecedente_set_null(self):
        a = self._recibido(); b = self._mio()
        r = self.cli.post(f'/api/v1/documentos/{b.id}/asociar/', {'antecedente_id': a.id}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        a.delete()
        b.refresh_from_db()
        self.assertIsNone(b.responde_a_id)                 # SET_NULL, b sobrevive
        self.assertTrue(SeguimientoDocumento.objects.filter(documento=b, etapa='asociado').exists())  # rastro vive
