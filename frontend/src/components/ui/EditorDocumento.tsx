import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { documentosService, listasService, CrearDocumento, DocumentoDetalle } from '@/services/documentos.service';

import { usuariosService, Usuario } from '@/services/usuarios.service';
import { PLANTILLAS_TEXTO } from '@/constants/plantillas.constants';
import { X, FileText, Wand2, Eye, Save, AlertCircle, Search, Signature, Trash2, Paperclip, Users, Send } from 'lucide-react';
import logoPrefectura from '@/assets/logo-prefectura.svg';
import marcaAguaQuipux from '@/assets/marca_agua_quipux.png';
import ModalFirmaElectronica from '@/components/ui/ModalFirmaElectronica';
import AdjuntosPanel from '@/components/ui/AdjuntosPanel';

interface EditorDocumentoProps {
  onClose: () => void;
  onEnviado?: () => void;  // called after document is actually sent (with or without firma)
  documentoExistente?: DocumentoDetalle;
}

interface PersonaDocumento {
  id: number;
  nombre_completo: string;
  cargo: string;
  titulo: string;
  unidad_nombre: string | null;
  unidad_siglas: string | null;
  unidad_id: number | null;
  rol: 'para' | 'de' | 'copia';
}

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

export default function EditorDocumento({ onClose, onEnviado, documentoExistente }: EditorDocumentoProps) {
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
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<any>(null);
  const [docParaFirmar, setDocParaFirmar] = useState<any>(null);
  const [docGuardado, setDocGuardado] = useState<any>(esEdicion ? documentoExistente : null);
  const [accionPostGuardar, setAccionPostGuardar] = useState<'borrador' | 'firmar' | 'enviar' | 'reasignar'>('borrador');
  const [enviando, setEnviando] = useState(false);

  // --- Person search & assignment ---
  const [personas, setPersonas] = useState<PersonaDocumento[]>(() => {
    if (!esEdicion) return [];
    const lista: PersonaDocumento[] = [];
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
  const [busquedaPersona, setBusquedaPersona] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const buscadorRef = useRef<HTMLDivElement>(null);

  // --- Queries ---
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: () => usuariosService.perfil() });
  const { data: tipos } = useQuery({ queryKey: ['tipos-doc'], queryFn: documentosService.tipos });

  const { data: usuariosBusqueda } = useQuery({
    queryKey: ['usuarios-busqueda', busquedaPersona],
    queryFn: () => usuariosService.listar({ search: busquedaPersona }),
    enabled: busquedaPersona.length >= 2,
  });

  // Load all lists once, filter client-side so they always appear in the dropdown
  const { data: todasListas } = useQuery({
    queryKey: ['todas-listas-dist'],
    queryFn: () => listasService.buscar(''),
    staleTime: 5 * 60 * 1000,
  });
  const listasFiltradas = (todasListas ?? []).filter(l =>
    busquedaPersona.length < 2 || l.nombre.toLowerCase().includes(busquedaPersona.toLowerCase())
  );

  // --- Set tipoSeleccionado once tipos load (needed for both new and edit) ---
  useEffect(() => {
    if (tipos && form.tipo_documento) {
      const tipo = tipos.find(t => t.id === form.tipo_documento);
      if (tipo) setTipoSeleccionado(tipo);
    }
  }, [tipos, form.tipo_documento]);

  // --- Auto-add logged-in user as "de" (check inside updater to avoid stale closure) ---
  useEffect(() => {
    if (!perfil) return;
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
  }, [perfil]);

  // --- Close dropdown on outside click ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target as Node)) {
        setMostrarResultados(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Helpers ---
  const set = (k: keyof CrearDocumento, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mapUsuarioToPersona = (usuario: Usuario, rol: 'para' | 'de' | 'copia'): PersonaDocumento => ({
    id: usuario.id,
    nombre_completo: usuario.nombre_completo,
    cargo: usuario.cargo,
    titulo: usuario.titulo || '',
    unidad_nombre: usuario.unidad_nombre,
    unidad_siglas: usuario.unidad_siglas,
    unidad_id: usuario.unidad_id,
    rol,
  });

  const agregarPersona = (usuario: Usuario, rol: 'para' | 'de' | 'copia') => {
    const mapped = mapUsuarioToPersona(usuario, rol);
    if (rol === 'de') {
      setPersonas(prev => [...prev.filter(p => p.rol !== 'de'), mapped]);
    } else {
      if (personas.some(p => p.id === usuario.id && p.rol === rol)) return;
      setPersonas(prev => [...prev, mapped]);
    }
    setBusquedaPersona('');
    setMostrarResultados(false);
  };

  const eliminarPersona = (id: number, rol: string) => {
    setPersonas(prev => prev.filter(p => !(p.id === id && p.rol === rol)));
  };

  const agregarLista = (lista: import('@/services/documentos.service').ListaDistribucion) => {
    lista.miembros.forEach(m => {
      if (personas.some(p => p.id === m.id && p.rol === 'para')) return;
      setPersonas(prev => [...prev, {
        id: m.id,
        nombre_completo: m.nombre_completo,
        cargo: m.cargo,
        titulo: m.titulo,
        unidad_nombre: m.unidad_nombre,
        unidad_siglas: m.unidad_siglas,
        unidad_id: m.unidad_id,
        rol: 'para',
      }]);
    });
    setBusquedaPersona('');
    setMostrarResultados(false);
  };

  const personasDe    = personas.filter(p => p.rol === 'de');
  const personasPara  = personas.filter(p => p.rol === 'para');
  const personasCopia = personas.filter(p => p.rol === 'copia');
  // Si el DE es otra persona, el documento se guarda como borrador en SU bandeja.
  // El usuario actual no puede firmar ni enviar en nombre de otro.
  const esYoElRemitente = personasDe.length === 0 || (perfil != null && personasDe[0]?.id === perfil.id);

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setForm(f => ({ ...f, tipo_documento: id }));
    const tipo = tipos?.find(t => t.id === id);
    setTipoSeleccionado(tipo ?? null);
  };

  const cargarPlantilla = () => {
    if (!tipoSeleccionado) return;
    const prefijo = tipoSeleccionado.prefijo_numeracion ?? 'OFI';
    const plantillaHtml = PLANTILLAS_TEXTO[prefijo];
    if (plantillaHtml) {
      setCuerpo(plantillaHtml);
    }
  };

  // --- Mutations ---
  const onGuardadoExito = async (doc: any) => {
    qc.invalidateQueries({ queryKey: ['bandeja'] });
    qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
    qc.invalidateQueries({ queryKey: ['doc-detalle', doc.id] });
    setDocGuardado(doc);
    if (accionPostGuardar === 'firmar') {
      setDocParaFirmar(doc);
    } else if (accionPostGuardar === 'enviar') {
      try {
        await documentosService.enviar(doc.id);
        qc.invalidateQueries({ queryKey: ['bandeja'] });
        qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
      } catch (_) {}
      onEnviado ? onEnviado() : onClose();
    } else if (accionPostGuardar === 'reasignar') {
      const remitente = personasDe[0];
      if (remitente) {
        try {
          await documentosService.reasignarA(doc.id, remitente.id, remitente.unidad_id ?? null);
          qc.invalidateQueries({ queryKey: ['bandeja'] });
          qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
        } catch (_) {}
      }
      onClose();
    }
  };
  const onGuardadoError = (e: any) =>
    setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al guardar el documento');

  const mutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.crear(data),
    onSuccess: onGuardadoExito,
    onError: onGuardadoError,
  });

  const actualizarMutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.actualizar(documentoExistente!.id, data),
    onSuccess: onGuardadoExito,
    onError: onGuardadoError,
  });

  const isPending = mutation.isPending || actualizarMutation.isPending;

  // --- Validation ---
  const validarFormulario = (requiereDestinatario: boolean): boolean => {
    setError('');
    if (!form.tipo_documento || !form.asunto) {
      setError('Completa los campos obligatorios: tipo de documento y asunto');
      return false;
    }
    const personaDe = personas.find(p => p.rol === 'de');
    if (!personaDe) {
      setError('Debe asignar un remitente (De)');
      return false;
    }
    const unidadOrigen = personaDe.unidad_id || perfil?.unidad_id;
    if (!unidadOrigen) {
      setError('El remitente no tiene unidad asignada. Contacta al administrador.');
      return false;
    }
    if (requiereDestinatario && personasPara.length === 0) {
      setError('Debe asignar al menos un destinatario (Para)');
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
  const handleGuardar = () => {
    if (!validarFormulario(false)) return;
    setAccionPostGuardar('borrador');
    if (esEdicion) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  const handleFirmarYEnviar = () => {
    if (!validarFormulario(true)) return;
    setAccionPostGuardar('firmar');
    if (esEdicion) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  const handleEnviarSinFirma = () => {
    if (!validarFormulario(true)) return;
    setAccionPostGuardar('enviar');
    if (esEdicion) actualizarMutation.mutate(buildPayload());
    else mutation.mutate(buildPayload());
  };

  const handleGuardarYReasignar = () => {
    if (!validarFormulario(false)) return;
    setAccionPostGuardar('reasignar');
    mutation.mutate(buildPayload());
  };

  // When doc is already saved as draft → send directly without re-saving
  const handleEnviarDirecto = async () => {
    if (!docGuardado || enviando) return;
    setEnviando(true);
    try {
      await documentosService.enviar(docGuardado.id);
      qc.invalidateQueries({ queryKey: ['bandeja'] });
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
      onEnviado ? onEnviado() : onClose();
    } catch (_) {
      setError('Error al enviar el documento');
      setEnviando(false);
    }
  };

  // --- Render helpers ---
  const renderPersonaFila = (persona: PersonaDocumento, label: string | null, idx: number) => (
    <tr key={`${persona.rol}-${persona.id}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
      <td className="px-2 py-1.5 text-xs font-bold whitespace-nowrap" style={{
        color: persona.rol === 'de' ? '#0f6e56' : persona.rol === 'para' ? '#002f6c' : '#6b7280',
      }}>
        {label ?? ''}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-900 truncate max-w-[140px]" title={persona.nombre_completo}>
        {persona.nombre_completo}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-600 truncate max-w-[100px]" title={persona.cargo}>
        {persona.cargo || '-'}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500 text-center">
        {persona.unidad_siglas ? `[${persona.unidad_siglas}]` : '-'}
      </td>
      <td className="px-1 py-1.5 text-center">
        <button
          onClick={() => eliminarPersona(persona.id, persona.rol)}
          className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
          title="Borrar"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );

  const renderDatosDocumento = () => {
    const filas: React.ReactNode[] = [];
    let idx = 0;

    personasDe.forEach((p, i) => {
      filas.push(renderPersonaFila(p, i === 0 ? 'De:' : null, idx++));
    });
    personasPara.forEach((p, i) => {
      filas.push(renderPersonaFila(p, i === 0 ? 'Para:' : null, idx++));
    });
    personasCopia.forEach((p, i) => {
      filas.push(renderPersonaFila(p, i === 0 ? 'Copia:' : null, idx++));
    });

    return filas;
  };

  // ========================
  // RENDER
  // ========================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-[96vw] max-w-7xl h-[95vh]">

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
              onClick={() => setVistaPrevia(!vistaPrevia)}
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
        <div className="flex-1 overflow-hidden">
          {vistaPrevia ? (
            /* ---------- VISTA PREVIA ---------- */
            docGuardado ? (
              /* ── PDF real embebido cuando el doc está guardado ── */
              <PdfPreview docId={docGuardado.id} />
            ) : (
              /* ── HTML preview cuando aún no se ha guardado ── */
              <div className="h-full overflow-y-auto p-8 flex justify-center bg-[#525659]">
                <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] flex flex-col text-black relative overflow-hidden"
                     style={{ fontFamily: '"Times New Roman", "Liberation Serif", Times, serif', fontSize: '11pt', lineHeight: '1.18' }}>

                  {/* Marca de agua */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.06, zIndex: 0 }}>
                    <img src={marcaAguaQuipux} alt="" style={{ width: '60%', objectFit: 'contain' }} />
                  </div>

                  {/* ── ENCABEZADO ── */}
                  <div className="flex items-center justify-between relative z-10" style={{ padding: '14px 28px 8px' }}>
                    <img src="/escudo-cotopaxi.png" alt="Escudo GAD" style={{ width: 75, objectFit: 'contain' }}
                         onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <img src={logoPrefectura} alt="Prefectura" style={{ width: 170, objectFit: 'contain' }} />
                  </div>

                  {/* ── LÍNEA bicolor: roja izq | gap | azul der ── */}
                  <div style={{ display: 'flex', margin: 0 }}>
                    <div style={{ height: 2, flex: 1, background: '#da291c' }}></div>
                    <div style={{ flex: '0 0 3px' }}></div>
                    <div style={{ height: 2, flex: 1, background: '#002f6c' }}></div>
                  </div>

                  {/* ── CONTENIDO ── */}
                  <div className="flex-1 flex flex-col relative z-10" style={{ padding: '5mm 30mm 20mm 40mm' }}>

                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {tipoSeleccionado?.nombre ?? 'Documento'} Nro. (por asignar)
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      Latacunga, {new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>

                    <div style={{ marginTop: '22pt' }}>
                      <span style={{ fontWeight: 'bold' }}>PARA:</span>
                      <div style={{ paddingLeft: '56pt', marginTop: '2pt' }}>
                        {personasPara.length > 0 ? personasPara.map((p, i) => (
                          <div key={p.id} style={{ marginBottom: i < personasPara.length - 1 ? '11pt' : 0 }}>
                            <span>{p.nombre_completo}</span>
                            {p.cargo && <><br /><span style={{ fontWeight: 'bold' }}>{p.cargo}</span></>}
                            {p.unidad_nombre && <><br /><span style={{ fontWeight: 'bold' }}>{p.unidad_nombre}</span></>}
                          </div>
                        )) : <span style={{ color: '#aaa' }}>[Seleccione destinatario]</span>}
                      </div>
                    </div>
                    <div style={{ margin: '14pt 0' }}>
                      <span style={{ fontWeight: 'bold' }}>ASUNTO:</span>{' '}
                      {form.asunto || <span style={{ color: '#aaa' }}>[Escriba el asunto]</span>}
                    </div>

                    <div className="render-quill" style={{ textAlign: 'justify', flex: 1 }}
                         dangerouslySetInnerHTML={{ __html: cuerpo || '<p style="color:#aaa;font-style:italic">[Sin contenido]</p>' }} />

                    <div style={{ marginTop: '11pt' }}>
                      <p style={{ margin: '0 0 11pt 0' }}>Atentamente,</p>
                      <div style={{ width: '55mm', borderTop: '1pt solid #000', margin: '38pt 0 4pt' }}></div>
                      <div style={{ fontWeight: 'normal', lineHeight: '1.18' }}>
                        {personasDe[0]?.nombre_completo ?? '[Nombre del Funcionario]'}
                      </div>
                      {personasDe[0]?.cargo && (
                        <div style={{ fontWeight: 'bold', lineHeight: '1.18' }}>{personasDe[0].cargo}</div>
                      )}
                      {personasDe[0]?.unidad_nombre && (
                        <div style={{ fontWeight: 'bold', lineHeight: '1.18' }}>{personasDe[0].unidad_nombre}</div>
                      )}
                    </div>
                  </div>

                  {/* ── PIE DE PÁGINA ── */}
                  <div style={{ padding: '0 10mm 10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', marginBottom: 4 }}>
                      <div style={{ height: 2, flex: 1, background: '#da291c' }}></div>
                      <div style={{ flex: '0 0 3px' }}></div>
                      <div style={{ height: 2, flex: 1, background: '#002f6c' }}></div>
                    </div>
                    <div style={{ fontFamily: "'Liberation Sans', Calibri, Arial, sans-serif", fontSize: '7.5pt', color: '#333', textAlign: 'center', lineHeight: 1.6 }}>
                      <strong>Dir:</strong> Calle Tarqui N° 507 y Quito &nbsp;•&nbsp;
                      <strong>Telf:</strong> (03) 2800 416 - 2800 418 &nbsp;•&nbsp;
                      <strong>Telefax:</strong> 2800 411<br />
                      <strong>E-mail:</strong> info@cotopaxi.gob.ec &nbsp;•&nbsp;
                      www.cotopaxi.gob.ec &nbsp;•&nbsp; Cotopaxi - Ecuador
                    </div>
                  </div>
                </div>
              </div>
            )
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
                    className={clsInput}
                    placeholder="Asunto del documento"
                    value={form.asunto ?? ''}
                    onChange={e => set('asunto', e.target.value)}
                  />
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden min-h-0">
                  <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cuerpo del documento</label>
                    {tipoSeleccionado && (
                      <button
                        onClick={cargarPlantilla}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-[#002f6c] text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Wand2 size={14} /> Cargar plantilla
                      </button>
                    )}
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
                    <select className={clsInput} value={form.tipo_documento ?? ''} onChange={handleTipoChange}>
                      <option value="">-- Selecciona --</option>
                      {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    {tipoSeleccionado && (
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Prefijo: {tipoSeleccionado.prefijo_numeracion} -- Plazo: {tipoSeleccionado.dias_plazo_default} dias
                        {tipoSeleccionado.requiere_firma && ' -- Requiere firma'}
                      </p>
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

                  {/* ===== BUSCAR PERSONA / LISTA ===== */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                      <Search size={11} /> Buscar persona o lista de distribución
                    </label>
                    <div ref={buscadorRef} className="relative">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          className={`${clsInput} pl-9`}
                          placeholder="Nombre de funcionario o lista..."
                          value={busquedaPersona}
                          onChange={e => {
                            setBusquedaPersona(e.target.value);
                            setMostrarResultados(true);
                          }}
                          onFocus={() => setMostrarResultados(true)}
                        />
                      </div>

                      {/* Search results dropdown */}
                      {mostrarResultados && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-[260px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                          {/* Listas de distribución */}
                          {listasFiltradas.length > 0 && (
                            <>
                              <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                                <Users size={11} className="text-amber-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Listas de distribución</span>
                              </div>
                              {listasFiltradas.map(lista => (
                                <div
                                  key={`lista-${lista.id}`}
                                  className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 hover:bg-amber-50/60"
                                >
                                  <Users size={14} className="text-amber-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{lista.nombre}</p>
                                    <p className="text-[10px] text-gray-500 truncate">
                                      {lista.total_miembros} miembro{lista.total_miembros !== 1 ? 's' : ''}
                                      {lista.preview_miembros.length > 0 && ` · ${lista.preview_miembros.join(', ')}${lista.total_miembros > 3 ? '...' : ''}`}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => agregarLista(lista)}
                                    className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
                                    title="Agregar todos los miembros como destinatarios"
                                  >
                                    + Para
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                          {/* Funcionarios individuales */}
                          {usuariosBusqueda?.results && usuariosBusqueda.results.filter(u => u.activo).length > 0 && (
                            <>
                              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Funcionarios</span>
                              </div>
                              {usuariosBusqueda.results.filter(u => u.activo).map(u => (
                                <div
                                  key={u.id}
                                  className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{u.nombre_completo}</p>
                                    <p className="text-[10px] text-gray-500 truncate">
                                      {u.cargo || 'Sin cargo'}{u.unidad_siglas ? ` [${u.unidad_siglas}]` : ''}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => agregarPersona(u, 'para')}
                                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-[#002f6c] text-white hover:bg-[#002f6c]/80 transition-colors"
                                      title="Agregar como destinatario"
                                    >
                                      Para
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => agregarPersona(u, 'de')}
                                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-[#0f6e56] text-white hover:bg-[#0f6e56]/80 transition-colors"
                                      title="Agregar como remitente"
                                    >
                                      De
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => agregarPersona(u, 'copia')}
                                      className="px-2 py-1 text-[10px] font-bold rounded-md bg-gray-500 text-white hover:bg-gray-400 transition-colors"
                                      title="Agregar con copia"
                                    >
                                      Copia
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                          {/* Estado vacío */}
                          {listasFiltradas.length === 0 && !usuariosBusqueda?.results?.filter(u => u.activo).length && (
                            <div className="px-3 py-4 text-center text-sm text-gray-400">
                              {busquedaPersona.length < 2
                                ? 'Escriba al menos 2 caracteres para buscar funcionarios'
                                : 'No se encontraron resultados'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ===== DATOS DEL DOCUMENTO (tabla de personas asignadas) ===== */}
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Datos del documento
                    </label>

                    {personas.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl bg-white">
                        Busque y asigne personas al documento
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              <th className="px-2 py-1.5 w-[50px]">Tipo</th>
                              <th className="px-2 py-1.5">Nombre</th>
                              <th className="px-2 py-1.5">Cargo</th>
                              <th className="px-2 py-1.5 text-center w-[50px]">Area</th>
                              <th className="px-1 py-1.5 w-[30px]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {renderDatosDocumento()}
                          </tbody>
                        </table>
                      </div>
                    )}
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0">
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

            {!docGuardado ? (
              esYoElRemitente ? (
                /* ── Soy el remitente: tres opciones ── */
                <>
                  <button
                    onClick={handleGuardar}
                    disabled={isPending}
                    title="Guarda el borrador para revisarlo después"
                    className="px-4 py-2.5 text-sm font-bold text-[#002f6c] border border-[#002f6c] rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={15} />
                    Guardar borrador
                  </button>
                  <button
                    onClick={handleEnviarSinFirma}
                    disabled={isPending}
                    title="Envía el documento sin firma electrónica"
                    className="px-4 py-2.5 text-sm font-bold text-white bg-[#0f6e56] rounded-xl hover:bg-[#0f6e56]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && accionPostGuardar === 'enviar' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    Enviar sin firma
                  </button>
                  <button
                    onClick={handleFirmarYEnviar}
                    disabled={isPending}
                    title="Firma electrónicamente y envía el documento"
                    className="px-5 py-2.5 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && accionPostGuardar === 'firmar' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Signature size={16} />
                    )}
                    {isPending && accionPostGuardar === 'firmar' ? 'Procesando...' : 'Firmar y Enviar'}
                  </button>
                </>
              ) : (
                /* ── DE es otra persona: Aceptar (mi bandeja) o Aceptar y Reasignar ── */
                <>
                  <button
                    onClick={handleGuardar}
                    disabled={isPending}
                    title="Guarda el borrador en tu bandeja En elaboración"
                    className="px-4 py-2.5 text-sm font-bold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={15} />
                    {isPending && accionPostGuardar === 'borrador' ? 'Guardando...' : 'Aceptar'}
                  </button>
                  <button
                    onClick={handleGuardarYReasignar}
                    disabled={isPending}
                    title={`El documento irá a la bandeja En elaboración de ${personasDe[0]?.nombre_completo} para que lo firme y envíe`}
                    className="px-4 py-2.5 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                    {isPending && accionPostGuardar === 'reasignar' ? 'Reasignando...' : 'Aceptar y Reasignar'}
                  </button>
                </>
              )
            ) : !docParaFirmar ? (
              esYoElRemitente ? (
                /* ── Borrador guardado y soy remitente: enviar o firmar ── */
                <>
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
              ) : (
                /* ── Borrador guardado pero no soy el remitente ── */
                <p className="text-xs text-amber-600 font-medium">
                  Borrador creado. Solo {personasDe[0]?.nombre_completo} puede firmarlo y enviarlo.
                </p>
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
              try {
                await documentosService.enviar(docParaFirmar.id);
              } catch (_) {}
              qc.invalidateQueries({ queryKey: ['bandeja'] });
              qc.invalidateQueries({ queryKey: ['bandeja-conteos'] });
              setDocParaFirmar(null);
              onEnviado ? onEnviado() : onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
