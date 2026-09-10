# Documentos asociados — relación ANTECEDENTE → CONSECUENTE.
#
# Almacenamiento: `Documento.responde_a` (FK 'self', SET_NULL,
# related_name='respuestas'). Ya existía en el modelo — F2-E la activa.
#   - un documento tiene MÁXIMO 1 antecedente (`responde_a`)
#   - y N consecuentes (`respuestas`)
#
# La crea: RESPONDER (automática) y ASOCIAR (manual). NO la crean Copiar,
# Nueva Tarea, Reasignar ni Informar. Ninguna acción de bandeja
# (archivar/restaurar/reasignar/informar/papelera) la destruye — no tocan
# `responde_a`. Estar asociado NO concede permisos sobre el otro documento.
from django.utils import timezone

from .models import Documento, BandejaDocumento, SeguimientoDocumento, Destinatario


class AsociacionError(Exception):
    def __init__(self, mensaje, code=409):
        super().__init__(mensaje)
        self.code = code


_MAX_PROFUNDIDAD = 100  # tope de seguridad al recorrer la cadena


def cadena_ascendente(doc):
    """[raíz … antecedente_directo, doc] — de más antiguo a `doc`. Sin ciclos."""
    vistos, cadena = set(), []
    actual = doc
    n = 0
    while actual is not None and actual.id not in vistos and n < _MAX_PROFUNDIDAD:
        vistos.add(actual.id)
        cadena.append(actual)
        actual = actual.responde_a
        n += 1
    cadena.reverse()
    return cadena


def validar_asociacion(doc, antecedente):
    """Comprueba que `doc.responde_a = antecedente` es válido. Lanza AsociacionError."""
    if antecedente is None:
        raise AsociacionError('Debe indicar el documento antecedente.', 400)
    if antecedente.id == doc.id:
        raise AsociacionError('Un documento no puede asociarse a sí mismo.', 409)
    # Recorrer la cadena ascendente del ANTECEDENTE: si aparece `doc`, sería ciclo.
    ids_arriba = {d.id for d in cadena_ascendente(antecedente)}
    if doc.id in ids_arriba:
        raise AsociacionError(
            'No se puede asociar: crearía un ciclo (el antecedente ya desciende de este documento).',
            409,
        )


def aplicar_asociacion(doc, antecedente, usuario, observacion=''):
    """Fija `doc.responde_a = antecedente` + rastro. En transaction.atomic()."""
    doc.responde_a = antecedente
    doc.save(update_fields=['responde_a', 'modificado_en'])
    obs = (observacion or '').strip() or f'Asociado como consecuente de {antecedente.numero_documento or f"documento #{antecedente.id}"}.'
    SeguimientoDocumento.objects.create(
        documento=doc, etapa='asociado', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=obs, documento_relacionado=antecedente,
    )
    # Rastro simétrico en el antecedente (su dueño ve que fue respondido/continuado).
    SeguimientoDocumento.objects.create(
        documento=antecedente, etapa='respondido', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=f'Documento continuado por {doc.numero_documento or f"borrador #{doc.id}"}.',
        documento_relacionado=doc,
    )


def aplicar_desasociacion(doc, usuario, observacion=''):
    if doc.responde_a_id is None:
        raise AsociacionError('El documento no tiene un antecedente asociado.', 409)
    antecedente = doc.responde_a
    doc.responde_a = None
    doc.save(update_fields=['responde_a', 'modificado_en'])
    obs = (observacion or '').strip() or f'Se retiró la asociación con {antecedente.numero_documento or f"documento #{antecedente.id}"}.'
    SeguimientoDocumento.objects.create(
        documento=doc, etapa='desasociado', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=obs, documento_relacionado=antecedente,
    )


# ── Responder ──────────────────────────────────────────────────────────────
def emisor_canonico(original):
    """
    FUENTE CANÓNICA del emisor de un documento recibido, en orden:
      1. `remitente` (firmante previsto / DE explícito), si existe.
      2. `usuario` del último `SeguimientoDocumento(etapa='enviado')` — quien
         ejecutó realmente el envío (fiable para históricos/migrados donde
         `remitente` viene NULL).
      3. `creado_por` — último recurso; puede ser quien materializó/importó el
         documento, no necesariamente el remitente funcional.
    Devuelve un id de Usuario o None.
    """
    if original.remitente_id:
        return original.remitente_id
    seg = (original.seguimiento_quipux
           .filter(etapa='enviado', usuario__isnull=False)
           .order_by('-creado_en').first())
    if seg and seg.usuario_id:
        return seg.usuario_id
    return original.creado_por_id


