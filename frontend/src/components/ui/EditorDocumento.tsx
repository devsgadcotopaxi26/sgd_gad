import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentosService, CrearDocumento, DocumentoDetalle } from '@/services/documentos.service';

import { usuariosService } from '@/services/usuarios.service';
import { X, FileText, Eye, Save, AlertCircle, Signature, Trash2, Paperclip, Users, Send } from 'lucide-react';
import ModalFirmaElectronica from '@/components/ui/ModalFirmaElectronica';
import AdjuntosPanel from '@/components/ui/AdjuntosPanel';
import SelectorPersonasModal from '@/components/ui/SelectorPersonasModal';

interface EditorDocumentoProps {
  // Cierra el editor sin persistir (Cancelar / salir de modo edición). El
  // contenedor (panel derecho de Gestión Documental) decide a qué vuelve.
  onClose: () => void;
  // Documento enviado (con o sin firma). Recibe el id del documento para
  // que el panel pueda seleccionarlo en la bandeja destino.
  onEnviado?: (docId?: number) => void;
  // Documento guardado Y reasignado exitosamente a otro responsable (el
  // remitente/DE). Distinto de onEnviado: el documento sigue en elaboración,
  // solo cambia de responsable — el contenedor decide a qué bandeja volver
  // (p. ej. "Reasignados", no "Enviados").
  onReasignado?: (docId?: number) => void;
  // Guardado como borrador exitoso (crear o editar), sin enviar. El panel
  // sale del modo editor y muestra el detalle del documento resultante.
  onGuardado?: (doc: any) => void;
  // Notifica al contenedor si hay cambios sin guardar respecto del estado
  // base (tras asentarse los auto-inits). El contenedor lo usa para pedir
  // confirmación antes de permitir navegar fuera del editor.
  onDirtyChange?: (dirty: boolean) => void;
  documentoExistente?: DocumentoDetalle;
}

export interface PersonaDocumento {
  id: number;
  nombre_completo: string;
  cargo: string;
  titulo: string;
  unidad_nombre: string | null;
  unidad_siglas: string | null;
  unidad_id: number | null;
  rol: 'para' | 'de' | 'copia';
  // tipo de Usuario ('funcionario' | 'ciudadano' | 'sistema'). Ausente para
  // personas venidas de una lista de distribución (siempre institucionales),
  // por eso esInternoPersona() trata "sin dato" como interno.
  tipo?: string;
}

// Interno = pertenece a la institución (Usuario.tipo !== 'ciudadano'), sin
// importar la unidad/dirección a la que pertenezca. 'ciudadano' es el único
// tipo de Usuario que representa a alguien externo a la institución.
const esInternoPersona = (p: PersonaDocumento) => p.tipo !== 'ciudadano';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote'],
    ['link'],
    ['clean'],
  ],
};

const clsInput = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/10 bg-white';

