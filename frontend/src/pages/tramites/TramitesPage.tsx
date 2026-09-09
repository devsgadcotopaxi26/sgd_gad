import { useState, useRef, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { tramitesService, Persona, TramiteDetalle } from '@/services/tramites.service'
import { adjuntosService } from '@/services/adjuntos.service'
import { usePermisosStore } from '@/store/permisosStore'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import VincularExpedienteModal from '@/components/ui/VincularExpedienteModal'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Search, Plus, X,
  CheckCircle, AlertTriangle,
  User, Calendar, Archive, Settings,
  FileText, Paperclip, Loader2, History, Pencil, Save,
  Phone, Briefcase, IdCard
} from 'lucide-react'

// Extrae un mensaje legible de un error de axios/DRF sin nunca exponer HTML
// crudo (páginas de error de Django) ni un objeto JSON sin procesar al
// usuario — solo se usan los valores de texto que DRF ya entrega listos
// para mostrar (errores de validación, PermissionDenied, etc.).
function mensajeError(e: any, fallback: string): string {
  const data = e?.response?.data
  if (!data || typeof data === 'string') return fallback
  const valores = Object.values(data).flat().filter(v => typeof v === 'string')
  return valores.join(' ') || fallback
}

async function subirAdjuntoTramite(tramiteId: number, file: File, tipo: 'documento' | 'anexo') {
  const fd = new FormData()
  fd.append('archivo', file)
  fd.append('tipo', tipo)
  fd.append('tramite', String(tramiteId))
  return adjuntosService.subir(fd)
}

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  ingresado:     { bg: '#f0f9ff', text: '#0369a1', label: 'Ingresado' },
  asignado:      { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso:    { bg: '#eff6ff', text: '#1d4ed8', label: 'En proceso' },
  en_inspeccion: { bg: '#fff7ed', text: '#c2410c', label: 'En inspección' },
  resuelto:      { bg: '#f0fdf4', text: '#15803d', label: 'Resuelto' },
  rechazado:     { bg: '#fef2f2', text: '#dc2626', label: 'Rechazado' },
  desistido:     { bg: '#f9fafb', text: '#6b7280', label: 'Desistido' },
  archivado:     { bg: '#f9fafb', text: '#6b7280', label: 'Archivado' },
}

const PRIORIDAD: Record<string, { color: string; label: string }> = {
  normal:      { color: '#9ca3af', label: 'Normal' },
  urgente:     { color: '#f59e0b', label: 'Urgente' },
  muy_urgente: { color: '#ef4444', label: 'Muy urgente' },
}

const CANAL_LABEL: Record<string, string> = {
  ventanilla: 'Ventanilla',
  email:      'Correo electrónico',
  web:        'Digital / Web',
}

function DiasRestantes({ dias }: { dias: number | null }) {
  if (dias === null) return null
  if (dias < 0)   return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Vencido {Math.abs(dias)}d</span>
  if (dias === 0) return <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Vence hoy</span>
  if (dias <= 3)  return <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{dias}d restantes</span>
  return <span style={{ fontSize: 12, color: '#9ca3af' }}>{dias}d restantes</span>
}

