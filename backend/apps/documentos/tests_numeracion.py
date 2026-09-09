"""FASE numeración configurable — Etapas 1 (núcleo) y 2 (API)."""
import threading

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.configuracion.models import ConfiguracionSistema
from apps.organizacion.models import Nivel, Unidad
from apps.usuarios.models import Usuario
from apps.documentos.models import (
    TipoDocumento, Documento, ConfiguracionNumeracion, SecuenciaDocumento,
)
from apps.documentos import numeracion as num


def _setup_comun():
    ConfiguracionSistema.objects.update_or_create(pk=1, defaults={'abreviatura_institucion': 'GADPC'})
    nivel = Nivel.objects.create(codigo='N1', nombre='Nivel 1')
    da   = Unidad.objects.create(codigo='DA',   nombre='Dirección Administrativa', siglas='DA',   tipo='direccion', nivel=nivel)
    utic = Unidad.objects.create(codigo='UTIC', nombre='Unidad TIC',               siglas='UTIC', tipo='unidad',    nivel=nivel)
    memo = TipoDocumento.objects.create(codigo='MEM', nombre='Memorando', prefijo_numeracion='MEM')
    circ = TipoDocumento.objects.create(codigo='CIR', nombre='Circular',  prefijo_numeracion='CIR')
    user = Usuario.objects.create_user(email='u@t.local', nombres='U', apellidos='T', unidad=da)
    return da, utic, memo, circ, user


