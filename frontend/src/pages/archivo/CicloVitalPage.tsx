import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, Expediente, Transferencia } from '@/services/archivo.service'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  Inbox, Building2, Archive, Landmark,
  ArrowRight, X, FileText,
  Clock, CheckCircle, AlertTriangle, Send
} from 'lucide-react'

// CATEGORIAS / TIPO / ESTADO: colores semánticos fijos de archivo
const CATEGORIAS = [
  { key: 'gestion',    label: 'Archivo de Gestión',    icon: Inbox,     color: '#002f6c', desc: '0-2 años · documentación de uso continuo' },
  { key: 'central',    label: 'Archivo Central',       icon: Building2, color: '#0f6e56', desc: '2-15 años · custodia institucional' },
  { key: 'intermedio', label: 'Archivo Intermedio',    icon: Archive,   color: '#854f0b', desc: '15+ años · Dirección de Archivo del ente rector' },
  { key: 'historico',  label: 'Archivo Histórico',     icon: Landmark,  color: '#7e22ce', desc: 'Permanente · Archivo Nacional del Ecuador' },
]

const TIPO_TRANSFERENCIA: Record<string, { from: string; to: string; label: string }> = {
  primaria:   { from: 'gestion',    to: 'central',    label: 'Primaria (Gestión → Central)' },
  secundaria: { from: 'central',    to: 'intermedio', label: 'Secundaria (Central → Intermedio)' },
  final:      { from: 'intermedio', to: 'historico',  label: 'Final (Intermedio → Histórico)' },
}

