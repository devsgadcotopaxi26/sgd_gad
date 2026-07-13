import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  Search, CheckCircle, Clock, AlertTriangle,
  XCircle, FileText, Building2, Calendar,
  Star, ChevronRight, ArrowLeft, Send
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ESTADO_CONFIG: colores semánticos fijos (estados de trámite)
const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  ingresado:     { color: '#1d4ed8', bg: '#eff6ff', icon: FileText,    label: 'Ingresado' },
  asignado:      { color: '#7e22ce', bg: '#faf5ff', icon: Clock,       label: 'Asignado' },
  en_proceso:    { color: '#c2410c', bg: '#fff7ed', icon: Clock,       label: 'En proceso' },
  en_inspeccion: { color: '#854f0b', bg: '#faeeda', icon: Clock,       label: 'En inspección' },
  resuelto:      { color: '#15803d', bg: '#f0fdf4', icon: CheckCircle, label: 'Resuelto' },
  rechazado:     { color: '#dc2626', bg: '#fef2f2', icon: XCircle,     label: 'Rechazado' },
  desistido:     { color: '#6b7280', bg: '#f9fafb', icon: XCircle,     label: 'Desistido' },
  archivado:     { color: '#374151', bg: '#f9fafb', icon: FileText,    label: 'Archivado' },
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  return { T }
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg  = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.ingresado
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      <Icon size={13} /> {cfg.label}
    </span>
  )
}

function TimelineSeguimiento({ seguimientos, T }: { seguimientos: any[]; T: any }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={15} style={{ color: '#002f6c' }} /> Historial de seguimiento
      </h3>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, background: T.rowBd }} />
        {seguimientos.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10, background: i === seguimientos.length - 1 ? '#002f6c' : '#e8f1fd' }}>
              <CheckCircle size={14} style={{ color: i === seguimientos.length - 1 ? '#fff' : '#002f6c' }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, margin: 0, textTransform: 'capitalize' }}>{s.estado.replace(/_/g, ' ')}</p>
              {s.observacion && <p style={{ fontSize: 11, color: T.rowSub, margin: '2px 0 0' }}>{s.observacion}</p>}
              <p style={{ fontSize: 10, color: T.rowSub, margin: '4px 0 0' }}>{s.fecha}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalificacionWidget({ numero }: { numero: string }) {
  const [stars, setStars]   = useState(0)
  const [hover, setHover]   = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.post('/tramites/portal/calificar/', {
      numero_tramite: numero,
      calificacion:   stars,
      comentario,
    }),
    onSuccess: () => setEnviado(true),
  })

  if (enviado) return (
    <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 16, padding: 20, textAlign: 'center', marginTop: 16 }}>
      <CheckCircle size={28} style={{ color: '#15803d', margin: '0 auto 8px', display: 'block' }} />
      <p style={{ fontWeight: 700, color: '#15803d', margin: 0 }}>¡Gracias por tu calificación!</p>
      <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>Tu opinión nos ayuda a mejorar el servicio</p>
    </div>
  )

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>¿Cómo calificarías el servicio recibido?</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
            <Star size={28} fill={(hover || stars) >= n ? '#f59e0b' : 'none'} stroke={(hover || stars) >= n ? '#f59e0b' : '#d1d5db'} />
          </button>
        ))}
        {stars > 0 && <span style={{ marginLeft: 8, fontSize: 13, color: '#6b7280' }}>{['','Muy malo','Malo','Regular','Bueno','Excelente'][stars]}</span>}
      </div>
      <textarea
        value={comentario}
        onChange={e => setComentario(e.target.value)}
        placeholder="Cuéntanos tu experiencia (opcional)..."
        rows={2}
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '0.5px solid #d1d5db', borderRadius: 10, outline: 'none', resize: 'none', marginBottom: 12, boxSizing: 'border-box', color: '#374151', background: '#fff' }}
      />
      <button
        onClick={() => stars > 0 && mutation.mutate()}
        disabled={stars === 0 || mutation.isPending}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: stars > 0 ? 'pointer' : 'not-allowed', background: stars > 0 ? '#002f6c' : '#e5e7eb', color: stars > 0 ? '#fff' : '#9ca3af' }}>
        <Send size={14} /> Enviar calificación
      </button>
    </div>
  )
}