class NumeracionCoreTest(TestCase):
    def setUp(self):
        self.da, self.utic, self.memo, self.circ, self.user = _setup_comun()
        self.anio = timezone.now().year

    def _cfg(self, unidad, tipo, **kw):
        base = dict(abreviatura='C', separador='-', digitos_anio=4, digitos_secuencia=4,
                    estructura=['institucion', 'area', 'anio', 'secuencial', 'abreviatura'])
        base.update(kw)
        return ConfiguracionNumeracion.objects.create(unidad=unidad, tipo_documento=tipo, **base)

    # NUM-CONF-01 / 02 — preview del próximo definitivo
    def test_preview_siguiente(self):
        self._cfg(self.da, self.circ, abreviatura='C')
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=455)
        self.assertEqual(
            num.preview_siguiente(self.da, self.circ),
            f'GADPC-DA-{self.anio}-0456-C',
        )
        self._cfg(self.da, self.memo, abreviatura='M')
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.memo, anio=self.anio, ultimo_numero=1603)
        self.assertEqual(
            num.preview_siguiente(self.da, self.memo),
            f'GADPC-DA-{self.anio}-1604-M',
        )

    # NUM-CONF-03 — cambiar el orden de la estructura
    def test_estructura_reordenada(self):
        cfg = self._cfg(self.da, self.circ, abreviatura='C',
                        estructura=['area', 'anio', 'secuencial', 'abreviatura'])
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=455)
        self.assertEqual(num.preview_siguiente(self.da, self.circ), f'DA-{self.anio}-0456-C')

    # NUM-CONF-04 — quitar Institución
    def test_sin_institucion(self):
        self._cfg(self.da, self.circ, abreviatura='C',
                  estructura=['area', 'anio', 'secuencial', 'abreviatura'])
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=1)
        self.assertNotIn('GADPC', num.preview_siguiente(self.da, self.circ))

    # NUM-CONF-06 — separador "/"
    def test_separador_barra(self):
        self._cfg(self.da, self.circ, abreviatura='C', separador='/')
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=1)
        self.assertEqual(num.preview_siguiente(self.da, self.circ), f'GADPC/DA/{self.anio}/0002/C')

    # dígitos de secuencia — no trunca al exceder el ancho (§10)
    def test_secuencia_excede_ancho_no_trunca(self):
        cfg = num._ConfigDefault(self.memo)
        cfg.digitos_secuencia = 4
        self.assertEqual(num._pieza('secuencial', unidad=self.da, anio=self.anio, secuencial=10000, cfg=cfg), '10000')
        self.assertEqual(num._pieza('secuencial', unidad=self.da, anio=self.anio, secuencial=66, cfg=cfg), '0066')

    # dígitos de año 2
    def test_digitos_anio_2(self):
        self._cfg(self.da, self.circ, abreviatura='C', digitos_anio=2)
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=1)
        yy = f'{self.anio % 100:02d}'
        self.assertEqual(num.preview_siguiente(self.da, self.circ), f'GADPC-DA-{yy}-0002-C')

    # provisional al crear → "…-TEMP" y numero_secuencial None
    def test_numero_provisional(self):
        doc = Documento(tipo_documento=self.memo, asunto='x', unidad_origen=self.da,
                        creado_por=self.user, anio=self.anio)
        num.numero_provisional(doc)
        doc.save()
        self.assertTrue(doc.numero_documento.endswith('TEMP'))
        self.assertIsNone(doc.numero_secuencial)
        self.assertTrue(num.es_provisional(doc))
        # consumió el contador provisional, NO el oficial
        seq = SecuenciaDocumento.objects.get(unidad=self.da, tipo_documento=self.memo, anio=self.anio)
        self.assertEqual(seq.ultimo_provisional, 1)
        self.assertEqual(seq.ultimo_numero, 0)

    # definitivo al oficializar → consume oficial, formato correcto, idempotente
    def test_asignar_numero_definitivo_idempotente(self):
        self._cfg(self.da, self.memo, abreviatura='M')
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.memo, anio=self.anio,
                                          ultimo_numero=717, ultimo_provisional=773)
        doc = Documento.objects.create(tipo_documento=self.memo, asunto='x', unidad_origen=self.da,
                                       creado_por=self.user, anio=self.anio,
                                       numero_documento='GADPC-DA-2026-773-TEMP', numero_secuencial=None)
        n1 = num.asignar_numero_definitivo(doc)
        self.assertEqual(n1, f'GADPC-DA-{self.anio}-0718-M')
        self.assertEqual(doc.numero_secuencial, 718)
        n2 = num.asignar_numero_definitivo(doc)          # idempotente
        self.assertEqual(n2, n1)
        seq = SecuenciaDocumento.objects.get(unidad=self.da, tipo_documento=self.memo, anio=self.anio)
        self.assertEqual(seq.ultimo_numero, 718)         # no volvió a consumir

    # independencia por unidad × tipo (§1, §6)
    def test_secuencias_independientes(self):
        for u in (self.da, self.utic):
            self._cfg(u, self.memo, abreviatura='M')
        d1 = Documento.objects.create(tipo_documento=self.memo, asunto='a', unidad_origen=self.da,
                                      creado_por=self.user, anio=self.anio, numero_secuencial=None)
        d2 = Documento.objects.create(tipo_documento=self.memo, asunto='b', unidad_origen=self.utic,
                                      creado_por=self.user, anio=self.anio, numero_secuencial=None)
        num.asignar_numero_definitivo(d1)
        num.asignar_numero_definitivo(d2)
        self.assertEqual(d1.numero_secuencial, 1)
        self.assertEqual(d2.numero_secuencial, 1)        # UTIC arranca en 1, no en 2
        self.assertIn('DA', d1.numero_documento)
        self.assertIn('UTIC', d2.numero_documento)

    # NUM-CONF-11 — cambiar config NO altera números existentes
    def test_cambiar_config_no_altera_historicos(self):
        cfg = self._cfg(self.da, self.memo, abreviatura='M')
        doc = Documento.objects.create(tipo_documento=self.memo, asunto='x', unidad_origen=self.da,
                                       creado_por=self.user, anio=self.anio, numero_secuencial=None)
        num.asignar_numero_definitivo(doc)
        original = doc.numero_documento
        cfg.abreviatura = 'MEMO'; cfg.separador = '/'; cfg.save()
        doc.refresh_from_db()
        self.assertEqual(doc.numero_documento, original)

    # ENVIAR-500 — el correlativo salta números ya ocupados (legacy / import
    # Quipux con el mismo formato) en vez de chocar con el unique constraint
    def test_salta_numeros_ocupados(self):
        self._cfg(self.da, self.memo, abreviatura='M')
        # simula documentos legacy/importados que ocupan 1..3 con el mismo formato
        for k in (1, 2, 3):
            Documento.objects.create(
                tipo_documento=self.memo, asunto=f'legacy {k}', unidad_origen=self.da,
                creado_por=self.user, anio=self.anio,
                numero_documento=f'GADPC-DA-{self.anio}-000{k}-M', numero_secuencial=None)
        doc = Documento.objects.create(
            tipo_documento=self.memo, asunto='nuevo', unidad_origen=self.da,
            creado_por=self.user, anio=self.anio, numero_secuencial=None)
        n = num.asignar_numero_definitivo(doc)
        self.assertEqual(n, f'GADPC-DA-{self.anio}-0004-M')     # saltó 1,2,3
        self.assertEqual(doc.numero_secuencial, 4)
        seq = SecuenciaDocumento.objects.get(unidad=self.da, tipo_documento=self.memo, anio=self.anio)
        self.assertEqual(seq.ultimo_numero, 4)                  # persiste el salto → siguiente es instantáneo

    # §23 — tipo sin configuración → default silencioso (no rompe)
    def test_sin_config_usa_default(self):
        doc = Documento.objects.create(tipo_documento=self.circ, asunto='x', unidad_origen=self.utic,
                                       creado_por=self.user, anio=self.anio, numero_secuencial=None)
        n = num.asignar_numero_definitivo(doc)
        self.assertEqual(n, f'GADPC-UTIC-{self.anio}-0001-CIR')   # abrev = prefijo del tipo
        self.assertFalse(ConfiguracionNumeracion.objects.filter(unidad=self.utic, tipo_documento=self.circ).exists())