const ESTADO_TRANSFERENCIA: Record<string, { bg: string; text: string; label: string }> = {
  borrador:   { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  solicitada: { bg: '#fff7ed', text: '#c2410c', label: 'Solicitada' },
  revisada:   { bg: '#eff6ff', text: '#1d4ed8', label: 'Revisada' },
  aceptada:   { bg: '#f0fdf4', text: '#15803d', label: 'Aceptada' },
  rechazada:  { bg: '#fef2f2', text: '#dc2626', label: 'Rechazada' },
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle: React.CSSProperties = { background: T.rowBg, color: T.rowTxt, border: `0.5px solid ${T.rowBd}`, outline: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }
  return { T, inputStyle, labelStyle }
}

function ModalNuevaTransferencia({ categoria, onClose }: { categoria: string; onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const tipoSugerido = categoria === 'gestion' ? 'primaria' : categoria === 'central' ? 'secundaria' : 'final'
  const [form, setForm] = useState<Record<string, any>>({ tipo: tipoSugerido, numero_memorando: '' })
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  const { data: expedientesData } = useQuery({
    queryKey: ['expedientes-categoria', categoria],
    queryFn:  () => archivoService.expedientes({ categoria_actual: categoria }),
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const transferencia = await archivoService.crearTransferencia(data)
      return transferencia
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transferencias'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const expedientes = expedientesData?.results ?? []

  const toggleExp = (id: number) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <div>
            <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Nueva transferencia documental</h3>
            <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>{TIPO_TRANSFERENCIA[tipoSugerido].label}</p>
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

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>N° de memorando</label>
            <input style={inputStyle} placeholder="Ej: MEM-DAD-2026-0034"
              value={form.numero_memorando} onChange={e => setForm(f => ({ ...f, numero_memorando: e.target.value }))} />
          </div>

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 8 }}>
              Selecciona los expedientes a transferir ({seleccionados.size} seleccionados)
            </p>
            <div style={{ border: `0.5px solid ${T.rowBd}`, borderRadius: 10, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
              {expedientes.length === 0 ? (
                <p style={{ fontSize: 12, color: T.rowSub, textAlign: 'center', padding: '24px 0' }}>No hay expedientes en esta categoría listos para transferir</p>
              ) : expedientes.map(exp => (
                <div key={exp.id} onClick={() => toggleExp(exp.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', cursor: 'pointer', borderBottom: `0.5px solid ${T.rowBd}`, background: seleccionados.has(exp.id) ? T.rowSel : T.ctHdrBg }}
                  onMouseEnter={e => { if (!seleccionados.has(exp.id)) e.currentTarget.style.background = T.rowHv }}
                  onMouseLeave={e => { if (!seleccionados.has(exp.id)) e.currentTarget.style.background = T.ctHdrBg }}>
                  <input type="checkbox" checked={seleccionados.has(exp.id)} onChange={() => {}}
                    style={{ width: 14, height: 14, accentColor: T.accentDk }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk, margin: 0 }}>{exp.codigo_expediente}</p>
                    <p style={{ fontSize: 12, color: T.rowTxt, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.titulo}</p>
                  </div>
                  <span style={{ fontSize: 11, color: T.rowSub, flexShrink: 0 }}>{exp.num_fojas} fojas</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={() => {
              if (seleccionados.size === 0) { setError('Selecciona al menos un expediente'); return }
              mutation.mutate({ tipo: tipoSugerido, numero_memorando: form.numero_memorando, expedientes_ids: Array.from(seleccionados) })
            }}
            disabled={mutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            <Send size={14} /> Solicitar transferencia
          </button>
        </div>
      </div>
    </div>
  )
}

function ExpurgarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => archivoService.expurgar(expediente.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
      style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#854f0b', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
      {mutation.isPending ? 'Procesando...' : 'Marcar expurgo realizado'}
    </button>
  )
}

function FoliarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const { T } = useTheme()
  const qc = useQueryClient()
  const [numFojas, setNumFojas] = useState(expediente.num_fojas || 0)
  const mutation = useMutation({
    mutationFn: () => archivoService.foliar(expediente.id, numFojas),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="number" value={numFojas} onChange={e => setNumFojas(Number(e.target.value))}
        style={{ width: 80, padding: '7px 10px', fontSize: 12, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt }} placeholder="Fojas" />
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#0f6e56', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
        {mutation.isPending ? 'Procesando...' : 'Marcar foliación realizada'}
      </button>
    </div>
  )
}

function CerrarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const { T } = useTheme()
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => archivoService.cerrar(expediente.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
      style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
      {mutation.isPending ? 'Procesando...' : 'Cerrar expediente'}
    </button>
  )
}

export default function CicloVitalPage() {
  const { T } = useTheme()
  const [categoriaActiva, setCategoriaActiva] = useState('gestion')
  const [modalTransferencia, setModalTransferencia] = useState(false)
  const [vista, setVista] = useState<'expedientes' | 'transferencias'>('expedientes')
  const [selectedExp, setSelectedExp] = useState<Expediente | null>(null)

  const { data: expedientesData, isLoading } = useQuery({
    queryKey: ['expedientes-categoria', categoriaActiva],
    queryFn:  () => archivoService.expedientes({ categoria_actual: categoriaActiva }),
  })

  const { data: transferenciasData } = useQuery({
    queryKey: ['transferencias'],
    queryFn:  () => archivoService.listarTransferencias(),
  })

  const expedientes    = expedientesData?.results ?? []
  const transferencias = transferenciasData?.results ?? []
  const catActual       = CATEGORIAS.find(c => c.key === categoriaActiva)!

  return (
    <div>
      {modalTransferencia && <ModalNuevaTransferencia categoria={categoriaActiva} onClose={() => setModalTransferencia(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Ciclo vital del documento</h1>
          <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>Gestión → Central → Intermedio → Histórico</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['expedientes', 'transferencias'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', background: vista === v ? T.accentDk : T.rowHv, color: vista === v ? '#fff' : T.rowSub }}>
              {v === 'expedientes' ? 'Por categoría' : 'Transferencias'}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline de categorías — colores semánticos fijos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        {CATEGORIAS.map((cat, i) => {
          const Icon = cat.icon
          const isActive = categoriaActiva === cat.key
          return (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 4 }}>
              <div onClick={() => setCategoriaActiva(cat.key)}
                style={{ flex: 1, padding: '14px 16px', borderRadius: 14, cursor: 'pointer', background: isActive ? cat.color : T.ctHdrBg, border: `1.5px solid ${isActive ? cat.color : T.rowBd}`, transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={16} style={{ color: isActive ? '#fff' : cat.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : T.rowTxt }}>{cat.label}</span>
                </div>
                <p style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,.8)' : T.rowSub, margin: 0 }}>{cat.desc}</p>
              </div>
              {i < CATEGORIAS.length - 1 && <ArrowRight size={16} style={{ color: T.rowBd, flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>

      {vista === 'expedientes' ? (
        <div style={{ background: T.ctHdrBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `0.5px solid ${T.rowBd}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>
              {catActual.label} — {expedientes.length} expedientes
            </span>
            <button onClick={() => setModalTransferencia(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              <Send size={13} /> Solicitar transferencia
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, fontSize: 12, color: T.rowSub }}>Cargando...</div>
          ) : expedientes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, color: T.rowSub }}>
              <FileText size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>No hay expedientes en esta categoría</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.rowHv, borderBottom: `0.5px solid ${T.rowBd}` }}>
                  {['Expediente', 'Serie', 'Estado', 'Próxima transferencia'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expedientes.map(exp => (
                  <tr key={exp.id} onClick={() => setSelectedExp(exp)} style={{ borderBottom: `0.5px solid ${T.rowBd}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 20px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk, margin: 0 }}>{exp.codigo_expediente}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: '2px 0 0' }}>{exp.titulo}</p>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, color: T.rowSub }}>{exp.serie_nombre}</span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      {exp.foliado && exp.expurgado ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#15803d' }}>
                          <CheckCircle size={12} /> Listo para transferir
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#c2410c' }}>
                          <AlertTriangle size={12} /> Falta {!exp.expurgado ? 'expurgo' : 'foliación'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.rowSub }}>
                        <Clock size={12} />
                        {exp.fecha_limite_categoria ? new Date(exp.fecha_limite_categoria).toLocaleDateString('es-EC') : 'Sin definir'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ background: T.ctHdrBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `0.5px solid ${T.rowBd}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Historial de transferencias documentales</span>
          </div>
          {transferencias.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, color: T.rowSub }}>
              <Send size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>No hay transferencias registradas</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.rowHv, borderBottom: `0.5px solid ${T.rowBd}` }}>
                  {['Tipo', 'Unidad', 'Memorando', 'Expedientes', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t: Transferencia) => {
                  const est = ESTADO_TRANSFERENCIA[t.estado] ?? ESTADO_TRANSFERENCIA.borrador
                  return (
                    <tr key={t.id} style={{ borderBottom: `0.5px solid ${T.rowBd}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 20px', fontSize: 11, fontWeight: 500, color: T.rowTxt }}>
                        {TIPO_TRANSFERENCIA[t.tipo]?.label ?? t.tipo}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: T.rowTxt }}>{t.unidad_nombre}</td>
                      <td style={{ padding: '12px 20px', fontSize: 11, fontFamily: 'monospace', color: T.rowSub }}>{t.numero_memorando || '—'}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: T.rowTxt }}>{t.total_expedientes}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: est.bg, color: est.text }}>
                          {est.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk, margin: 0 }}>{selectedExp.codigo_expediente}</p>
                <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: '3px 0 0' }}>{selectedExp.titulo}</h3>
              </div>
              <button onClick={() => setSelectedExp(null)} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, borderRadius: 10, background: selectedExp.expurgado ? '#f0fdf4' : '#fef2f2' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: selectedExp.expurgado ? '#15803d' : '#dc2626', margin: '0 0 4px' }}>Expurgo</p>
                  <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>
                    {selectedExp.expurgado ? `Realizado el ${new Date(selectedExp.fecha_expurgo!).toLocaleDateString('es-EC')}` : 'Pendiente'}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: selectedExp.foliado ? '#f0fdf4' : '#fef2f2' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: selectedExp.foliado ? '#15803d' : '#dc2626', margin: '0 0 4px' }}>Foliación</p>
                  <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>
                    {selectedExp.foliado ? `${selectedExp.num_fojas} fojas — ${new Date(selectedExp.fecha_foliacion!).toLocaleDateString('es-EC')}` : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: T.rowTxt, margin: 0 }}>
                  Conforme al Art. 33-35 de la Regla Técnica, el expediente debe expurgarse y foliarse antes de cerrarse o transferirse.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
              {!selectedExp.expurgado && (
                <ExpurgarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
              {selectedExp.expurgado && !selectedExp.foliado && (
                <FoliarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
              {selectedExp.expurgado && selectedExp.foliado && selectedExp.estado === 'abierto' && (
                <CerrarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