export default function PortalPage() {
  const { T } = useTheme()
  const [modo, setModo]     = useState<'numero' | 'cedula'>('numero')
  const [valor, setValor]   = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [tramiteSeleccionado, setTramiteSeleccionado] = useState<any>(null)
  const [error, setError]   = useState('')
  const navigate = useNavigate()

  const buscar = useMutation({
    mutationFn: () => api.get('/tramites/portal/consultar/', {
      params: modo === 'numero' ? { numero: valor } : { cedula: valor }
    }).then(r => r.data),
    onSuccess: (data) => { setResultado(data); setError(''); setTramiteSeleccionado(null) },
    onError: (e: any) => { setError(e.response?.data?.detail || 'No se encontró el trámite'); setResultado(null) },
  })

  const buscarDetalle = useMutation({
    mutationFn: (numero: string) => api.get('/tramites/portal/consultar/', {
      params: { numero }
    }).then(r => r.data),
    onSuccess: (data) => setTramiteSeleccionado(data),
  })

  const cardStyle: React.CSSProperties = { background: T.ctHdrBg, borderRadius: 16, border: `0.5px solid ${T.rowBd}`, padding: 24, marginBottom: 16 }

  return (
    <div style={{ minHeight: '100vh', background: T.rowHv }}>
      {/* Header institucional — siempre azul institucional */}
      <div style={{ background: '#002f6c', padding: '24px 16px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.15)', flexShrink: 0 }}>
                <img src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
                  alt="GAD Cotopaxi" style={{ width: 40, filter: 'brightness(0) invert(1)' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div>
                <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Portal Ciudadano</h1>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, margin: '3px 0 0' }}>Gobierno Autónomo Descentralizado de la Provincia de Cotopaxi</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}>
              <ArrowLeft size={15} /> Acceso funcionarios
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>

        {/* Card de búsqueda */}
        {!tramiteSeleccionado && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.rowTxt, margin: '0 0 4px' }}>Consulta el estado de tu trámite</h2>
            <p style={{ fontSize: 13, color: T.rowSub, marginBottom: 20 }}>Ingresa el número de trámite o tu número de cédula para ver el estado actual</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['numero','Por número de trámite'],['cedula','Por cédula de identidad']].map(([m, l]) => (
                <button key={m} onClick={() => { setModo(m as any); setValor(''); setResultado(null); setError('') }}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all .15s', background: modo === m ? '#002f6c' : T.rowHv, color: modo === m ? '#fff' : T.rowSub }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
                <input
                  type="text"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && valor.trim() && buscar.mutate()}
                  placeholder={modo === 'numero' ? 'Ej: T-2026-000001' : 'Ej: 0501234567'}
                  style={{ width: '100%', paddingLeft: 38, paddingRight: 12, paddingTop: 12, paddingBottom: 12, fontSize: 13, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => valor.trim() && buscar.mutate()}
                disabled={!valor.trim() || buscar.isPending}
                style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: valor.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, background: valor.trim() ? '#002f6c' : T.rowHv, color: valor.trim() ? '#fff' : T.rowSub, flexShrink: 0 }}>
                {buscar.isPending
                  ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" />
                  : <Search size={15} />}
                Consultar
              </button>
            </div>

            {error && (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Lista de trámites por cédula */}
        {resultado?.tipo === 'lista' && !tramiteSeleccionado && (
          <div style={{ background: T.ctHdrBg, borderRadius: 16, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: `0.5px solid ${T.rowBd}` }}>
              <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 13, margin: 0 }}>Se encontraron {resultado.tramites.length} trámite(s)</h3>
            </div>
            {resultado.tramites.map((t: any) => (
              <div key={t.numero_tramite}
                onClick={() => buscarDetalle.mutate(t.numero_tramite)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: `0.5px solid ${T.rowBd}`, cursor: 'pointer', background: T.ctHdrBg }}
                onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c', margin: 0 }}>{t.numero_tramite}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: T.rowTxt, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.asunto}</p>
                  <p style={{ fontSize: 11, color: T.rowSub, margin: '2px 0 0' }}>{t.categoria} · Ingresado: {t.fecha_ingreso}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <EstadoBadge estado={t.estado_key} />
                  <ChevronRight size={16} style={{ color: T.rowSub }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detalle del trámite */}
        {(resultado?.tipo === 'detalle' || tramiteSeleccionado) && (() => {
          const d = tramiteSeleccionado || resultado

          return (
            <div>
              {tramiteSeleccionado && (
                <button onClick={() => setTramiteSeleccionado(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.rowSub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
                  <ArrowLeft size={15} /> Volver a la lista
                </button>
              )}

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c', margin: '0 0 4px' }}>{d.numero_tramite}</p>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: T.rowTxt, margin: 0, lineHeight: 1.3 }}>{d.asunto}</h2>
                    <p style={{ fontSize: 11, color: T.rowSub, margin: '4px 0 0' }}>{d.categoria} · {d.tipo_tramite}</p>
                  </div>
                  <EstadoBadge estado={d.estado_key} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  {['ingresado','asignado','en_proceso','resuelto'].map((est, i) => {
                    const estados = ['ingresado','asignado','en_proceso','resuelto']
                    const idx     = estados.indexOf(d.estado_key)
                    const done    = i <= idx
                    return (
                      <span key={est} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: done ? '#002f6c' : T.rowBd }} />
                        {i < 3 && <span style={{ display: 'inline-block', width: 40, height: 2, background: done && i < idx ? '#002f6c' : T.rowBd }} />}
                      </span>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.rowSub, marginTop: 4 }}>
                    <span>Ingresado</span><span>Asignado</span><span>En proceso</span><span>Resuelto</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Unidad responsable', value: d.unidad, icon: Building2 },
                    { label: 'Fecha de ingreso',   value: d.fecha_ingreso, icon: Calendar },
                    { label: 'Fecha límite',        value: d.fecha_limite, icon: Clock },
                    { label: 'Canal de ingreso',    value: d.canal_ingreso, icon: FileText },
                  ].map(({ label, value, icon: Icn }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, background: T.rowHv }}>
                      <Icn size={14} style={{ color: '#002f6c', marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 10, color: T.rowSub, margin: 0 }}>{label}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: '2px 0 0' }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {d.dias_restantes !== null && d.dias_restantes !== undefined && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: d.dias_restantes <= 0 ? '#fef2f2' : d.dias_restantes <= 3 ? '#fff7ed' : '#f0fdf4' }}>
                    <AlertTriangle size={16} style={{ color: d.dias_restantes <= 0 ? '#dc2626' : d.dias_restantes <= 3 ? '#c2410c' : '#15803d', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: d.dias_restantes <= 0 ? '#dc2626' : d.dias_restantes <= 3 ? '#c2410c' : '#15803d' }}>
                      {d.dias_restantes <= 0 ? 'El plazo de atención ha vencido' : d.dias_restantes === 1 ? 'Vence mañana' : `${d.dias_restantes} días hábiles restantes para atención`}
                    </p>
                  </div>
                )}

                {d.fecha_resolucion && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#f0fdf4', border: '0.5px solid #86efac' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: 0 }}>✓ Trámite resuelto el {d.fecha_resolucion}</p>
                    {d.dentro_plazo !== null && (
                      <p style={{ fontSize: 11, color: '#166534', margin: '3px 0 0' }}>
                        {d.dentro_plazo ? 'Resuelto dentro del plazo establecido' : 'Resuelto fuera del plazo establecido'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {d.seguimientos?.length > 0 && (
                <div style={cardStyle}>
                  <TimelineSeguimiento seguimientos={d.seguimientos} T={T} />
                </div>
              )}

              {d.estado_key === 'resuelto' && !d.calificacion && (
                <div style={cardStyle}>
                  <CalificacionWidget numero={d.numero_tramite} />
                </div>
              )}

              {d.calificacion && (
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex' }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={18} fill={n <= d.calificacion ? '#f59e0b' : 'none'} stroke={n <= d.calificacion ? '#f59e0b' : '#d1d5db'} />
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: T.rowSub, margin: 0 }}>Trámite calificado con {d.calificacion}/5</p>
                </div>
              )}
            </div>
          )
        })()}

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: T.rowSub, paddingBottom: 24 }}>
          <p style={{ fontWeight: 600, color: T.rowTxt, marginBottom: 4 }}>GAD Provincial de Cotopaxi</p>
          <p>Latacunga · Ecuador · Para soporte: sgd@cotopaxi.gob.ec</p>
        </div>
      </div>
    </div>
  )
}