class NumeracionAPITest(TestCase):
    """Etapa 2 — endpoints bajo permiso 'ajustes' (aquí: superusuario)."""

    def setUp(self):
        # `aud_log` es managed=False (no la crea el runner de tests). La
        # recreamos mínima para poder verificar la auditoría de §17.
        from django.db import connection
        with connection.cursor() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS aud_log (
                    id BIGSERIAL PRIMARY KEY,
                    tabla VARCHAR(60) NOT NULL,
                    registro_id BIGINT,
                    accion VARCHAR(20) NOT NULL,
                    datos_antes JSONB, datos_despues JSONB,
                    campos_cambiados TEXT,
                    usuario_id INTEGER, usuario_email VARCHAR(200),
                    unidad_id INTEGER, ip_address INET, user_agent TEXT,
                    modulo VARCHAR(40), descripcion TEXT,
                    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)
        self.da, self.utic, self.memo, self.circ, _u = _setup_comun()
        self.anio = timezone.now().year
        self.admin = Usuario.objects.create_user(
            email='admin@t.local', nombres='Admin', apellidos='X', unidad=self.da)
        self.admin.is_superuser = True
        self.admin.save(update_fields=['is_superuser'])
        self.normal = Usuario.objects.create_user(
            email='normal@t.local', nombres='N', apellidos='X', unidad=self.da)
        self.c = APIClient()
        self.c.force_authenticate(self.admin)

    def test_permiso_denegado_a_usuario_normal(self):
        cli = APIClient()
        cli.force_authenticate(self.normal)
        r = cli.get(f'/api/v1/documentos/numeracion/unidades/{self.da.id}/')
        self.assertEqual(r.status_code, 403)

    def test_tabla_unidad(self):
        r = self.c.get(f'/api/v1/documentos/numeracion/unidades/{self.da.id}/')
        self.assertEqual(r.status_code, 200)
        tipos = {t['tipo_codigo']: t for t in r.data['tipos']}
        self.assertIn('MEM', tipos)
        # sin config → default (abrev = prefijo), próximo = 0001
        self.assertFalse(tipos['MEM']['configurado'])
        self.assertEqual(tipos['MEM']['proximo_numero'], f'GADPC-DA-{self.anio}-0001-MEM')

    def test_put_config_y_preview(self):
        r = self.c.put(
            f'/api/v1/documentos/numeracion/unidades/{self.da.id}/tipos/{self.circ.id}/',
            {'abreviatura': 'C', 'separador': '-', 'digitos_anio': 4,
             'digitos_secuencia': 4,
             'estructura': ['institucion', 'area', 'anio', 'secuencial', 'abreviatura']},
            format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(ConfiguracionNumeracion.objects.filter(unidad=self.da, tipo_documento=self.circ).count(), 1)
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=455)
        # preview con override de separador — NO consume
        r2 = self.c.post(
            f'/api/v1/documentos/numeracion/unidades/{self.da.id}/tipos/{self.circ.id}/preview/',
            {'separador': '/'}, format='json')
        self.assertEqual(r2.data['preview'], f'GADPC/DA/{self.anio}/0456/C')
        SecuenciaDocumento.objects.get(unidad=self.da, tipo_documento=self.circ, anio=self.anio)  # sigue en 455

    def test_put_config_invalida(self):
        r = self.c.put(
            f'/api/v1/documentos/numeracion/unidades/{self.da.id}/tipos/{self.circ.id}/',
            {'estructura': ['area', 'anio'], 'separador': '-'}, format='json')  # falta 'secuencial'
        self.assertEqual(r.status_code, 400)

    def test_ajustar_secuencia_auditado(self):
        from apps.auditoria.models import LogAuditoria
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=455)
        r = self.c.post(
            f'/api/v1/documentos/numeracion/unidades/{self.da.id}/tipos/{self.circ.id}/ajustar-secuencia/',
            {'nueva_secuencia': 500, 'motivo': 'continuar numeración Quipux'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['secuencia_actual'], 500)
        seq = SecuenciaDocumento.objects.get(unidad=self.da, tipo_documento=self.circ, anio=self.anio)
        self.assertEqual(seq.ultimo_numero, 500)
        log = LogAuditoria.objects.filter(tabla='doc_secuencia', registro_id=seq.id).order_by('-id').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.datos_antes['ultimo_numero'], 455)
        self.assertEqual(log.datos_despues['ultimo_numero'], 500)
        self.assertIn('continuar numeración Quipux', log.descripcion)

    def test_ajustar_secuencia_sin_motivo_rechaza(self):
        r = self.c.post(
            f'/api/v1/documentos/numeracion/unidades/{self.da.id}/tipos/{self.circ.id}/ajustar-secuencia/',
            {'nueva_secuencia': 10, 'motivo': ''}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_copiar_formato_no_secuencia(self):
        # DA configurada, con secuencia alta
        ConfiguracionNumeracion.objects.create(
            unidad=self.da, tipo_documento=self.circ, abreviatura='C', separador='-')
        SecuenciaDocumento.objects.create(unidad=self.da, tipo_documento=self.circ, anio=self.anio, ultimo_numero=455)
        r = self.c.post(
            f'/api/v1/documentos/numeracion/unidades/{self.utic.id}/copiar-de/',
            {'unidad_origen_id': self.da.id}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['copiadas'], 1)
        # UTIC recibió el FORMATO
        self.assertTrue(ConfiguracionNumeracion.objects.filter(unidad=self.utic, tipo_documento=self.circ).exists())
        # …pero NO la secuencia (§15)
        self.assertFalse(SecuenciaDocumento.objects.filter(unidad=self.utic, tipo_documento=self.circ).exists())


class NumeracionConcurrenciaTest(TransactionTestCase):
    """NUM-CONF-10 — dos consumos simultáneos → números distintos."""

    def test_concurrencia_sin_colision(self):
        da, _utic, memo, _circ, user = _setup_comun()
        anio = timezone.now().year
        ConfiguracionNumeracion.objects.create(unidad=da, tipo_documento=memo, abreviatura='M')
        docs = [
            Documento.objects.create(tipo_documento=memo, asunto=f'd{i}', unidad_origen=da,
                                     creado_por=user, anio=anio, numero_secuencial=None)
            for i in range(10)
        ]
        resultados = []
        errores = []

        def consumir(doc):
            from django.db import connection, transaction
            try:
                with transaction.atomic():
                    num.asignar_numero_definitivo(doc)
                resultados.append(doc.numero_secuencial)
            except Exception as e:  # noqa: BLE001
                errores.append(repr(e))
            finally:
                connection.close()

        hilos = [threading.Thread(target=consumir, args=(d,)) for d in docs]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()

        self.assertEqual(errores, [])
        self.assertEqual(sorted(resultados), list(range(1, 11)))   # 1..10 sin repetidos ni huecos
        seq = SecuenciaDocumento.objects.get(unidad=da, tipo_documento=memo, anio=anio)
        self.assertEqual(seq.ultimo_numero, 10)