def crear_respuesta(original, usuario, *, asunto, tipo_documento, cuerpo='',
                    a_todos=False):
    """
    Crea UN documento borrador que responde a `original`. Establece
    `responde_a = original` desde el nacimiento del borrador. Precarga
    destinatario(s) y un ítem de bandeja 'en_elaboracion' para el creador.
    Debe llamarse dentro de transaction.atomic().

    Devuelve (doc, sin_destinatario_auto). `sin_destinatario_auto=True` cuando
    NO se pudo determinar automáticamente ningún destinatario (datos
    incompletos/históricos, o el original es auto-dirigido) — la UI debe pedir
    al usuario que seleccione el destinatario.
    """
    from .numeracion import numero_provisional

    if not (asunto or '').strip():
        raise AsociacionError('El asunto es obligatorio.', 400)
    if tipo_documento is None:
        raise AsociacionError('El tipo de documento es obligatorio.', 400)

    doc = Documento(
        tipo_documento=tipo_documento,
        anio=timezone.now().year,
        asunto=asunto.strip(),
        cuerpo=cuerpo or f'<p>En respuesta al documento {original.numero_documento or ""}.</p>',
        estado='borrador',
        creado_por=usuario,
        unidad_origen=getattr(usuario, 'unidad', None),
        responde_a=original,                       # ← asociación automática
        quipux_origen=original.quipux_origen or '',
        requiere_respuesta=False,
        fecha_elaboracion=timezone.now().date(),
    )
    numero_provisional(doc)
    doc.save()

    # Destinatarios de la respuesta (se responde al EMISOR, no "a quién iba
    # dirigido el original"):
    #   - "Responder": PARA = emisor canónico del original.
    #   - "Responder a todos": PARA = emisor + demás destinatarios 'principal';
    #     CON COPIA = destinatarios 'copia' del original.  (NO 'conocimiento':
    #     un informado posterior NO es parte del direccionamiento original.)
    #   Siempre se excluye al propio autor de la respuesta y se evitan duplicados.
    principal_ids, copia_ids = [], []
    emisor_id = emisor_canonico(original)
    if emisor_id and emisor_id != usuario.id:
        principal_ids.append(emisor_id)
    if a_todos:
        for d in original.destinatarios.filter(tipo='principal', usuario__isnull=False):
            if d.usuario_id != usuario.id and d.usuario_id not in principal_ids:
                principal_ids.append(d.usuario_id)
        for d in original.destinatarios.filter(tipo='copia', usuario__isnull=False):
            if d.usuario_id != usuario.id and d.usuario_id not in principal_ids and d.usuario_id not in copia_ids:
                copia_ids.append(d.usuario_id)

    from apps.usuarios.models import Usuario
    for tipo, ids in (('principal', principal_ids), ('copia', copia_ids)):
        for uid in ids:
            try:
                u = Usuario.objects.select_related('unidad').get(pk=uid)
            except Usuario.DoesNotExist:
                continue
            Destinatario.objects.get_or_create(
                documento=doc, usuario=u, defaults={'unidad': u.unidad, 'tipo': tipo},
            )

    sin_destinatario_auto = not principal_ids

    BandejaDocumento.objects.get_or_create(
        documento=doc, usuario=usuario, bandeja='en_elaboracion',
    )
    SeguimientoDocumento.objects.create(
        documento=doc, etapa='asociado', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=f'Borrador creado en respuesta a {original.numero_documento or f"documento #{original.id}"}.',
        documento_relacionado=original,
    )
    SeguimientoDocumento.objects.create(
        documento=original, etapa='respondido', usuario=usuario,
        unidad=getattr(usuario, 'unidad', None),
        observacion=f'Respondido — borrador {doc.numero_documento or f"#{doc.id}"}.',
        documento_relacionado=doc,
    )
    return doc, sin_destinatario_auto


# ── Búsqueda acotada para asociar manualmente ──────────────────────────────
# El universo "documentos que el usuario puede conocer" es exactamente la ACL
# de lectura — fuente única en `acl_documentos.documentos_visibles_para`.
from .acl_documentos import documentos_visibles_para  # noqa: F401  (re-export)
