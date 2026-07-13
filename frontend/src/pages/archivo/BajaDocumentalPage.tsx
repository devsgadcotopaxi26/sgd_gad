import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, BajaDocumental, Expediente } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  Trash2, Plus, X, FileText, AlertTriangle,
  CheckCircle, Clock, Search
} from 'lucide-react'

// ESTADO_CONFIG: colores semánticos fijos, no se tematizan
const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  borrador:           { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  valorada:           { bg: '#eff6ff', text: '#1d4ed8', label: 'Valorada' },
  enviada_validacion: { bg: '#fff7ed', text: '#c2410c', label: 'Enviada a validación' },
  dictaminada:        { bg: '#f0fdf4', text: '#15803d', label: 'Dictaminada' },
  rechazada:          { bg: '#fef2f2', text: '#dc2626', label: 'Rechazada' },
  ejecutada:          { bg: '#374151', text: '#fff',    label: 'Ejecutada' },
}

const CARACTER_PROCESO: Record<string, string> = {
  gobernante: 'Gobernante',
  sustantivo: 'Sustantivo',
  adjetivo:   'Adjetivo',
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle: React.CSSProperties = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}`, outline: 'none', borderRadius: 12, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }
  return { T, inputStyle, labelStyle }
}

function ModalNuevaBaja({ onClose }: { onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [paso, setPaso] = useState(1)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [form, setForm] = useState<Record<string, any>>({
    caracter_proceso: 'adjetivo',
    justificacion: '',
    normativa_legal: '',
  })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const { data: expedientesData } = useQuery({
    queryKey: ['expedientes-elegibles-baja'],
    queryFn:  () => archivoService.expedientes({ categoria_actual: 'central' }),
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const baja = await archivoService.crearBaja(data)
      return baja
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bajas-documentales'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const expedientes = (expedientesData?.results ?? []) as Expediente[]

  const toggleExp = (id: number) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleSubmit = () => {
    if (!form.unidad)          { setError('Selecciona la unidad responsable'); return }
    if (!form.justificacion)   { setError('La justificación es obligatoria'); return }
    if (seleccionados.size === 0) { setError('Selecciona al menos un expediente'); return }
    mutation.mutate({
      ...form,
      numero_expedientes: seleccionados.size,
      expedientes_ids: Array.from(seleccionados),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <div>
            <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Nueva baja documental</h3>
            <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>Ficha Técnica de Prevaloración — Paso {paso} de 2</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <div style={{ marginBottom: 12, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>
              La baja documental requiere aprobación del equipo de valoración (Art. 42) y validación de la Dirección de Archivo del ente rector antes de su ejecución.
            </p>
          </div>

          {paso === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Unidad responsable *</label>
                  <select style={inputStyle} value={form.unidad ?? ''} onChange={e => setForm(f => ({ ...f, unidad: Number(e.target.value) }))}>
                    <option value="">— Selecciona —</option>
                    {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Carácter del proceso</label>
                  <select style={inputStyle} value={form.caracter_proceso} onChange={e => setForm(f => ({ ...f, caracter_proceso: e.target.value }))}>
                    {Object.entries(CARACTER_PROCESO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Justificación *</label>
                <textarea style={{ ...inputStyle, resize: 'none' }} rows={3}
                  placeholder="Indica por qué los expedientes deben darse de baja (plazo cumplido, sin valor histórico, etc.)"
                  value={form.justificacion} onChange={e => setForm(f => ({ ...f, justificacion: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Normativa legal aplicable</label>
                <input style={inputStyle} placeholder="Ley y artículo que justifica la eliminación"
                  value={form.normativa_legal} onChange={e => setForm(f => ({ ...f, normativa_legal: e.target.value }))} />
              </div>
            </div>
          )}

          {paso === 2 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 8 }}>
                Selecciona los expedientes a eliminar ({seleccionados.size} seleccionados)
              </p>
              <div style={{ border: `0.5px solid ${T.rowBd}`, borderRadius: 10, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                {expedientes.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.rowSub, textAlign: 'center', padding: '24px 0' }}>No hay expedientes elegibles en Archivo Central</p>
                ) : expedientes.map(exp => (
                  <div key={exp.id} onClick={() => toggleExp(exp.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', cursor: 'pointer', borderBottom: `0.5px solid ${T.rowBd}`, background: seleccionados.has(exp.id) ? '#fef2f2' : T.ctHdrBg, border: `1px solid ${seleccionados.has(exp.id) ? '#dc2626' : 'transparent'}`, borderRadius: 0 }}
                    onMouseEnter={e => { if (!seleccionados.has(exp.id)) e.currentTarget.style.background = T.rowHv }}
                    onMouseLeave={e => { if (!seleccionados.has(exp.id)) e.currentTarget.style.background = T.ctHdrBg }}>
                    <input type="checkbox" checked={seleccionados.has(exp.id)} onChange={() => {}}
                      style={{ width: 14, height: 14, accentColor: '#dc2626' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk, margin: 0 }}>{exp.codigo_expediente}</p>
                      <p style={{ fontSize: 12, color: T.rowTxt, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.titulo}</p>
                      <p style={{ fontSize: 10, color: T.rowSub, margin: '1px 0 0' }}>{exp.serie_nombre}</p>
                    </div>
                    <span style={{ fontSize: 11, color: T.rowSub, flexShrink: 0 }}>{exp.num_fojas} fojas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={() => paso > 1 ? setPaso(1) : onClose()}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
            {paso === 1 ? 'Cancelar' : '← Anterior'}
          </button>
          {paso === 1 ? (
            <button onClick={() => {
              if (!form.unidad || !form.justificacion) { setError('Completa los campos obligatorios'); return }
              setError(''); setPaso(2)
            }}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={mutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}>
              <Trash2 size={14} /> Solicitar baja documental
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BajaDocumentalPage() {
  const { T } = useTheme()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bajas-documentales', filtroEstado],
    queryFn:  () => archivoService.listarBajas(filtroEstado ? { estado: filtroEstado } : {}),
  })

  const avanzarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      archivoService.actualizarBaja(id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bajas-documentales'] }),
  })

  const bajas = data?.results ?? []

  const siguienteEstado: Record<string, string> = {
    borrador: 'valorada',
    valorada: 'enviada_validacion',
    enviada_validacion: 'dictaminada',
    dictaminada: 'ejecutada',
  }

  const labelAccion: Record<string, string> = {
    borrador: 'Marcar como valorada',
    valorada: 'Enviar a validación',
    enviada_validacion: 'Registrar dictamen',
    dictaminada: 'Ejecutar baja',
  }

  return (
    <div>
      {modal && <ModalNuevaBaja onClose={() => setModal(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Baja documental</h1>
          <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>Eliminación controlada conforme al Art. 53 de la Regla Técnica Nacional</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva baja documental
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroEstado('')}
          style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer', background: !filtroEstado ? T.accentDk : T.rowHv, color: !filtroEstado ? '#fff' : T.rowSub }}>
          Todos
        </button>
        {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => setFiltroEstado(k)}
            style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer', background: filtroEstado === k ? v.text : v.bg, color: filtroEstado === k ? '#fff' : v.text }}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ background: T.ctHdrBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48, fontSize: 12, color: T.rowSub }}>Cargando...</div>
        ) : bajas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, color: T.rowSub }}>
            <Trash2 size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontSize: 13 }}>No hay procesos de baja documental registrados</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.rowHv, borderBottom: `0.5px solid ${T.rowBd}` }}>
                {['Unidad', 'Carácter', 'Expedientes', 'Solicitado por', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bajas.map((b: BajaDocumental) => {
                const est = ESTADO_CONFIG[b.estado] ?? ESTADO_CONFIG.borrador
                const siguiente = siguienteEstado[b.estado]
                return (
                  <tr key={b.id} style={{ borderBottom: `0.5px solid ${T.rowBd}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: T.rowTxt }}>{b.unidad_nombre}</td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: T.rowSub }}>{CARACTER_PROCESO[b.caracter_proceso]}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: T.rowTxt }}>{b.numero_expedientes} expedientes</td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: T.rowSub }}>{b.solicitado_por_nombre}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: est.bg, color: est.text }}>
                        {est.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {siguiente && (
                        <button
                          onClick={() => avanzarEstado.mutate({ id: b.id, estado: siguiente })}
                          disabled={avanzarEstado.isPending}
                          style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, color: T.rowTxt, cursor: 'pointer' }}>
                          {labelAccion[b.estado]}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
