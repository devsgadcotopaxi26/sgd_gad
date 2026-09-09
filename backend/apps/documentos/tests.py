"""
Pruebas de las validaciones de envío documental (tipo, asunto, >=1
destinatario) y de que la transición BORRADOR -> ENVIADO sea atómica.
Cubre los casos API-E1..API-E4 pedidos para el flujo de envío.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento


class EnvioDocumentalTestCase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.unidad = Unidad.objects.create(
            nivel=nivel, codigo='U1', nombre='Unidad Uno', tipo='unidad',
        )
        self.creador = Usuario.objects.create_user(
            email='creador@test.local', nombres='Creador', apellidos='Uno',
            unidad=self.unidad,
        )
        self.destinatario_user = Usuario.objects.create_user(
            email='destinatario@test.local', nombres='Destinatario', apellidos='Uno',
            unidad=self.unidad,
        )
        self.tipo = TipoDocumento.objects.create(
            codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.creador)

    def _crear_borrador(self, con_destinatario=True):
        doc = Documento(
            tipo_documento=self.tipo,
            asunto='Asunto de prueba',
            unidad_origen=self.unidad,
            creado_por=self.creador,
            anio=2026,
        )
        doc.generar_numero()
        doc.save()
        BandejaDocumento.objects.create(
            documento=doc, usuario=self.creador, bandeja='en_elaboracion',
        )
        if con_destinatario:
            Destinatario.objects.create(
                documento=doc, usuario=self.destinatario_user, unidad=self.unidad,
            )
        return doc

    # --- API-E1: enviar sin destinatarios -> 400, estado no cambia ---
    def test_enviar_sin_destinatarios_rechaza(self):
        doc = self._crear_borrador(con_destinatario=False)
        resp = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(resp.status_code, 400)
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'borrador')
        self.assertIsNone(doc.fecha_envio)

    # --- API-E2: enviar con destinatario -> 200, bandejas correctas ---
    def test_enviar_con_destinatario_ok(self):
        doc = self._crear_borrador(con_destinatario=True)
        resp = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(resp.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'enviado')
        self.assertIsNotNone(doc.fecha_envio)
        self.assertTrue(
            BandejaDocumento.objects.filter(
                documento=doc, usuario=self.creador, bandeja='enviados',
            ).exists()
        )
        self.assertTrue(
            BandejaDocumento.objects.filter(
                documento=doc, usuario=self.destinatario_user, bandeja='recibidos',
            ).exists()
        )

    # --- Enviar dos veces: la segunda debe rechazarse por CONFLICTO DE ESTADO ---
    # 409 (no 403 "sin responsabilidad" ni 400 "solicitud inválida"): el
    # documento ya está oficializado; reenviarlo choca con su estado actual.
    def test_enviar_documento_ya_enviado_rechaza(self):
        doc = self._crear_borrador(con_destinatario=True)
        primero = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(primero.status_code, 200)
        segundo = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(segundo.status_code, 409)
        self.assertIn('ya fue enviado', segundo.data['detail'])
        # no se duplicaron bandejas de recibidos
        from .models import BandejaDocumento
        self.assertEqual(
            BandejaDocumento.objects.filter(documento=doc, bandeja='recibidos').count(), 1,
        )

    # --- Sin asunto: rechazado incluso con destinatario válido ---
    def test_enviar_sin_asunto_rechaza(self):
        doc = self._crear_borrador(con_destinatario=True)
        doc.asunto = ''
        doc.save(update_fields=['asunto'])
        resp = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(resp.status_code, 400)
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'borrador')

    # --- API-E3: fallo a mitad de la operación -> rollback completo ---
    def test_fallo_intermedio_revierte_todo(self):
        doc = self._crear_borrador(con_destinatario=True)
        from django.db.models.signals import post_save

        def _explota(sender, instance, created, **kwargs):
            if created and instance.etapa == 'enviado':
                raise RuntimeError('fallo simulado durante el envío')

        from .models import SeguimientoDocumento
        post_save.connect(_explota, sender=SeguimientoDocumento)
        try:
            with self.assertRaises(RuntimeError):
                self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        finally:
            post_save.disconnect(_explota, sender=SeguimientoDocumento)

        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'borrador')
        self.assertIsNone(doc.fecha_envio)
        self.assertFalse(
            BandejaDocumento.objects.filter(documento=doc, bandeja='recibidos').exists()
        )
        self.assertTrue(
            BandejaDocumento.objects.filter(
                documento=doc, usuario=self.creador, bandeja='en_elaboracion',
            ).exists()
        )

    # --- API-E4: llamada directa (sin pasar por el frontend) tampoco envía huérfanos ---
    def test_llamada_directa_sin_destinatarios_no_marca_enviado(self):
        doc = self._crear_borrador(con_destinatario=False)
        client_directo = APIClient()
        client_directo.force_authenticate(user=self.creador)
        resp = client_directo.post(
            f'/api/v1/documentos/{doc.id}/enviar/', data={}, format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Documento.objects.filter(pk=doc.pk, estado='enviado').exists())

    # --- Solo destinatario 'copia' (sin 'principal') → NO se puede enviar/firmar ---
    def test_solo_copia_no_es_enviable(self):
        from .models import Destinatario
        doc = self._crear_borrador(con_destinatario=False)
        Destinatario.objects.create(documento=doc, usuario=self.destinatario_user, unidad=self.unidad, tipo='copia')

        # enviar
        r = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(r.status_code, 400)
        # firma física
        r = self.client.post(f'/api/v1/documentos/{doc.id}/firma-fisica/', {}, format='json')
        self.assertEqual(r.status_code, 400)
        # generar token firma EC
        r = self.client.post(f'/api/v1/documentos/{doc.id}/firmaec/generar-token/')
        self.assertEqual(r.status_code, 400)
        # cambiar_estado -> enviado
        r = self.client.post(f'/api/v1/documentos/{doc.id}/cambiar_estado/', {'estado': 'enviado'}, format='json')
        self.assertEqual(r.status_code, 400)
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'borrador')

    def test_con_principal_si_es_enviable(self):
        doc = self._crear_borrador(con_destinatario=True)   # tipo='principal' por defecto
        r = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(r.status_code, 200, getattr(r, 'data', None))


class GuardarNoEnviaTestCase(TestCase):
    """
    Respaldo backend del flujo Quipux de Vista previa/Guardar: crear o
    actualizar un documento (POST/PATCH /documentos/) jamás debe poder
    dejarlo en estado=enviado por sí solo, sin pasar por /enviar/. La
    garantía real es que 'estado' no es un campo escribible en
    DocumentoCrearSerializer; esta prueba fija ese contrato.
    """

    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.unidad = Unidad.objects.create(
            nivel=nivel, codigo='U1', nombre='Unidad Uno', tipo='unidad',
        )
        self.usuario = Usuario.objects.create_user(
            email='usuario2@test.local', nombres='Usuario', apellidos='Dos',
            unidad=self.unidad,
        )
        self.tipo = TipoDocumento.objects.create(
            codigo='MEM', nombre='Memorando', prefijo_numeracion='MEM',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)

    def test_crear_documento_no_lo_marca_enviado_aunque_se_intente(self):
        resp = self.client.post('/api/v1/documentos/', {
            'tipo_documento': self.tipo.id,
            'asunto': 'Prueba vista previa',
            'unidad_origen': self.unidad.id,
            'estado': 'enviado',  # intento directo de forzarlo vía API
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        doc = Documento.objects.get(pk=resp.data['id'])
        self.assertEqual(doc.estado, 'borrador')
        self.assertIsNone(doc.fecha_envio)

    def test_actualizar_documento_reutiliza_mismo_id_y_no_envia(self):
        # Simula "Vista previa" pulsada dos veces: primero crea, luego
        # actualiza el MISMO documento (como hace EditorDocumento con
        # docGuardado.id) — nunca debe crear un segundo documento ni
        # tocar el estado.
        creado = self.client.post('/api/v1/documentos/', {
            'tipo_documento': self.tipo.id,
            'asunto': 'PRUEBA 1',
            'unidad_origen': self.unidad.id,
        }, format='json')
        self.assertEqual(creado.status_code, 201)
        doc_id = creado.data['id']

        actualizado = self.client.patch(f'/api/v1/documentos/{doc_id}/', {
            'asunto': 'PRUEBA 2',
            'estado': 'enviado',  # tampoco debe colarse en un PATCH
        }, format='json')
        self.assertEqual(actualizado.status_code, 200)

        self.assertEqual(Documento.objects.count(), 1)
        doc = Documento.objects.get(pk=doc_id)
        self.assertEqual(doc.asunto, 'PRUEBA 2')
        self.assertEqual(doc.estado, 'borrador')
        self.assertIsNone(doc.fecha_envio)


class EnviarTrasPersistirTestCase(TestCase):
    """
    Contrato que respalda el fix de EditorDocumento: "Enviar sin firma"
    ahora PATCHea el documento (persistiendo los destinatarios que el
    usuario agregó en el editor) ANTES de llamar a /enviar/. Antes enviaba
    directo sin guardar y el backend respondía 400 "Seleccione al menos un
    destinatario" porque en BD había 0.
    """

    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.unidad = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='Unidad Uno', tipo='unidad')
        self.creador = Usuario.objects.create_user(
            email='c3@test.local', nombres='C', apellidos='Tres', unidad=self.unidad)
        self.dest = Usuario.objects.create_user(
            email='d3@test.local', nombres='D', apellidos='Tres', unidad=self.unidad)
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')
        self.client = APIClient()
        self.client.force_authenticate(user=self.creador)

    def _borrador_sin_destinatarios(self):
        doc = Documento(tipo_documento=self.tipo, asunto='s', unidad_origen=self.unidad,
                        creado_por=self.creador, anio=2026)
        doc.generar_numero()
        doc.save()
        BandejaDocumento.objects.create(documento=doc, usuario=self.creador, bandeja='en_elaboracion')
        return doc

    def test_enviar_directo_sin_persistir_da_400(self):
        # Reproduce el bug: el editor tenía un destinatario en estado React
        # pero nunca lo guardó → /enviar/ sin PATCH previo.
        doc = self._borrador_sin_destinatarios()
        r = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(r.status_code, 400)
        self.assertIn('destinatario', r.data['detail'].lower())
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'borrador')

    def test_patch_destinatarios_y_luego_enviar_ok(self):
        # El nuevo flujo: PATCH (guarda destinatarios) → enviar.
        doc = self._borrador_sin_destinatarios()
        p = self.client.patch(f'/api/v1/documentos/{doc.id}/', {
            'tipo_documento': self.tipo.id,
            'asunto': 's',
            'unidad_origen': self.unidad.id,
            'destinatarios_ids': [self.dest.id],
        }, format='json')
        self.assertEqual(p.status_code, 200, p.data)
        self.assertEqual(Destinatario.objects.filter(documento=doc, usuario=self.dest).count(), 1)

        r = self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(r.status_code, 200, getattr(r, 'data', None))
        doc.refresh_from_db()
        self.assertEqual(doc.estado, 'enviado')
        self.assertTrue(BandejaDocumento.objects.filter(
            documento=doc, usuario=self.dest, bandeja='recibidos').exists())

    def test_un_solo_enviar_por_flujo(self):
        # Un PATCH + un POST /enviar/ = un documento enviado, sin duplicar bandejas.
        doc = self._borrador_sin_destinatarios()
        self.client.patch(f'/api/v1/documentos/{doc.id}/', {
            'tipo_documento': self.tipo.id, 'asunto': 's',
            'unidad_origen': self.unidad.id, 'destinatarios_ids': [self.dest.id],
        }, format='json')
        self.client.post(f'/api/v1/documentos/{doc.id}/enviar/')
        self.assertEqual(BandejaDocumento.objects.filter(
            documento=doc, usuario=self.dest, bandeja='recibidos').count(), 1)


class DistribuirDocumentalTestCase(TestCase):
    """Endpoint EnviarDocumentoView (usado por el botón "Distribuir")."""

    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
        self.unidad = Unidad.objects.create(
            nivel=nivel, codigo='U1', nombre='Unidad Uno', tipo='unidad',
        )
        self.usuario = Usuario.objects.create_user(
            email='usuario@test.local', nombres='Usuario', apellidos='Uno',
            unidad=self.unidad,
        )
        self.receptor = Usuario.objects.create_user(
            email='receptor@test.local', nombres='Receptor', apellidos='Uno',
            unidad=self.unidad,
        )
        self.tipo = TipoDocumento.objects.create(
            codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI',
        )
        doc = Documento(
            tipo_documento=self.tipo, asunto='Asunto', unidad_origen=self.unidad,
            creado_por=self.usuario, anio=2026,
        )
        doc.generar_numero()
        doc.save()
        self.doc = doc
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)

    def test_distribuir_lista_vacia_rechaza(self):
        resp = self.client.post(
            f'/api/v1/documentos/enviar/{self.doc.id}/enviar/',
            data={'destinatarios_internos': []}, format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.doc.refresh_from_db()
        self.assertNotEqual(self.doc.estado, 'enviado')

    def test_distribuir_con_destinatario_ok(self):
        resp = self.client.post(
            f'/api/v1/documentos/enviar/{self.doc.id}/enviar/',
            data={'destinatarios_internos': [{'usuario_id': self.receptor.id}]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.estado, 'enviado')
        self.assertTrue(
            BandejaDocumento.objects.filter(
                documento=self.doc, usuario=self.receptor, bandeja='recibidos',
            ).exists()
        )