// Fila compacta etiqueta/valor para las secciones del panel de detalle —
// convención de "—" para vacíos aplicada en un solo lugar.
function Campo({ label, value, T }: { label: string; value: ReactNode; T: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: T.rowSub, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.rowTxt, fontWeight: 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function ModalTramiteForm({ onClose, tramiteEditar, onEditado }: {
  onClose: () => void
  tramiteEditar?: TramiteDetalle | null
  onEditado?: () => void
}) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const tramitesCanales = usePermisosStore(s => s.tramitesCanales)
  const editando = !!tramiteEditar

  // Canales en los que el usuario puede realmente crear un trámite, según
  // sus permisos reales (no según su rol) — así un usuario con un solo
  // canal habilitado (p. ej. ASISTENTE_ARCHIVO, que solo tiene "crear" en
  // ventanilla) nunca ve el selector, y cualquier rol con varios canales
  // habilitados (GESTOR_DOCUMENTAL, RESPONSABLE_ARCHIVO, ADMIN_GENERAL) sí.
  const canalesCreables = Object.keys(tramitesCanales).filter(c => tramitesCanales[c]?.includes('crear'))
  // En edición el canal es inmutable (RF-TRAM-009 sección 4): nunca se
  // muestra selector, se conserva el canal original del trámite.
  const mostrarSelectorCanal = !editando && canalesCreables.length > 1
  const canalPorDefecto = canalesCreables.includes('ventanilla') ? 'ventanilla' : (canalesCreables[0] ?? 'ventanilla')
  const canalActual = editando ? tramiteEditar!.canal_ingreso : canalPorDefecto

  const [form, setForm] = useState({
    canal_ingreso:     canalActual,
    numero_oficio:     tramiteEditar?.numero_oficio ?? '',
    fecha_documento:   tramiteEditar?.fecha_documento ?? '',
    procedencia:       tramiteEditar?.procedencia ?? '',
    firmante_oficio:   tramiteEditar?.firmante_oficio ?? '',
    cargo_firmante:    tramiteEditar?.cargo_firmante ?? '',
    // En edición se carga el snapshot cedula_firmante del trámite — NUNCA
    // Persona.numero_identificacion (RF-TRAM-009 sección 8): son datos
    // conceptualmente distintos y el snapshot es el histórico/editable.
    identificacion:    tramiteEditar?.cedula_firmante ?? '',
    telefono_contacto: tramiteEditar?.telefono_contacto ?? '',
    correo_contacto:   tramiteEditar?.correo_contacto ?? '',
    asunto:            tramiteEditar?.asunto ?? '',
    detalle:           tramiteEditar?.detalle ?? '',
  })
  // personaEncontrada NUNCA se precarga desde tramiteEditar.persona al abrir
  // la edición (sección 9): Persona solo entra en juego cuando el operador
  // ejecuta una búsqueda expresa en esta sesión de edición. La Persona ya
  // vinculada se muestra aparte, solo como referencia informativa.
  const [personaEncontrada, setPersonaEncontrada]   = useState<Persona | null>(null)
  const [buscandoPersona, setBuscandoPersona]       = useState(false)
  const [personaNoEncontrada, setPersonaNoEncontrada] = useState(false)
  const [actualizarPersona, setActualizarPersona]   = useState(false)
  const [oficioFile, setOficioFile]         = useState<File | null>(null)
  const [adjuntosFiles, setAdjuntosFiles]   = useState<File[]>([])
  const [error, setError]                   = useState('')
  const [subiendoArchivos, setSubiendoArchivos] = useState(false)
  const [registrado, setRegistrado] = useState<{ numero: string; avisos: string[] } | null>(null)

  const oficioInputRef   = useRef<HTMLInputElement>(null)
  const adjuntosInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  // firmante_oficio es la ÚNICA fuente de verdad del nombre en todo el
  // formulario — no existe ningún otro input de nombre. Al encontrar un
  // ciudadano solo se completan los campos que el operador dejó vacíos: si ya
  // escribió algo antes de buscar, no se destruye silenciosamente.
  const buscarIdentificacion = async () => {
    const valor = form.identificacion.trim()
    setPersonaEncontrada(null)
    setPersonaNoEncontrada(false)
    if (!valor) return
    setBuscandoPersona(true)
    try {
      const p = await tramitesService.buscarPersona(valor)
      setPersonaEncontrada(p)
      setForm(f => ({
        ...f,
        firmante_oficio:   f.firmante_oficio.trim()   || p.nombre_completo,
        telefono_contacto: f.telefono_contacto.trim() || (p.telefono_movil || ''),
        correo_contacto:   f.correo_contacto.trim()   || (p.email || ''),
      }))
    } catch {
      setPersonaNoEncontrada(true)
    } finally {
      setBuscandoPersona(false)
    }
  }

  const hayDiferenciaConPersona = !!personaEncontrada && (
    (!!form.telefono_contacto.trim() && form.telefono_contacto.trim() !== (personaEncontrada.telefono_movil || '')) ||
    (!!form.correo_contacto.trim() && form.correo_contacto.trim() !== (personaEncontrada.email || ''))
  )

  const crearMutation = useMutation({
    mutationFn: tramitesService.crear,
    onError: (e: any) => setError(mensajeError(e, 'Error al registrar el trámite')),
  })
  const editarMutation = useMutation({
    mutationFn: (data: Record<string, any>) => tramitesService.editar(tramiteEditar!.id, data),
    onError: (e: any) => setError(mensajeError(e, 'Error al guardar los cambios')),
  })

  const handleSubmit = async () => {
    setError('')
    if (!form.fecha_documento) { setError('La fecha del documento es obligatoria.'); return }
    if (!form.firmante_oficio.trim()) { setError('El firmante del oficio es obligatorio.'); return }
    if (!form.asunto.trim()) { setError('La referencia breve es obligatoria.'); return }

    try {
      const nuevaPersonaValida = !personaEncontrada && personaNoEncontrada
        && form.identificacion.trim() && form.firmante_oficio.trim()

      // Campos comunes a creación y edición — nunca se envían aquí campos
      // protegidos (numero_tramite, fecha_ingreso, uuid, usuario_receptor,
      // canal_ingreso en edición, seguimientos, IDs internos): ver
      // TramiteEditarSerializer en el backend, que ni siquiera los expone.
      const datosPersona = personaEncontrada
        ? {
            persona: personaEncontrada.id,
            ...(hayDiferenciaConPersona && actualizarPersona ? { actualizar_persona: true } : {}),
          }
        : nuevaPersonaValida
          ? {
              persona_datos: {
                numero_identificacion: form.identificacion.trim(),
                nombres:               form.firmante_oficio.trim(),
                telefono_movil:        form.telefono_contacto.trim(),
                email:                 form.correo_contacto.trim(),
              },
            }
          : {}

      const payloadComun = {
        numero_oficio:     form.numero_oficio.trim() || 'S/N',
        fecha_documento:   form.fecha_documento || null,
        procedencia:       form.procedencia.trim(),
        firmante_oficio:   form.firmante_oficio.trim(),
        cargo_firmante:    form.cargo_firmante.trim(),
        telefono_contacto: form.telefono_contacto.trim(),
        correo_contacto:   form.correo_contacto.trim(),
        asunto:            form.asunto.trim(),
        detalle:           form.detalle.trim(),
        ...datosPersona,
      }

      if (editando) {
        // cedula_firmante SIEMPRE se envía en edición (a diferencia de
        // creación): es un campo directamente editable del snapshot, no solo
        // un disparador de búsqueda. El backend detecta si cambió respecto
        // al valor anterior del trámite y, si no se resolvió una Persona
        // explícita en esta edición, desvincula persona_id para no dejarlo
        // apuntando a una identificación que ya no corresponde (sección 10).
        await editarMutation.mutateAsync({
          ...payloadComun,
          cedula_firmante: form.identificacion.trim() || null,
        })
        qc.invalidateQueries({ queryKey: ['tramites'] })
        qc.invalidateQueries({ queryKey: ['tramite-detalle', tramiteEditar!.id] })
        onEditado?.()
        onClose()
        return
      }

      const creado = await crearMutation.mutateAsync({
        canal_ingreso: mostrarSelectorCanal ? form.canal_ingreso : canalPorDefecto,
        ...payloadComun,
      })

      const archivos: { file: File; tipo: 'documento' | 'anexo' }[] = [
        ...(oficioFile ? [{ file: oficioFile, tipo: 'documento' as const }] : []),
        ...adjuntosFiles.map(file => ({ file, tipo: 'anexo' as const })),
      ]
      const avisos: string[] = []
      if (archivos.length > 0) {
        setSubiendoArchivos(true)
        for (const { file, tipo } of archivos) {
          try { await subirAdjuntoTramite(creado.id, file, tipo) }
          catch { avisos.push(file.name) }
        }
        setSubiendoArchivos(false)
      }

      qc.invalidateQueries({ queryKey: ['tramites'] })
      setRegistrado({ numero: creado.numero_tramite, avisos })
    } catch {
      // el mensaje ya quedó en el estado `error` vía onError de la mutation
    }
  }

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.rowSub, marginBottom: 5 }

  if (registrado && !editando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
        <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 420, padding: 28, textAlign: 'center', border: `1px solid ${T.rowBd}` }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <CheckCircle size={24} style={{ color: '#15803d' }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.rowTxt, margin: '0 0 4px' }}>Trámite registrado</h3>
          <p style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: T.accentDk, margin: '0 0 12px' }}>{registrado.numero}</p>
          {registrado.avisos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, textAlign: 'left', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 10px', marginBottom: 14, fontSize: 11, color: '#92400e' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>No se pudieron adjuntar: {registrado.avisos.join(', ')}. Puedes agregarlos después desde el detalle del trámite.</span>
            </div>
          )}
          <button onClick={onClose}
            style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: `1px solid ${T.rowBd}`, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f1fd' }}>
              {editando ? <Pencil size={15} style={{ color: '#002f6c' }} /> : <ClipboardList size={15} style={{ color: '#002f6c' }} />}
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>
                {editando
                  ? `Editar trámite ${tramiteEditar!.numero_tramite}`
                  : `Nuevo trámite${!mostrarSelectorCanal ? ` — ${CANAL_LABEL[canalPorDefecto]}` : ''}`}
              </h3>
              <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>
                {editando
                  ? `Corrección de datos del oficio/firmante — ${CANAL_LABEL[canalActual] ?? canalActual}`
                  : mostrarSelectorCanal
                    ? 'Registro de trámite — elige el canal de ingreso'
                    : 'Registro de documentación recibida presencialmente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3" style={{ flexShrink: 0 }}>{error}</div>}

          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, marginBottom: 10 }}>Datos del documento</p>
            {mostrarSelectorCanal && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Canal de ingreso</label>
                <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  value={form.canal_ingreso} onChange={e => set('canal_ingreso', e.target.value)}>
                  {['ventanilla', 'email', 'web'].map(c => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>N.º de oficio</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  placeholder="S/N si no tiene" value={form.numero_oficio}
                  onChange={e => set('numero_oficio', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Fecha del documento <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  value={form.fecha_documento} onChange={e => set('fecha_documento', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <label style={labelStyle}>Institución / organización / procedencia</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              placeholder="Ej: GAD Parroquial de..., Ciudadano particular"
              value={form.procedencia} onChange={e => set('procedencia', e.target.value)} />
          </div>

          {/* Datos del firmante — todos los campos directamente visibles, sin
              acordeón ni ningún estado open/closed: la búsqueda por cédula es
              solo una ayuda de autocompletado, nunca una condición para ver o
              editar estos campos. */}
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              Datos del firmante
              {(personaEncontrada || (editando && tramiteEditar?.persona)) && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '1px 7px', borderRadius: 8 }}>
                  Vinculado
                </span>
              )}
            </p>

            {/* Referencia informativa de la Persona ya vinculada al abrir la
                edición — nunca se usa para reconstruir los campos del
                formulario: esos siempre parten del snapshot del trámite, ya
                cargado en `form`. Solo aparece hasta que el operador ejecute
                una nueva búsqueda en esta sesión. */}
            {editando && tramiteEditar?.persona && !personaEncontrada && !personaNoEncontrada && (
              <p style={{ fontSize: 11, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 10px', padding: '6px 10px', background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 8 }}>
                <User size={12} style={{ flexShrink: 0 }} />
                Este trámite tiene vinculado a {tramiteEditar.persona.nombre_completo} ({tramiteEditar.persona.numero_identificacion}) como referencia. Los campos de abajo muestran los datos guardados en este trámite, no necesariamente los actuales de esa Persona — vuelve a buscar la cédula si quieres compararlos o reutilizarlos.
              </p>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Cédula del firmante <span style={{ fontWeight: 400, textTransform: 'none' }}>— opcional</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="flex-1 px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  placeholder="Cédula o RUC, si aplica"
                  value={form.identificacion}
                  onChange={e => {
                    set('identificacion', e.target.value)
                    setPersonaEncontrada(null); setPersonaNoEncontrada(false)
                    setActualizarPersona(false)
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarIdentificacion() } }}
                  onBlur={buscarIdentificacion} />
                <button type="button" onClick={buscarIdentificacion} disabled={buscandoPersona}
                  style={{ padding: '0 14px', fontSize: 12, fontWeight: 700, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer', flexShrink: 0 }}>
                  {buscandoPersona ? '...' : 'Buscar'}
                </button>
              </div>
            </div>

            {personaEncontrada && (
              <p style={{ fontSize: 11, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 10px', padding: '6px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                <CheckCircle size={12} style={{ flexShrink: 0 }} />
                Ciudadano encontrado — {personaEncontrada.numero_identificacion} · {personaEncontrada.telefono_movil || 'sin teléfono'} · {personaEncontrada.email || 'sin correo'}
              </p>
            )}

            {personaNoEncontrada && (
              <p style={{ fontSize: 11, color: T.rowSub, margin: '0 0 10px' }}>
                {editando
                  ? 'Sin ciudadano registrado con esa identificación — puedes guardar los cambios igual; se creará/asociará una Persona con el nombre indicado en "Firmante del oficio" si completas teléfono/correo.'
                  : 'Sin ciudadano registrado con esa identificación — el trámite se registrará igual, usando el nombre indicado en "Firmante del oficio" para asociarlo si completas teléfono/correo.'}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Firmante del oficio <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  placeholder="Nombre de quien firma"
                  value={form.firmante_oficio} onChange={e => set('firmante_oficio', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Cargo</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  placeholder="Ej: Presidente/a"
                  value={form.cargo_firmante} onChange={e => set('cargo_firmante', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  value={form.telefono_contacto} onChange={e => set('telefono_contacto', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Correo</label>
                <input type="email" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  value={form.correo_contacto} onChange={e => set('correo_contacto', e.target.value)} />
              </div>
            </div>

            {hayDiferenciaConPersona && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.rowTxt, cursor: 'pointer', marginTop: 10 }}>
                <input type="checkbox" checked={actualizarPersona} onChange={e => setActualizarPersona(e.target.checked)} />
                Actualizar también el teléfono/correo guardado del ciudadano
              </label>
            )}
          </div>

          <div style={{ flexShrink: 0 }}>
            <label style={labelStyle}>Referencia breve</label>
            <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle} rows={2}
              placeholder="Ej: Solicita certificado de camino"
              value={form.asunto} onChange={e => set('asunto', e.target.value)} />
          </div>

          {/* La re-carga de oficio/adjuntos queda fuera del alcance de
              RF-TRAM-009 (no está en la lista de campos editables) — se
              gestiona desde el panel de adjuntos del detalle, no aquí. */}
          {!editando && (
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, marginBottom: 10 }}>Documentación</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Oficio / archivo principal</label>
                  <button type="button" onClick={() => oficioInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: oficioFile ? T.accentDk : T.rowSub, background: T.rowBg, border: `1px dashed ${T.rowBd}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}>
                    <FileText size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {oficioFile ? oficioFile.name : 'Seleccionar archivo'}
                    </span>
                  </button>
                  <input ref={oficioInputRef} type="file" style={{ display: 'none' }}
                    onChange={e => setOficioFile(e.target.files?.[0] ?? null)} />
                </div>
                <div>
                  <label style={labelStyle}>Adjuntos {adjuntosFiles.length > 0 && `(${adjuntosFiles.length})`}</label>
                  <button type="button" onClick={() => adjuntosInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: adjuntosFiles.length > 0 ? T.accentDk : T.rowSub, background: T.rowBg, border: `1px dashed ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
                    <Paperclip size={14} style={{ flexShrink: 0 }} />
                    {adjuntosFiles.length > 0 ? `${adjuntosFiles.length} archivo(s)` : 'Agregar archivos'}
                  </button>
                  <input ref={adjuntosInputRef} type="file" multiple style={{ display: 'none' }}
                    onChange={e => setAdjuntosFiles(f => [...f, ...Array.from(e.target.files ?? [])])} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={crearMutation.isPending || editarMutation.isPending || subiendoArchivos}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: (crearMutation.isPending || editarMutation.isPending || subiendoArchivos) ? '#4a90e2' : T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            {(crearMutation.isPending || editarMutation.isPending || subiendoArchivos)
              ? <><Loader2 size={15} className="animate-spin" /> {subiendoArchivos ? 'Subiendo archivos...' : 'Guardando...'}</>
              : editando
                ? <><Save size={15} /> Guardar cambios</>
                : <><Plus size={15} /> Registrar trámite</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TramitesPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const navigate = useNavigate()
  const [busqueda, setBusqueda]               = useState('')
  const [filtroEstado, setFiltro]             = useState('')
  const [filtroCanal, setFiltroCanal]         = useState('')
  const [modalAbierto, setModal]              = useState(false)
  const [selectedTramite, setSelectedTramite] = useState<any>(null)
  const [mostrarVincular, setMostrarVincular] = useState(false)
  const [tramiteAEditar, setTramiteAEditar]   = useState<TramiteDetalle | null>(null)
  const puedeCanalTramite = usePermisosStore(s => s.puedeCanalTramite)
  // F3-A — "Archivar en expediente" escribe en el módulo Archivo.
  const puedeArchivoEditar = usePermisosStore(s => s.puede('archivo', 'editar'))

  const { data, isLoading } = useQuery({
    queryKey: ['tramites', busqueda, filtroEstado, filtroCanal],
    queryFn: () => tramitesService.listar({
      ...(busqueda     ? { search: busqueda }             : {}),
      ...(filtroEstado ? { estado: filtroEstado }         : {}),
      ...(filtroCanal  ? { canal_ingreso: filtroCanal }   : {}),
    }),
  })

  const tramites = data?.results ?? []
  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }

  // Detalle real del trámite seleccionado (incluye el historial de
  // Seguimiento, que el listado no trae) — reutiliza GET /tramites/{id}/,
  // ya existente en el backend (TramiteDetalleSerializer).
  const { data: detalle } = useQuery({
    queryKey: ['tramite-detalle', selectedTramite?.id],
    queryFn: () => tramitesService.obtener(selectedTramite.id),
    enabled: !!selectedTramite,
  })
  const historial = [...(detalle?.seguimientos ?? [])]
    .sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime())

  return (
    <div className="flex flex-col md:flex-row" style={{ gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {modalAbierto && <ModalTramiteForm onClose={() => setModal(false)} />}
        {tramiteAEditar && (
          <ModalTramiteForm
            tramiteEditar={tramiteAEditar}
            onClose={() => setTramiteAEditar(null)}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Trámites ciudadanos</h1>
            <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>{data?.count ?? 0} trámites registrados</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/tramites/configuracion')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: T.rowSub, background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
              <Settings size={15} /> Configurar
            </button>
            <button onClick={() => setModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              <Plus size={15} /> Nuevo trámite
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input type="text" placeholder="Buscar por número, nombre, cédula..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full text-sm rounded-xl outline-none"
              style={{ ...inputStyle, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }} />
          </div>
          <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}>
            <option value="">Todos los canales</option>
            <option value="ventanilla">Ventanilla</option>
            <option value="email">Email</option>
            <option value="web">Web</option>
          </select>
        </div>

        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 14, color: T.rowSub }}>Cargando trámites...</div>
          ) : tramites.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: T.rowSub }}>
              <ClipboardList size={28} style={{ opacity: .4, marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No se encontraron trámites</p>
            </div>
          ) : (
            <>
              {/* Escritorio/tablet ancho: tabla de 5 columnas — identificación
                  documental y del firmante tienen prioridad sobre unidad/
                  plazo, que se movieron al panel de detalle (sección
                  "Gestión"). Oculta por debajo de `md` para no forzar scroll
                  horizontal en móvil. El wrapper interno con overflowX:auto
                  evita que, con el panel de detalle abierto en resoluciones
                  como 1366px, la columna Estado quede recortada sin forma de
                  verla (el contenedor externo usa overflow:hidden solo para
                  las esquinas redondeadas) — el scroll horizontal aquí es un
                  resguardo puntual para ese caso, no la estrategia principal
                  de responsive (esa es el cambio a tarjetas en móvil). */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ minWidth: 660 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.rowBd}` }}>
                    {['Trámite','Firmante','Contacto','Fecha de ingreso','Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tramites.map(t => {
                    const est   = ESTADOS[t.estado] ?? ESTADOS.ingresado
                    const pri   = PRIORIDAD[t.prioridad]
                    const isSel = selectedTramite?.id === t.id
                    const ingreso = new Date(t.fecha_ingreso)
                    return (
                      <tr key={t.id} onClick={() => setSelectedTramite(isSel ? null : t)}
                        style={{ borderBottom: `1px solid ${T.rowBd}`, cursor: 'pointer', background: isSel ? T.rowSel : 'transparent', transition: 'background .1s' }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.rowHv }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSel ? T.rowSel : 'transparent' }}>
                        <td style={{ padding: '14px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{t.numero_tramite}</p>
                          <p title={t.asunto} style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, marginTop: 2, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.asunto}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {t.categoria_nombre && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: T.statsBg, color: T.rowSub }}>{t.categoria_nombre}</span>
                            )}
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: pri.color }} title={pri.label} />
                          </div>
                        </td>
                        {/* Firmante — persona_nombre/persona_identificacion ya
                            priorizan el snapshot del trámite (firmante_oficio/
                            cedula_firmante) sobre Persona; solo caen a Persona
                            para trámites antiguos sin snapshot (ver
                            TramiteListSerializer). */}
                        <td style={{ padding: '14px 14px', maxWidth: 145 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <User size={13} style={{ color: T.rowSub, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <p title={t.persona_nombre || undefined} style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.persona_nombre || '—'}</p>
                              <p style={{ fontSize: 11, color: T.rowSub, whiteSpace: 'nowrap' }}>{t.persona_identificacion || '—'}</p>
                            </div>
                          </div>
                        </td>
                        {/* Contacto — snapshot del trámite (telefono_contacto/
                            correo_contacto), nunca Persona.telefono_movil/email. */}
                        <td style={{ padding: '14px 14px', maxWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <Phone size={13} style={{ color: T.rowSub, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, color: T.rowTxt, whiteSpace: 'nowrap' }}>{t.telefono_contacto || '—'}</p>
                              <p style={{ fontSize: 11, color: T.rowSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.correo_contacto || undefined}>{t.correo_contacto || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.rowTxt }}>
                            <Calendar size={12} style={{ color: T.rowSub }} />
                            <span>{ingreso.toLocaleDateString('es-EC')}</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>{ingreso.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: est.bg, color: est.text }}>{est.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>

              {/* Móvil/tablet angosta: lista de tarjetas apiladas en vez de
                  tabla — evita scroll horizontal, conserva todos los datos
                  esenciales (número, referencia, firmante, cédula, contacto
                  cuando exista, fecha de ingreso, estado). */}
              <div className="md:hidden">
                {tramites.map(t => {
                  const est   = ESTADOS[t.estado] ?? ESTADOS.ingresado
                  const isSel = selectedTramite?.id === t.id
                  const ingreso = new Date(t.fecha_ingreso)
                  return (
                    <div key={t.id} onClick={() => setSelectedTramite(isSel ? null : t)}
                      style={{ padding: '14px 16px', borderBottom: `1px solid ${T.rowBd}`, cursor: 'pointer', background: isSel ? T.rowSel : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{t.numero_tramite}</p>
                          <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, marginTop: 2 }}>{t.asunto}</p>
                        </div>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: est.bg, color: est.text }}>{est.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <User size={12} style={{ color: T.rowSub, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: T.rowTxt }}>{t.persona_nombre || '—'}</span>
                        <span style={{ fontSize: 12, color: T.rowSub }}>· {t.persona_identificacion || '—'}</span>
                      </div>
                      {(t.telefono_contacto || t.correo_contacto) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <Phone size={12} style={{ color: T.rowSub, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: T.rowSub }}>{t.telefono_contacto || '—'} · {t.correo_contacto || '—'}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} style={{ color: T.rowSub, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.rowSub }}>{ingreso.toLocaleDateString('es-EC')} · {ingreso.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {selectedTramite && (
        <div className="w-full md:w-[320px]" style={{ flexShrink: 0, background: T.ctHdrBg, borderRadius: 14, border: `1px solid ${T.rowBd}`, padding: 16, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* `detalle` (GET /tramites/{id}/) es la fuente fresca tras
                  editar — `selectedTramite` es la fila de la lista capturada
                  al hacer clic y puede quedar desactualizada (p. ej. asunto)
                  hasta que se reseleccione. Se prioriza `detalle` una vez
                  cargado, sin bloquear la primera pintura mientras llega. */}
              <p style={{ fontSize: 10, fontWeight: 700, color: T.accentDk, fontFamily: 'monospace', margin: 0 }}>{detalle?.numero_tramite ?? selectedTramite.numero_tramite}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: '3px 0 0', lineHeight: 1.3 }}>{detalle?.asunto ?? selectedTramite.asunto}</p>
            </div>
            <button onClick={() => setSelectedTramite(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 8 }}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: (ESTADOS[detalle?.estado ?? selectedTramite.estado] ?? ESTADOS.ingresado).bg,
              color: (ESTADOS[detalle?.estado ?? selectedTramite.estado] ?? ESTADOS.ingresado).text }}>
              {(ESTADOS[detalle?.estado ?? selectedTramite.estado] ?? ESTADOS.ingresado).label}
            </span>
            {puedeCanalTramite(detalle?.canal_ingreso ?? selectedTramite.canal_ingreso, 'editar') && (
              <button onClick={() => detalle && setTramiteAEditar(detalle)} disabled={!detalle}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.accentDk, background: 'none', border: 'none', cursor: detalle ? 'pointer' : 'default', padding: 0, opacity: detalle ? 1 : 0.5 }}>
                <Pencil size={11} /> Editar
              </button>
            )}
          </div>
          {puedeArchivoEditar && (
            <button onClick={() => setMostrarVincular(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 10px', borderRadius: 9, border: `1px solid ${T.rowBd}`, background: T.rowBg, color: T.rowTxt, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
              <Archive size={13} /> Archivar en expediente
            </button>
          )}

          {!detalle ? (
            <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: T.rowSub }}>Cargando detalle…</p>
            </div>
          ) : (
            <>
              <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <ClipboardList size={12} /> Identificación del trámite
                </p>
                <Campo T={T} label="Número" value={detalle.numero_tramite} />
                <Campo T={T} label="Estado" value={(ESTADOS[detalle.estado] ?? ESTADOS.ingresado).label} />
                <Campo T={T} label="Canal de ingreso" value={CANAL_LABEL[detalle.canal_ingreso] ?? detalle.canal_ingreso} />
                <Campo T={T} label="Fecha de ingreso" value={`${new Date(detalle.fecha_ingreso).toLocaleDateString('es-EC')} ${new Date(detalle.fecha_ingreso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`} />
              </div>

              <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <FileText size={12} /> Documento recibido
                </p>
                <Campo T={T} label="N.º de oficio" value={detalle.numero_oficio} />
                <Campo T={T} label="Fecha del documento" value={detalle.fecha_documento ? new Date(detalle.fecha_documento + 'T00:00:00').toLocaleDateString('es-EC') : null} />
                <Campo T={T} label="Institución / procedencia" value={detalle.procedencia} />
              </div>

              {/* Firmante — siempre desde los snapshots del trámite
                  (cedula_firmante/firmante_oficio/cargo_firmante/
                  telefono_contacto/correo_contacto), nunca reconstruido desde
                  Persona. Persona solo aparece como referencia discreta
                  debajo, sin repetir su ficha completa. */}
              <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <User size={12} /> Firmante
                </p>
                <Campo T={T} label="Cédula" value={detalle.cedula_firmante} />
                <Campo T={T} label="Firmante" value={detalle.firmante_oficio} />
                <Campo T={T} label="Cargo" value={detalle.cargo_firmante} />
                <Campo T={T} label="Teléfono" value={detalle.telefono_contacto} />
                <Campo T={T} label="Correo" value={detalle.correo_contacto} />
                {detalle.persona && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.rowSub, margin: '8px 0 0', padding: '5px 8px', background: T.rowBg, borderRadius: 6 }}>
                    <IdCard size={11} style={{ flexShrink: 0 }} />
                    Ciudadano vinculado como referencia (Persona #{detalle.persona.id})
                  </p>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  <Briefcase size={12} /> Gestión
                </p>
                <Campo T={T} label="Unidad responsable" value={detalle.unidad_responsable_nombre} />
                <Campo T={T} label="Unidad receptora" value={detalle.unidad_receptora_nombre} />
                <Campo T={T} label="Usuario receptor" value={detalle.receptor_nombre} />
                <Campo T={T} label="Usuario asignado" value={detalle.analista_nombre} />
                <Campo T={T} label="Prioridad" value={PRIORIDAD[detalle.prioridad]?.label} />
                <Campo T={T} label="Fecha límite" value={new Date(detalle.fecha_limite + 'T00:00:00').toLocaleDateString('es-EC')} />
                {detalle.dias_restantes !== null && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <DiasRestantes dias={detalle.dias_restantes} />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12, marginBottom: 12 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              <History size={12} /> Historial
            </p>
            {!detalle ? (
              <p style={{ fontSize: 11, color: T.rowSub }}>Cargando historial…</p>
            ) : historial.length === 0 ? (
              <p style={{ fontSize: 11, color: T.rowSub }}>Sin actuaciones registradas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
                {historial.map(s => {
                  const est = ESTADOS[s.estado_nuevo]
                  const fecha = new Date(s.creado_en)
                  return (
                    <div key={s.id} style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: est?.text ?? T.rowSub, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, margin: 0 }}>
                          {s.estado_anterior ? `${ESTADOS[s.estado_anterior]?.label ?? s.estado_anterior} → ` : ''}
                          {est?.label ?? s.estado_nuevo}
                        </p>
                        <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>
                          {s.usuario_nombre ?? 'Usuario'}{s.unidad_nombre ? ` · ${s.unidad_nombre}` : ''}
                        </p>
                        <p style={{ fontSize: 10, color: T.rowSub, margin: '1px 0 0' }}>
                          {fecha.toLocaleDateString('es-EC')} {fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {s.observacion && (
                          <p style={{ fontSize: 11, color: T.rowTxt, margin: '4px 0 0', background: T.rowHv, borderRadius: 6, padding: '4px 6px' }}>
                            {s.observacion}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12 }}>
            <AdjuntosPanel tramiteId={selectedTramite.id} />
          </div>
        </div>
      )}

      {mostrarVincular && selectedTramite && (
        <VincularExpedienteModal tramiteId={selectedTramite.id} onClose={() => setMostrarVincular(false)} onVinculado={() => setMostrarVincular(false)} />
      )}
    </div>
  )
}