function PdfPreview({ docId }: { docId: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let objectUrl: string;
    setCargando(true);
    documentosService.obtenerUrlPDF(docId)
      .then(u => { objectUrl = u; setUrl(u); })
      .finally(() => setCargando(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [docId]);

  if (cargando) {
    return (
      <div className="h-full flex items-center justify-center bg-[#525659]">
        <div className="text-white text-sm flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generando vista previa…
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-full flex items-center justify-center bg-[#525659]">
        <p className="text-red-300 text-sm">No se pudo cargar la vista previa del PDF.</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
      title="Vista previa del documento"
    />
  );
}

export default function EditorDocumento({ onClose, onEnviado, onReasignado, onGuardado, onDirtyChange, documentoExistente }: EditorDocumentoProps) {
  const qc = useQueryClient();
  const esEdicion = !!documentoExistente;

  // --- Form state ---
  const [form, setForm] = useState<Partial<CrearDocumento>>(() =>
    esEdicion ? {
      tipo_documento: documentoExistente!.tipo_documento,
      asunto: documentoExistente!.asunto,
      prioridad: documentoExistente!.prioridad ?? 'normal',
      confidencial: documentoExistente!.confidencial ?? false,
      requiere_respuesta: documentoExistente!.requiere_respuesta ?? false,
      unidad_origen: documentoExistente!.unidad_origen ?? undefined,
    } : { prioridad: 'normal', confidencial: false }
  );
  const [cuerpo, setCuerpo] = useState(
    esEdicion
      ? (documentoExistente!.cuerpo ?? '')
      : '<p>De mi consideración,</p><p><br></p><p>Con sentimiento de distinguida consideración.</p>'
  );
  const [error, setError] = useState('');
  // Qué campo disparó el último error de validarDocumentoMinimo, para
  // marcarlo visualmente (mismo mecanismo de error, sin sistema paralelo).
  const [campoInvalido, setCampoInvalido] = useState<'tipo' | 'asunto' | 'destinatario' | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<any>(null);
  const [docParaFirmar, setDocParaFirmar] = useState<any>(null);
  const [docGuardado, setDocGuardado] = useState<any>(esEdicion ? documentoExistente : null);
  const [accionPostGuardar, setAccionPostGuardar] = useState<'borrador' | 'firmar' | 'enviar' | 'reasignar' | 'vista_previa'>('borrador');
  const [enviando, setEnviando] = useState(false);
  // El usuario tocó el selector de Tipo alguna vez (incluso para dejarlo
  // vacío): a partir de ahí la preselección automática de Memorando ya no
  // debe volver a pisar su elección, ni siquiera si queda vacía.
  const tipoTocadoRef = useRef(false);

  // --- Sugerencia contextual de tipo documental (Oficio + destinatario interno) ---
  const [sugerenciaTipo, setSugerenciaTipo] = useState<{
    tipoActualId: number; tipoActualNombre: string;
    tipoSugeridoId: number; tipoSugeridoNombre: string;
  } | null>(null);
  // Tipo (id) para el que el usuario ya dijo "mantener" en esta edición —
  // no persiste en BD, es solo para no insistir con la misma sugerencia.
  const tipoSugerenciaDescartadaRef = useRef<number | null>(null);

  // --- Person search & assignment ---
  const [personas, setPersonas] = useState<PersonaDocumento[]>(() => {
    if (!esEdicion) return [];
    const lista: PersonaDocumento[] = [];
    // DE persistido: el remitente designado si lo hay, o el creador si el
    // documento no tiene remitente distinto (mismo criterio que el backend
    // usa para decidir el titular de la bandeja al crear el documento). Se
    // reconstruye desde los datos guardados del documento, NUNCA desde el
    // usuario autenticado que lo está reabriendo.
    const deInfo = documentoExistente!.remitente_detalle ?? documentoExistente!.creado_por_detalle;
    if (deInfo) {
      lista.push({
        id: deInfo.id,
        nombre_completo: deInfo.nombre_completo,
        cargo: deInfo.cargo,
        titulo: deInfo.titulo || '',
        unidad_nombre: deInfo.unidad_nombre,
        unidad_siglas: deInfo.unidad_siglas,
        unidad_id: deInfo.unidad_id,
        rol: 'de',
        tipo: deInfo.tipo,
      });
    }
    if (documentoExistente!.destinatarios) {
      for (const d of documentoExistente!.destinatarios) {
        lista.push({
          id: d.usuario,
          nombre_completo: d.usuario_nombre,
          cargo: '',
          titulo: '',
          unidad_nombre: d.unidad_nombre,
          unidad_siglas: d.unidad_siglas,
          unidad_id: d.unidad ?? null,
          rol: 'para',
        });
      }
    }
    return lista;
  });
  // Modal de selección de personas: null = cerrado; 'remitente' | 'destinatarios'.
  // La búsqueda y selección de De/Para vive ahí (antes era un buscador embebido).
  const [selectorModo, setSelectorModo] = useState<'remitente' | 'destinatarios' | null>(null);

  // --- Queries ---
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: () => usuariosService.perfil() });
  const { data: tipos } = useQuery({ queryKey: ['tipos-doc'], queryFn: documentosService.tipos });

  // --- Set tipoSeleccionado once tipos load (needed for both new and edit) ---
  useEffect(() => {
    if (tipos && form.tipo_documento) {
      const tipo = tipos.find(t => t.id === form.tipo_documento);
      if (tipo) setTipoSeleccionado(tipo);
    }
  }, [tipos, form.tipo_documento]);

  // --- Auto-add logged-in user as "de" — SOLO para documentos nuevos. ---
  // En edición, el "De" ya viene fijado por el useState inicial a partir de
  // documentoExistente (remitente guardado, o el creador si no hay remitente
  // distinto): no debe recalcularse aquí ni pisarse con el usuario que está
  // reabriendo el documento, sea o no la misma persona.
  useEffect(() => {
    if (esEdicion || !perfil) return;
    setPersonas(prev => {
      if (prev.some(p => p.rol === 'de')) return prev;
      return [{
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        cargo: perfil.cargo,
        titulo: perfil.titulo || '',
        unidad_nombre: perfil.unidad_nombre,
        unidad_siglas: perfil.unidad_siglas,
        unidad_id: perfil.unidad_id,
        rol: 'de',
      }, ...prev];
    });
  }, [perfil, esEdicion]);

  // --- Helpers ---
  const set = (k: keyof CrearDocumento, v: any) => setForm(f => ({ ...f, [k]: v }));

  const eliminarPersona = (id: number, rol: string) => {
    setPersonas(prev => prev.filter(p => !(p.id === id && p.rol === rol)));
  };

  // Aplicado SOLO al pulsar "Aceptar" en el modal (nunca durante la selección
  // temporal): recién aquí cambia `personas` → recién aquí el documento pasa a
  // "modificado" y se re-evalúa la sugerencia Oficio→Memorando.
  const aplicarRemitente = (arr: PersonaDocumento[]) => {
    const p = arr[0];
    if (p) setPersonas(prev => [{ ...p, rol: 'de' }, ...prev.filter(x => x.rol !== 'de')]);
    setSelectorModo(null);
  };
  const aplicarDestinatarios = (arr: PersonaDocumento[]) => {
    setPersonas(prev => [
      ...prev.filter(x => x.rol !== 'para'),
      ...arr.map(p => ({ ...p, rol: 'para' as const })),
    ]);
    setSelectorModo(null);
  };

  const personasDe    = personas.filter(p => p.rol === 'de');
  const personasPara  = personas.filter(p => p.rol === 'para');
  // Si el DE es otra persona, el documento se guarda como borrador en SU bandeja.
  // El usuario actual no puede firmar ni enviar en nombre de otro.
  const esYoElRemitente = personasDe.length === 0 || (perfil != null && personasDe[0]?.id === perfil.id);

  // --- Limpiar la marca visual de campo inválido en cuanto se corrige ---
  useEffect(() => {
    if (campoInvalido === 'tipo' && form.tipo_documento) setCampoInvalido(null);
    if (campoInvalido === 'asunto' && form.asunto && form.asunto.trim()) setCampoInvalido(null);
    if (campoInvalido === 'destinatario' && personasPara.length > 0) setCampoInvalido(null);
  }, [campoInvalido, form.tipo_documento, form.asunto, personasPara]);

  // ─── Detección de cambios sin guardar (centralizada) ───────────────────────
  // Serialización normalizada del estado editable — se compara contra una
  // "línea base" capturada UNA vez que los auto-inits se asientan (Memorando
  // preseleccionado, remitente auto-agregado, texto inicial del cuerpo). Esos
  // valores automáticos forman parte de la base y NO cuentan como edición.
  const serializarEstado = () => JSON.stringify({
    tipo: form.tipo_documento ?? null,
    asunto: (form.asunto ?? '').trim(),
    prioridad: form.prioridad ?? 'normal',
    confidencial: !!form.confidencial,
    requiere_respuesta: !!form.requiere_respuesta,
    // ReactQuill deja "<p><br></p>" en vacío y varía espacios irrelevantes.
    cuerpo: (cuerpo ?? '').replace(/<p>(\s|<br\s*\/?>)*<\/p>/gi, '').replace(/\s+/g, ' ').trim(),
    personas: [...personas].map(p => `${p.rol}:${p.id}:${p.unidad_id ?? ''}`).sort(),
  });
  const baseRef = useRef<string | null>(null);
  const preBaseRef = useRef<string | null>(null);
  const [tickBase, setTickBase] = useState(0);
  const dirtyReportadoRef = useRef<boolean | null>(null);
  const reportarDirty = (d: boolean) => {
    if (dirtyReportadoRef.current === d) return;   // evita setState repetidos en el padre
    dirtyReportadoRef.current = d;
    onDirtyChange?.(d);
  };

  // 1) Captura de la línea base: cuando perfil y tipos están cargados y la
  //    serialización no cambia entre dos renders (ya corrieron los efectos de
  //    auto-init: Memorando preseleccionado, remitente auto-agregado, etc.).
  useEffect(() => {
    if (baseRef.current !== null || !perfil || !tipos) return;
    const actual = serializarEstado();
    if (actual === preBaseRef.current) {
      baseRef.current = actual;
      reportarDirty(false);
    } else {
      preBaseRef.current = actual;
      setTickBase(t => t + 1);   // fuerza un render más para verificar estabilidad
    }
  }, [tickBase, perfil, tipos, form, cuerpo, personas]);

  // 2) Comparación continua contra la base una vez capturada.
  useEffect(() => {
    if (baseRef.current === null) return;
    reportarDirty(serializarEstado() !== baseRef.current);
  }, [form, cuerpo, personas]);

  // 3) Recarga / cierre de pestaña con cambios sin guardar → aviso nativo.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyReportadoRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // --- Valor inicial: Memorando, si existe/está habilitado (catálogo real) ---
  // Cubre tanto "al abrir el modal" como "el tipo sigue vacío y se agregó un
  // destinatario interno": mientras no haya tipo elegido, se completa con
  // Memorando en cuanto el catálogo lo permita. No aplica en edición (el
  // documento existente ya trae su tipo) ni una vez que el usuario tocó el
  // selector alguna vez — ni siquiera si lo dejó vacío a propósito.
  useEffect(() => {
    if (esEdicion || tipoTocadoRef.current || form.tipo_documento || !tipos) return;
    const memo = tipos.find(t => t.codigo === 'MEM');
    if (!memo) return; // Memorando no existe o no está habilitado: se deja vacío
    setForm(f => ({ ...f, tipo_documento: memo.id }));
    setTipoSeleccionado(memo);
  }, [tipos, esEdicion, form.tipo_documento, personasPara]);

  // --- Detectar inconsistencia OFICIO + destinatario(s) interno(s) ---
  // Solo sugiere (nunca cambia solo); se pregunta una vez por tipo y se
  // respeta la decisión mientras dure esta edición (sin volver a insistir).
  useEffect(() => {
    if (!tipos || personasPara.length === 0) { setSugerenciaTipo(null); return; }
    const tipoActual = tipos.find(t => t.id === form.tipo_documento);
    const memo = tipos.find(t => t.codigo === 'MEM');
    if (!tipoActual || !memo || tipoActual.codigo !== 'OFI') { setSugerenciaTipo(null); return; }

    const todosInternos = personasPara.every(esInternoPersona);
    if (!todosInternos) { setSugerenciaTipo(null); return; }

    if (tipoSugerenciaDescartadaRef.current === tipoActual.id) return;

    setSugerenciaTipo({
      tipoActualId: tipoActual.id, tipoActualNombre: tipoActual.nombre,
      tipoSugeridoId: memo.id, tipoSugeridoNombre: memo.nombre,
    });
  }, [personasPara, form.tipo_documento, tipos]);

  const aceptarSugerenciaTipo = () => {
    if (!sugerenciaTipo) return;
    tipoTocadoRef.current = true;
    const memo = tipos?.find(t => t.id === sugerenciaTipo.tipoSugeridoId);
    // Mismo mecanismo que el selector manual (handleTipoChange): solo cambia
    // tipo_documento y tipoSeleccionado. No toca cuerpo/asunto/destinatarios/
    // anexos — cambiar de tipo nunca reemplaza lo que el usuario redactó.
    setForm(f => ({ ...f, tipo_documento: sugerenciaTipo.tipoSugeridoId }));
    if (memo) setTipoSeleccionado(memo);
    setSugerenciaTipo(null);
  };

  const rechazarSugerenciaTipo = () => {
    if (!sugerenciaTipo) return;
    tipoSugerenciaDescartadaRef.current = sugerenciaTipo.tipoActualId;
    setSugerenciaTipo(null);
  };

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // '' (opción "-- Selecciona --") debe quedar como "sin tipo", no como 0
    // — Number('') es 0, que es falsy igual que undefined, pero un id real
    // de catálogo nunca es 0, así que representarlo como undefined evita
    // que el efecto de preselección lo confunda con "aún no elegido" y lo
    // vuelva a pisar con Memorando apenas el usuario intenta limpiarlo.
    tipoTocadoRef.current = true;
    const id = e.target.value ? Number(e.target.value) : undefined;
    setForm(f => ({ ...f, tipo_documento: id }));
    const tipo = tipos?.find(t => t.id === id);
    setTipoSeleccionado(tipo ?? null);
  };

  // --- Mutations ---
  const onGuardadoExito = async (doc: any) => {
    qc.invalidateQueries({ queryKey: ['bandeja'] });
    qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
    qc.invalidateQueries({ queryKey: ['doc-detalle', doc.id] });
    setDocGuardado(doc);
    // El guardado (crear/actualizar) YA persistió el contenido actual: a
    // partir de aquí esa versión ES la línea base, sin importar si el paso
    // siguiente (enviar/reasignar/firmar) tiene éxito o falla. "Cambios sin
    // guardar" y "error al enviar/reasignar" son conceptos distintos — que
    // el envío/reasignación falle no significa que el contenido no se haya
    // guardado, así que no debe reaparecer la advertencia de cambios sin
    // guardar por eso.
    baseRef.current = serializarEstado();
    reportarDirty(false);
    if (accionPostGuardar === 'firmar') {
      setDocParaFirmar(doc);
    } else if (accionPostGuardar === 'enviar') {
      try {
        await documentosService.enviar(doc.id);
        qc.invalidateQueries({ queryKey: ['bandeja'] });
        qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
        onEnviado ? onEnviado(doc.id) : onClose();
      } catch (e: any) {
        setError(e.response?.data?.detail || 'El borrador se guardó, pero no se pudo enviar. Intente nuevamente.');
      }
    } else if (accionPostGuardar === 'reasignar') {
      const remitente = personasDe[0];
      if (!remitente) { onReasignado ? onReasignado(doc.id) : onClose(); return; }
      try {
        await documentosService.reasignarA(doc.id, remitente.id, remitente.unidad_id ?? null);
        qc.invalidateQueries({ queryKey: ['bandeja'] });
        qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
        // Solo se sale del editor cuando la reasignación TAMBIÉN tuvo éxito
        // — nunca antes de confirmarlo (§5). El documento sigue en
        // elaboración, solo cambia de responsable: es un cierre distinto de
        // "enviado" (onReasignado, no onEnviado).
        onReasignado ? onReasignado(doc.id) : onClose();
      } catch (e: any) {
        // El guardado sí tuvo éxito (dirty ya está en false); solo falló la
        // reasignación. Se queda en el editor mostrando el error — no se
        // pierde el trabajo ni se confunde con "cambios sin guardar".
        setError(e.response?.data?.detail || e.response?.data?.error || 'El documento se guardó, pero no se pudo reasignar. Intente nuevamente.');
      }
    } else if (accionPostGuardar === 'vista_previa') {
      // Vista previa (Quipux): primero se garantiza que el documento exista/
      // esté actualizado (arriba, vía create/update), y solo entonces se
      // muestra el PDF real generado desde esa versión persistida (la línea
      // base ya se actualizó arriba, antes de este bloque).
      setVistaPrevia(true);
    } else {
      // accionPostGuardar === 'borrador': el documento quedó guardado/
      // actualizado en "En elaboración". El panel derecho sale del modo
      // editor y pasa a mostrar el detalle del documento resultante — así
      // no se queda un editor "híbrido" abierto indefinidamente.
      onGuardado ? onGuardado(doc) : onClose();
    }
  };
  const onGuardadoError = (e: any) =>
    setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al guardar el documento');

  const mutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.crear(data),
    onSuccess: onGuardadoExito,
    onError: onGuardadoError,
  });

  // docGuardado (no el prop documentoExistente) es la fuente de verdad de
  // "qué documento actualizar": puede ser el que llegó por prop, o uno
  // recién creado en esta misma sesión de edición tras el primer Guardar.
  const actualizarMutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.actualizar(docGuardado!.id, data),
    onSuccess: onGuardadoExito,
    onError: onGuardadoError,
  });

  const isPending = mutation.isPending || actualizarMutation.isPending;

  // --- Validation ---
  // Condición mínima única para guardar borrador, abrir vista previa o
  // enviar: tipo de documento, asunto y al menos un destinatario (Para).
  const validarDocumentoMinimo = (): boolean => {
    setError('');
    setCampoInvalido(null);
    if (!form.tipo_documento) {
      setError('Seleccione el tipo de documento.');
      setCampoInvalido('tipo');
      return false;
    }
    if (!form.asunto || !form.asunto.trim()) {
      setError('Ingrese el asunto.');
      setCampoInvalido('asunto');
      return false;
    }
    const personaDe = personas.find(p => p.rol === 'de');
    if (!personaDe) {
      setError('Debe asignar un remitente (De).');
      return false;
    }
    const unidadOrigen = personaDe.unidad_id || perfil?.unidad_id;
    if (!unidadOrigen) {
      setError('El remitente no tiene unidad asignada. Contacta al administrador.');
      return false;
    }
    if (personasPara.length === 0) {
      setError('Seleccione al menos un destinatario (Para).');
      setCampoInvalido('destinatario');
      return false;
    }
    return true;
  };

  const buildPayload = (): CrearDocumento => {
    const personaDe = personas.find(p => p.rol === 'de')!;
    const unidadOrigen = personaDe.unidad_id || perfil?.unidad_id!;
    const destinatariosIds = personasPara.map(p => p.id);
    const remitente_id = (perfil && personaDe.id !== perfil.id) ? personaDe.id : null;
    return {
      ...form,
      tipo_documento: form.tipo_documento!,
      asunto: form.asunto!,
      unidad_origen: unidadOrigen,
      unidad_destino: personasPara[0]?.unidad_id || undefined,
      destinatarios_ids: destinatariosIds,
      cuerpo,
      palabras_clave: [],
      remitente_id,
    } as CrearDocumento;
  };

  // --- Actions ---
  // docGuardado (no el prop esEdicion) decide si Guardar crea o actualiza:
  // un documento nuevo puede guardarse una vez, seguir editándose, y
  // guardarse de nuevo — a partir de ahí ya es "actualizar", igual que un
  // documento abierto desde En elaboración.
  const handleGuardar = () => {
    if (!validarDocumentoMinimo()) return;
    setAccionPostGuardar('borrador');
    if (docGuardado) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  const handleGuardarYReasignar = () => {
    if (!validarDocumentoMinimo()) return;
    setAccionPostGuardar('reasignar');
    // Igual que handleGuardar: si el documento ya existe (p. ej. se abrió
    // directo desde "En elaboración" — docGuardado viene poblado desde el
    // primer render), debe ACTUALIZARSE, no crear un documento nuevo (§9:
    // la reasignación trabaja sobre el mismo Documento.id).
    if (docGuardado) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  // Documento ya constituido (En elaboración) → enviar directo, sin volver
  // a guardar. Se revalida igual: un borrador guardado no garantiza que
  // siga siendo válido si se editó algo después sin guardar.
  const handleEnviarDirecto = async () => {
    if (!docGuardado || enviando) return;
    if (!validarDocumentoMinimo()) return;
    setEnviando(true);
    try {
      await documentosService.enviar(docGuardado.id);
      qc.invalidateQueries({ queryKey: ['bandeja'] });
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
      onEnviado ? onEnviado(docGuardado.id) : onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al enviar el documento');
      setEnviando(false);
    }
  };

  // Vista previa (comportamiento Quipux): valida, y luego guarda/actualiza
  // el documento EN ELABORACIÓN antes de generar la previsualización — así
  // el PDF siempre refleja lo que hay en el editor, nunca una versión
  // vieja ni una simulación aparte. Nunca envía. Si el guardado falla,
  // onGuardadoError ya deja el mensaje en `error` y jamás se llega a abrir.
  const handleToggleVistaPrevia = () => {
    if (vistaPrevia) { setVistaPrevia(false); return; }
    if (!validarDocumentoMinimo()) return;
    setAccionPostGuardar('vista_previa');
    if (docGuardado) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  // ========================
  // RENDER
  // ========================
  return (
    /* Integrado en el panel derecho de Gestión Documental (no es un modal):
       llena el contenedor que lo aloja y gestiona su propia altura con
       flex + min-h-0, para evitar scrolls anidados con el panel. */
    <div className="bg-white flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50">
              <FileText size={15} className="text-[#002f6c]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{esEdicion ? 'Editar documento' : 'Nuevo documento'}</h3>
              <p className="text-xs text-gray-400">
                {tipoSeleccionado ? `${tipoSeleccionado.nombre} -- Numeracion al firmar` : 'Selecciona el tipo de documento'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVistaPrevia}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${vistaPrevia ? 'bg-blue-50 border-blue-200 text-[#002f6c]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Eye size={14} /> Vista previa
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {vistaPrevia ? (
            /* ---------- VISTA PREVIA ----------
               handleToggleVistaPrevia siempre valida y guarda/actualiza
               ANTES de poner vistaPrevia=true, así que al llegar aquí
               docGuardado ya existe: un solo camino (PDF real del backend,
               generado desde lo que se acaba de persistir), sin simulación
               HTML aparte ni placeholders. */
            docGuardado && <PdfPreview docId={docGuardado.id} />
          ) : (
            /* ---------- FORMULARIO - 2 COLUMNAS ---------- */
            <div className="h-full flex">

              {/* ===== COLUMNA IZQUIERDA (65%) - Editor ===== */}
              <div className="flex-[65] flex flex-col p-5 overflow-y-auto border-r border-gray-100">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                    <AlertCircle size={16} className="flex-shrink-0" /> {error}
                  </div>
                )}

                {/* Asunto */}
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Asunto *</label>
                  <input
                    className={`${clsInput} ${campoInvalido === 'asunto' ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                    placeholder="Asunto del documento"
                    value={form.asunto ?? ''}
                    onChange={e => set('asunto', e.target.value)}
                  />
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden min-h-0">
                  <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cuerpo del documento</label>
                  </div>
                  <div className="flex-1 overflow-y-auto [&_.quill]:h-full [&_.ql-container]:border-none [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-[11pt] [&_.ql-editor]:font-serif [&_.ql-editor]:leading-relaxed">
                    <ReactQuill
                      theme="snow"
                      value={cuerpo}
                      onChange={setCuerpo}
                      modules={QUILL_MODULES}
                      placeholder="Redacta el contenido del documento..."
                    />
                  </div>
                </div>
              </div>

              {/* ===== COLUMNA DERECHA (35%) - Metadatos + Personas ===== */}
              <div className="flex-[35] flex flex-col overflow-y-auto bg-gray-50/50">
                <div className="p-4 flex flex-col gap-4">

                  {/* Tipo de documento */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipo de documento *</label>
                    <select
                      className={`${clsInput} ${campoInvalido === 'tipo' ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                      value={form.tipo_documento ?? ''}
                      onChange={handleTipoChange}
                    >
                      <option value="">-- Selecciona --</option>
                      {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    {tipoSeleccionado && (
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Prefijo: {tipoSeleccionado.prefijo_numeracion} -- Plazo: {tipoSeleccionado.dias_plazo_default} dias
                        {tipoSeleccionado.requiere_firma && ' -- Requiere firma'}
                      </p>
                    )}
                    {sugerenciaTipo && (
                      <div className="mt-2 p-3 rounded-xl border" style={{ background: '#fffbeb', borderColor: '#fbbf24' }}>
                        <p className="text-xs text-amber-800 mb-2 leading-relaxed">
                          El destinatario pertenece a la institución. Para comunicaciones internas normalmente corresponde utilizar un {sugerenciaTipo.tipoSugeridoNombre}. ¿Desea cambiar el tipo de documento a {sugerenciaTipo.tipoSugeridoNombre}?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={aceptarSugerenciaTipo}
                            className="px-3 py-1.5 text-[11px] font-bold text-white rounded-lg"
                            style={{ background: '#92400e' }}
                          >
                            Cambiar a {sugerenciaTipo.tipoSugeridoNombre}
                          </button>
                          <button
                            type="button"
                            onClick={rechazarSugerenciaTipo}
                            className="px-3 py-1.5 text-[11px] font-medium text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50"
                          >
                            Mantener {sugerenciaTipo.tipoActualNombre}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prioridad */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prioridad</label>
                    <select className={clsInput} value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="urgente">Urgente</option>
                      <option value="muy_urgente">Muy urgente</option>
                    </select>
                  </div>

                  {/* ===== DESTINATARIOS ===== */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${campoInvalido === 'destinatario' ? 'text-red-500' : 'text-gray-500'}`}>
                      Destinatarios *
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectorModo('destinatarios')}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        campoInvalido === 'destinatario'
                          ? 'border-red-400 text-red-600 bg-red-50 hover:bg-red-100'
                          : 'border-blue-200 text-[#002f6c] bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <Users size={14} />
                      {personasPara.length === 0
                        ? 'Seleccionar destinatarios'
                        : `Editar destinatarios (${personasPara.length})`}
                    </button>
                  </div>

                  {/* ===== DATOS DEL DOCUMENTO (resumen De / Para) ===== */}
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Datos del documento
                    </label>

                    {/* De — remitente (obligatorio: se cambia, no se elimina) */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0f6e56' }}>De</span>
                        <button
                          type="button"
                          onClick={() => setSelectorModo('remitente')}
                          className="text-[10px] font-bold text-[#002f6c] hover:underline"
                        >
                          Cambiar
                        </button>
                      </div>
                      {personasDe.length === 0 ? (
                        <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg py-2 text-center">
                          Sin remitente
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-900 truncate" title={personasDe[0].nombre_completo}>
                            {personasDe[0].nombre_completo}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {personasDe[0].cargo || '—'}
                            {personasDe[0].unidad_siglas ? ` · ${personasDe[0].unidad_siglas}` : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Para — destinatarios (se pueden quitar aquí o desde el modal) */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#002f6c' }}>Para</span>
                      {personasPara.length === 0 ? (
                        <div className={`text-center py-4 text-xs border border-dashed rounded-lg bg-white ${campoInvalido === 'destinatario' ? 'border-red-300 text-red-400' : 'border-gray-300 text-gray-400'}`}>
                          Ningún destinatario seleccionado
                        </div>
                      ) : (
                        <div className={`bg-white rounded-lg border divide-y divide-gray-100 ${campoInvalido === 'destinatario' ? 'border-red-300' : 'border-gray-200'}`}>
                          {personasPara.map(p => (
                            <div key={`para-${p.id}`} className="flex items-center gap-2 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate" title={p.nombre_completo}>{p.nombre_completo}</p>
                                <p className="text-[10px] text-gray-500 truncate">
                                  {p.cargo || '—'}{p.unidad_siglas ? ` · ${p.unidad_siglas}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => eliminarPersona(p.id, 'para')}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                                title="Quitar destinatario"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!form.confidencial}
                        onChange={e => set('confidencial', e.target.checked)}
                        className="w-4 h-4 text-[#002f6c] rounded border-gray-300 focus:ring-[#002f6c]"
                      />
                      Confidencial
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!form.requiere_respuesta}
                        onChange={e => set('requiere_respuesta', e.target.checked)}
                        className="w-4 h-4 text-[#002f6c] rounded border-gray-300 focus:ring-[#002f6c]"
                      />
                      Requiere respuesta
                    </label>
                  </div>

                  {/* === ANEXOS === */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip size={13} style={{ color: '#002f6c' }} />
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Anexos</label>
                    </div>
                    {docGuardado ? (
                      <AdjuntosPanel documentoId={docGuardado.id} />
                    ) : (
                      <div className="text-center py-3 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        Guarda el borrador primero para adjuntar archivos
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <p className="text-xs text-gray-400">
            {docGuardado ? `Documento guardado: ${docGuardado.numero_documento || 'borrador'}` : 'El numero se asigna al firmar y enviar'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {docGuardado ? 'Cerrar' : 'Cancelar'}
            </button>

            {!docParaFirmar ? (
              esYoElRemitente ? (
                !docGuardado ? (
                  /* ── Documento todavía no constituido: solo Guardar. ──
                     Enviar/Firmar son acciones del ciclo posterior —
                     aparecen una vez que el documento existe. */
                  <button
                    onClick={handleGuardar}
                    disabled={isPending}
                    title="Guarda el documento en elaboración para continuar editándolo"
                    className="px-4 py-2.5 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && accionPostGuardar === 'borrador' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    {isPending && accionPostGuardar === 'borrador' ? 'Guardando...' : 'Guardar'}
                  </button>
                ) : (
                  /* ── Documento en elaboración y soy remitente: seguir
                     guardando, o pasar a enviar/firmar cuando esté listo ── */
                  <>
                    <button
                      onClick={handleGuardar}
                      disabled={isPending}
                      title="Guarda los cambios sin enviar"
                      className="px-4 py-2.5 text-sm font-bold text-[#002f6c] border border-[#002f6c] rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending && accionPostGuardar === 'borrador' ? (
                        <span className="w-4 h-4 border-2 border-[#002f6c]/30 border-t-[#002f6c] rounded-full animate-spin" />
                      ) : (
                        <Save size={15} />
                      )}
                      Guardar
                    </button>
                    <button
                      onClick={handleEnviarDirecto}
                      disabled={enviando}
                      title="Envía el documento sin firma electrónica"
                      className="px-4 py-2.5 text-sm font-bold text-white bg-[#0f6e56] rounded-xl hover:bg-[#0f6e56]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enviando ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      Enviar sin firma
                    </button>
                    <button
                      onClick={() => setDocParaFirmar(docGuardado)}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors flex items-center gap-2"
                    >
                      <Signature size={16} />
                      Firmar y Enviar
                    </button>
                  </>
                )
              ) : (
                /* ── DE es otra persona: Guardar (mi bandeja) o Guardar y
                   reasignar — disponible tanto para un documento nuevo como
                   para uno ya guardado (§8/§9/§23: la responsabilidad puede
                   volver a transferirse mientras yo no sea el remitente). ── */
                <>
                  <button
                    onClick={handleGuardar}
                    disabled={isPending}
                    title="Guarda el borrador en tu bandeja En elaboración"
                    className="px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={15} />
                    {isPending && accionPostGuardar === 'borrador' ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleGuardarYReasignar}
                    disabled={isPending}
                    title={`El documento irá a la bandeja En elaboración de ${personasDe[0]?.nombre_completo} para que lo firme y envíe`}
                    className="px-4 py-2.5 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                    {isPending && accionPostGuardar === 'reasignar' ? 'Reasignando...' : 'Guardar y reasignar'}
                  </button>
                </>
              )
            ) : null}
          </div>
        </div>

        {/* ===== MODAL FIRMA ELECTRONICA ===== */}
        {docParaFirmar && (
          <ModalFirmaElectronica
            documentoId={docParaFirmar.id}
            numeroDocumento={docParaFirmar.numero_documento || 'Borrador'}
            onClose={() => {
              setDocParaFirmar(null);
              onClose();
            }}
            onFirmado={async () => {
              // La firma ya se registró en el backend; el envío es un paso
              // aparte que puede fallar y no debe ocultarse ni darse por hecho.
              try {
                await documentosService.enviar(docParaFirmar.id);
                qc.invalidateQueries({ queryKey: ['bandeja'] });
                qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
                const idFirmado = docParaFirmar.id;
                setDocParaFirmar(null);
                onEnviado ? onEnviado(idFirmado) : onClose();
              } catch (e: any) {
                qc.invalidateQueries({ queryKey: ['bandeja'] });
                qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
                setDocParaFirmar(null);
                setError(e.response?.data?.detail || 'El documento se firmó, pero no se pudo enviar. Intente nuevamente.');
              }
            }}
          />
        )}

        {/* ===== SELECTOR DE PERSONAS (remitente / destinatarios) =====
           Modal amplio: trabaja sobre selección temporal; solo "Aceptar"
           aplica los cambios a `personas`. Cancelar / X / backdrop no tocan
           nada (y por tanto no marcan el documento como modificado). */}
        {selectorModo && (
          <SelectorPersonasModal
            modo={selectorModo}
            seleccionActual={selectorModo === 'remitente' ? personasDe : personasPara}
            onAceptar={selectorModo === 'remitente' ? aplicarRemitente : aplicarDestinatarios}
            onCancelar={() => setSelectorModo(null)}
          />
        )}
      </div>
    </div>
  );
}
