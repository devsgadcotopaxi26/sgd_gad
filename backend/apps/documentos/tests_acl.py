"""ACL de lectura de documentos — F2-E cierre de brechas."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario, Rol, UsuarioRol
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento
from . import numeracion


class ACLBase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='U1', nombre='U1', siglas='U1', tipo='unidad')
        self.dueno   = Usuario.objects.create_user(email='d@t.local', nombres='D', apellidos='Uno', unidad=self.u)
        self.ajeno   = Usuario.objects.create_user(email='a@t.local', nombres='A', apellidos='Dos', unidad=self.u)
        self.tipo = TipoDocumento.objects.create(codigo='OFI', nombre='Oficio', prefijo_numeracion='OFI')

    def _doc(self, creado_por=None, con_bandeja_de=None, asunto='X'):
        d = Documento(tipo_documento=self.tipo, asunto=asunto, cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=creado_por or self.dueno, anio=2026, estado='enviado')
        numeracion.numero_provisional(d); d.save()
        if con_bandeja_de:
            BandejaDocumento.objects.create(documento=d, usuario=con_bandeja_de, bandeja='recibidos')
        return d


class RetrieveACLTestCase(ACLBase):
    def test_ajeno_no_puede_get_documento(self):
        d = self._doc()
        c = APIClient(); c.force_authenticate(self.ajeno)
        self.assertEqual(c.get(f'/api/v1/documentos/{d.id}/').status_code, 404)

    def test_dueno_si_puede(self):
        d = self._doc()
        c = APIClient(); c.force_authenticate(self.dueno)
        self.assertEqual(c.get(f'/api/v1/documentos/{d.id}/').status_code, 200)

    def test_destinatario_puede(self):
        d = self._doc(con_bandeja_de=self.ajeno)
        Destinatario.objects.create(documento=d, usuario=self.ajeno, unidad=self.u, tipo='copia')
        c = APIClient(); c.force_authenticate(self.ajeno)
        self.assertEqual(c.get(f'/api/v1/documentos/{d.id}/').status_code, 200)

    def test_admin_bandeja_ve_todo(self):
        d = self._doc()
        rol = Rol.objects.get_or_create(codigo='RESPONSABLE_ARCHIVO', defaults={'nombre': 'Responsable'})[0]
        UsuarioRol.objects.create(usuario=self.ajeno, rol=rol, activo=True)
        c = APIClient(); c.force_authenticate(self.ajeno)
        self.assertEqual(c.get(f'/api/v1/documentos/{d.id}/').status_code, 200)

    def test_pdf_respeta_acl(self):
        d = self._doc()
        c = APIClient(); c.force_authenticate(self.ajeno)
        self.assertEqual(c.get(f'/api/v1/documentos/{d.id}/pdf/').status_code, 403)

    def test_lista_documentos_filtrada(self):
        mio = self._doc(creado_por=self.dueno, asunto='mio')
        ajeno_doc = self._doc(creado_por=self.ajeno, asunto='del ajeno')
        c = APIClient(); c.force_authenticate(self.dueno)
        r = c.get('/api/v1/documentos/')
        ids = {x['id'] for x in r.data['results']}
        self.assertIn(mio.id, ids)
        self.assertNotIn(ajeno_doc.id, ids)


class AsociadosACLTestCase(ACLBase):
    def test_asociacion_no_concede_acceso(self):
        # `dueno` ve A; A ← B (B es de un tercero). `dueno` NO puede abrir B.
        a = self._doc(creado_por=self.dueno, asunto='A visible')
        b = Documento(tipo_documento=self.tipo, asunto='B secreto', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.ajeno, anio=2026, estado='borrador',
                      responde_a=a)
        numeracion.numero_provisional(b); b.save()
        c = APIClient(); c.force_authenticate(self.dueno)
        # el detalle directo de B → 404
        self.assertEqual(c.get(f'/api/v1/documentos/{b.id}/').status_code, 404)

    def test_nodo_restringido_sin_metadatos(self):
        a = self._doc(creado_por=self.dueno, asunto='A visible')
        b = Documento(tipo_documento=self.tipo, asunto='B SECRETO', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.ajeno, anio=2026, estado='borrador',
                      responde_a=a)
        numeracion.numero_provisional(b); b.save()
        c = APIClient(); c.force_authenticate(self.dueno)
        r = c.get(f'/api/v1/documentos/{a.id}/asociados/')
        cons = r.data['consecuentes']
        self.assertEqual(len(cons), 1)                    # el árbol conserva el nodo
        self.assertTrue(cons[0]['restringido'])
        self.assertNotIn('asunto', cons[0])               # sin metadatos sensibles
        self.assertNotIn('numero_documento', cons[0])
        self.assertNotIn('estado', cons[0])

    def test_nodo_visible_trae_metadatos(self):
        a = self._doc(creado_por=self.dueno, asunto='A')
        b = self._doc(creado_por=self.dueno, asunto='B visible')
        b.responde_a = a; b.save(update_fields=['responde_a'])
        c = APIClient(); c.force_authenticate(self.dueno)
        r = c.get(f'/api/v1/documentos/{a.id}/asociados/')
        cons = r.data['consecuentes'][0]
        self.assertFalse(cons['restringido'])
        self.assertEqual(cons['asunto'], 'B visible')

    def test_asociables_no_enumera_ajenos(self):
        mio   = self._doc(creado_por=self.dueno, asunto='contrato propio')
        ajeno = self._doc(creado_por=self.ajeno, asunto='contrato ajeno')
        c = APIClient(); c.force_authenticate(self.dueno)
        r = c.get('/api/v1/documentos/asociables/', {'q': 'contrato'})
        ids = {x['id'] for x in r.data}
        self.assertIn(mio.id, ids)
        self.assertNotIn(ajeno.id, ids)


class AnexosACLTestCase(ACLBase):
    """Los anexos (AdjuntoViewSet) solo son visibles para quien puede ver el
    documento — misma ACL de lectura (§2 / §12.8)."""

    def _adjunto(self, doc):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import AdjuntoDocumento
        return AdjuntoDocumento.objects.create(
            documento=doc, nombre='anexo.pdf', tipo='anexo', subido_por=self.dueno,
            archivo=SimpleUploadedFile('anexo.pdf', b'%PDF-1.4 x', content_type='application/pdf'),
        )

    def _lista(self, resp):
        return resp.data['results'] if isinstance(resp.data, dict) else resp.data

    def test_ajeno_no_ve_anexos_de_doc_ajeno(self):
        d = self._doc(creado_por=self.dueno)
        self._adjunto(d)
        c = APIClient(); c.force_authenticate(self.ajeno)
        r = c.get('/api/v1/documentos/adjuntos/', {'documento': d.id})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(self._lista(r)), 0)

    def test_dueno_si_ve_sus_anexos(self):
        d = self._doc(creado_por=self.dueno)
        self._adjunto(d)
        c = APIClient(); c.force_authenticate(self.dueno)
        r = c.get('/api/v1/documentos/adjuntos/', {'documento': d.id})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(self._lista(r)), 1)

    def test_destinatario_copia_ve_anexos(self):
        d = self._doc(creado_por=self.dueno, con_bandeja_de=self.ajeno)
        Destinatario.objects.create(documento=d, usuario=self.ajeno, unidad=self.u, tipo='copia')
        self._adjunto(d)
        c = APIClient(); c.force_authenticate(self.ajeno)
        r = c.get('/api/v1/documentos/adjuntos/', {'documento': d.id})
        self.assertEqual(len(self._lista(r)), 1)
