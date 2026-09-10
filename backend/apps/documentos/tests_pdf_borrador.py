"""La marca BORRADOR es exclusiva de la previsualización — el PDF oficial
congelado (enviar / firma) nunca la lleva (PDF-DRAFT / PDF-FINAL / PDF-FIRMA)."""
import io

from django.test import TestCase
from pdfminer.high_level import extract_text

from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from .models import BandejaDocumento, Destinatario, Documento, TipoDocumento
from . import numeracion
from .plantillas import html_documento_oficial
from .pdf_oficial import _render_pdf_bytes, obtener_adjunto_oficial


def _txt(pdf_bytes):
    return extract_text(io.BytesIO(pdf_bytes))


class PdfBorradorTestCase(TestCase):
    def setUp(self):
        nivel = Nivel.objects.create(codigo='N1', nombre='N1')
        self.u = Unidad.objects.create(nivel=nivel, codigo='DA', nombre='Dir Adm', siglas='DA', tipo='direccion')
        self.creador = Usuario.objects.create_user(email='c@t.local', nombres='C', apellidos='U', unidad=self.u)
        self.dest    = Usuario.objects.create_user(email='d@t.local', nombres='D', apellidos='U', unidad=self.u)
        self.tipo = TipoDocumento.objects.create(codigo='MEM', nombre='Memorando', prefijo_numeracion='MEM')

    def _borrador(self):
        d = Documento(tipo_documento=self.tipo, asunto='x', cuerpo='<p>c</p>',
                      unidad_origen=self.u, creado_por=self.creador, anio=2026)
        numeracion.numero_provisional(d)
        d.save()
        Destinatario.objects.create(documento=d, usuario=self.dest, unidad=self.u, tipo='principal')
        BandejaDocumento.objects.create(documento=d, usuario=self.creador, bandeja='en_elaboracion')
        return d

    # los 3 modos, a nivel HTML y de PDF renderizado
    def test_modos_render(self):
        d = self._borrador()   # estado='borrador'
        self.assertIn('class="marca-agua-borrador"', html_documento_oficial(d, 'preview'))
        self.assertNotIn('class="marca-agua-borrador"', html_documento_oficial(d, 'final'))
        self.assertNotIn('class="marca-agua-borrador"', html_documento_oficial(d, 'pre_firma'))
        # pre_firma incluye la leyenda de firma
        self.assertIn('firmado electr', html_documento_oficial(d, 'pre_firma').lower())
        # back-compat
        self.assertEqual(html_documento_oficial(d, pre_firma=True), html_documento_oficial(d, 'pre_firma'))

        self.assertIn('BORRADOR', _txt(_render_pdf_bytes(d, 'preview')))
        self.assertNotIn('BORRADOR', _txt(_render_pdf_bytes(d, 'final')))
        self.assertNotIn('BORRADOR', _txt(_render_pdf_bytes(d, 'pre_firma')))

    # PDF-DRAFT-01 — GET /pdf/ de un borrador → BORRADOR
    def test_endpoint_borrador_muestra_borrador(self):
        from rest_framework.test import APIClient
        d = self._borrador()
        c = APIClient(); c.force_authenticate(self.creador)
        r = c.get(f'/api/v1/documentos/{d.id}/pdf/')
        self.assertEqual(r['X-PDF-Origen'], 'borrador')
        self.assertIn('BORRADOR', _txt(b''.join(r.streaming_content) if r.streaming else r.content))

    # PDF-FINAL-01 — enviar sin firma → PDF congelado con nº definitivo y SIN BORRADOR
    def test_enviado_congelado_sin_borrador(self):
        from rest_framework.test import APIClient
        d = self._borrador()
        c = APIClient(); c.force_authenticate(self.creador)
        r = c.post(f'/api/v1/documentos/{d.id}/enviar/')
        self.assertEqual(r.status_code, 200, getattr(r, 'data', None))
        d.refresh_from_db()
        self.assertEqual(d.estado, 'enviado')
        self.assertIsNotNone(d.numero_secuencial)
        self.assertNotIn('TEMP', d.numero_documento)

        adj = obtener_adjunto_oficial(d)
        self.assertIsNotNone(adj)
        with adj.archivo.open('rb') as fh:
            txt = _txt(fh.read())
        self.assertNotIn('BORRADOR', txt)               # ← el fix
        self.assertNotIn('TEMP', txt)
        self.assertIn(d.numero_documento, txt)          # nº BD == nº en el PDF

    # PDF-FINAL-02 — GET /pdf/ tras el envío
    def test_endpoint_enviado_sin_borrador(self):
        from rest_framework.test import APIClient
        d = self._borrador()
        c = APIClient(); c.force_authenticate(self.creador)
        c.post(f'/api/v1/documentos/{d.id}/enviar/')
        r = c.get(f'/api/v1/documentos/{d.id}/pdf/')
        self.assertEqual(r['X-PDF-Origen'], 'congelado')
        self.assertNotIn('BORRADOR', _txt(b''.join(r.streaming_content) if r.streaming else r.content))
