import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Search, CheckCircle, Clock, AlertTriangle,
  XCircle, FileText, Building2, Calendar,
  Star, ChevronRight, ArrowLeft, Send
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  ingresado:     { color: '#1d4ed8', bg: '#eff6ff', icon: FileText,      label: 'Ingresado' },
  asignado:      { color: '#7e22ce', bg: '#faf5ff', icon: Clock,         label: 'Asignado' },
  en_proceso:    { color: '#c2410c', bg: '#fff7ed', icon: Clock,         label: 'En proceso' },
  en_inspeccion: { color: '#854f0b', bg: '#faeeda', icon: Clock,         label: 'En inspección' },
  resuelto:      { color: '#15803d', bg: '#f0fdf4', icon: CheckCircle,   label: 'Resuelto' },
  rechazado:     { color: '#dc2626', bg: '#fef2f2', icon: XCircle,       label: 'Rechazado' },
  desistido:     { color: '#6b7280', bg: '#f9fafb', icon: XCircle,       label: 'Desistido' },
  archivado:     { color: '#374151', bg: '#f9fafb', icon: Archive,       label: 'Archivado' },
}

function Archive(props: any) {
  return <FileText {...props} />
}


function EstadoBadge({ estado }: { estado: string }) {
  const cfg  = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.ingresado
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={13} /> {cfg.label}
    </span>
  )
}

function TimelineSeguimiento({ seguimientos }: { seguimientos: any[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
        <Clock size={15} style={{ color: '#002f6c' }} /> Historial de seguimiento
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        {seguimientos.map((s, i) => (
          <div key={i} className="flex gap-4 mb-4 last:mb-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
              style={{ background: i === seguimientos.length - 1 ? '#002f6c' : '#e8f1fd' }}>
              <CheckCircle size={14} style={{ color: i === seguimientos.length - 1 ? '#fff' : '#002f6c' }} />
            </div>
            <div className="flex-1 pb-2">
              <p className="text-xs font-bold text-gray-900 capitalize">{s.estado.replace(/_/g, ' ')}</p>
              {s.observacion && <p className="text-xs text-gray-500 mt-0.5">{s.observacion}</p>}
              <p className="text-[10px] text-gray-400 mt-1">{s.fecha}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalificacionWidget({ numero }: { numero: string }) {
  const [stars, setStars]       = useState(0)
  const [hover, setHover]       = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado]   = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.post('/tramites/portal/calificar/', {
      numero_tramite: numero,
      calificacion:   stars,
      comentario,
    }),
    onSuccess: () => setEnviado(true),
  })

  if (enviado) return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center mt-4">
      <CheckCircle size={28} className="text-green-600 mx-auto mb-2" />
      <p className="font-bold text-green-800">¡Gracias por tu calificación!</p>
      <p className="text-xs text-green-600 mt-1">Tu opinión nos ayuda a mejorar el servicio</p>
    </div>
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">¿Cómo calificarías el servicio recibido?</h3>
      <div className="flex items-center gap-1 mb-4">
        {[1,2,3,4,5].map(n => (
          <button key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            className="transition-transform hover:scale-110">
            <Star size={28} fill={(hover || stars) >= n ? '#f59e0b' : 'none'} stroke={(hover || stars) >= n ? '#f59e0b' : '#d1d5db'} />
          </button>
        ))}
        {stars > 0 && <span className="ml-2 text-sm text-gray-500">{['','Muy malo','Malo','Regular','Bueno','Excelente'][stars]}</span>}
      </div>
      <textarea
        value={comentario}
        onChange={e => setComentario(e.target.value)}
        placeholder="Cuéntanos tu experiencia (opcional)..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] resize-none mb-3"
      />
      <button
        onClick={() => stars > 0 && mutation.mutate()}
        disabled={stars === 0 || mutation.isPending}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
        style={{ background: stars > 0 ? '#002f6c' : '#e5e7eb', color: stars > 0 ? '#fff' : '#9ca3af' }}>
        <Send size={14} /> Enviar calificación
      </button>
    </div>
  )
}

export default function PortalPage() {
  const [modo, setModo]         = useState<'numero' | 'cedula'>('numero')
  const [valor, setValor]       = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [tramiteSeleccionado, setTramiteSeleccionado] = useState<any>(null)
  const [error, setError]       = useState('')
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

  return (
    <div className="min-h-screen" style={{ background: '#f4f6fa' }}>

      {/* Header institucional */}
      <div style={{ background: '#002f6c' }} className="py-6 px-4">
  <div className="max-w-3xl mx-auto">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,.15)' }}>
          <img src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
            alt="GAD Cotopaxi" className="w-10 h-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <div>
          <h1 className="text-white text-lg font-bold leading-tight">Portal Ciudadano</h1>
          <p className="text-white/60 text-sm">Gobierno Autónomo Descentralizado de la Provincia de Cotopaxi</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}>
        <ArrowLeft size={15} /> Acceso funcionarios
      </button>
    </div>
  </div>
</div>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Card de búsqueda */}
        {!tramiteSeleccionado && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Consulta el estado de tu trámite</h2>
            <p className="text-sm text-gray-500 mb-5">Ingresa el número de trámite o tu número de cédula para ver el estado actual</p>

            {/* Selector de modo */}
            <div className="flex gap-2 mb-4">
              {[['numero','Por número de trámite'],['cedula','Por cédula de identidad']].map(([m, l]) => (
                <button key={m} onClick={() => { setModo(m as any); setValor(''); setResultado(null); setError('') }}
                  className="flex-1 py-2 text-sm font-semibold rounded-xl transition-all"
                  style={{ background: modo === m ? '#002f6c' : '#f3f4f6', color: modo === m ? '#fff' : '#6b7280' }}>
                  {l}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && valor.trim() && buscar.mutate()}
                  placeholder={modo === 'numero' ? 'Ej: T-2026-000001' : 'Ej: 0501234567'}
                  className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10"
                />
              </div>
              <button
                onClick={() => valor.trim() && buscar.mutate()}
                disabled={!valor.trim() || buscar.isPending}
                className="px-5 py-3 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                style={{ background: valor.trim() ? '#002f6c' : '#e5e7eb', color: valor.trim() ? '#fff' : '#9ca3af' }}>
                {buscar.isPending
                  ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                  : <Search size={15} />}
                Consultar
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertTriangle size={15} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Lista de trámites por cédula */}
        {resultado?.tipo === 'lista' && !tramiteSeleccionado && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Se encontraron {resultado.tramites.length} trámite(s)</h3>
            </div>
            {resultado.tramites.map((t: any) => (
              <div key={t.numero_tramite}
                onClick={() => buscarDetalle.mutate(t.numero_tramite)}
                className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{t.numero_tramite}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{t.asunto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.categoria} · Ingresado: {t.fecha_ingreso}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <EstadoBadge estado={t.estado_key} />
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detalle del trámite */}
        {(resultado?.tipo === 'detalle' || tramiteSeleccionado) && (() => {
          const d = tramiteSeleccionado || resultado
          const cfg = ESTADO_CONFIG[d.estado_key] ?? ESTADO_CONFIG.ingresado
          const Icon = cfg.icon
          return (
            <div>
              {tramiteSeleccionado && (
                <button onClick={() => setTramiteSeleccionado(null)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <ArrowLeft size={15} /> Volver a la lista
                </button>
              )}

              {/* Estado principal */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold font-mono mb-1" style={{ color: '#002f6c' }}>{d.numero_tramite}</p>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">{d.asunto}</h2>
                    <p className="text-xs text-gray-500 mt-1">{d.categoria} · {d.tipo_tramite}</p>
                  </div>
                  <EstadoBadge estado={d.estado_key} />
                </div>

                {/* Barra de progreso visual */}
                <div className="mb-5">
                  {['ingresado','asignado','en_proceso','resuelto'].map((est, i) => {
                    const estados = ['ingresado','asignado','en_proceso','resuelto']
                    const idx     = estados.indexOf(d.estado_key)
                    const done    = i <= idx
                    const active  = i === idx
                    return (
                      <span key={est} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                          background: done ? '#002f6c' : '#e5e7eb',
                          border: active ? '2px solid #002f6c' : 'none',
                        }} />
                        {i < 3 && <span style={{ display: 'inline-block', width: 40, height: 2, background: done && i < idx ? '#002f6c' : '#e5e7eb' }} />}
                      </span>
                    )
                  })}
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Ingresado</span><span>Asignado</span><span>En proceso</span><span>Resuelto</span>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Unidad responsable', value: d.unidad, icon: Building2 },
                    { label: 'Fecha de ingreso',   value: d.fecha_ingreso, icon: Calendar },
                    { label: 'Fecha límite',        value: d.fecha_limite, icon: Clock },
                    { label: 'Canal de ingreso',    value: d.canal_ingreso, icon: FileText },
                  ].map(({ label, value, icon: Icn }) => (
                    <div key={label} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#f8faff' }}>
                      <Icn size={14} style={{ color: '#002f6c', marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                        <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Días restantes */}
                {d.dias_restantes !== null && d.dias_restantes !== undefined && (
                  <div className="mt-3 p-3 rounded-xl flex items-center gap-3"
                    style={{ background: d.dias_restantes <= 0 ? '#fef2f2' : d.dias_restantes <= 3 ? '#fff7ed' : '#f0fdf4' }}>
                    <AlertTriangle size={16} style={{ color: d.dias_restantes <= 0 ? '#dc2626' : d.dias_restantes <= 3 ? '#c2410c' : '#15803d', flexShrink: 0 }} />
                    <p className="text-xs font-semibold" style={{ color: d.dias_restantes <= 0 ? '#dc2626' : d.dias_restantes <= 3 ? '#c2410c' : '#15803d' }}>
                      {d.dias_restantes <= 0
                        ? 'El plazo de atención ha vencido'
                        : d.dias_restantes === 1
                        ? 'Vence mañana'
                        : `${d.dias_restantes} días hábiles restantes para atención`}
                    </p>
                  </div>
                )}

                {/* Resolución */}
                {d.fecha_resolucion && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p className="text-xs font-bold text-green-800">✓ Trámite resuelto el {d.fecha_resolucion}</p>
                    {d.dentro_plazo !== null && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {d.dentro_plazo ? 'Resuelto dentro del plazo establecido' : 'Resuelto fuera del plazo establecido'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Seguimiento */}
              {d.seguimientos?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
                  <TimelineSeguimiento seguimientos={d.seguimientos} />
                </div>
              )}

              {/* Calificación si está resuelto */}
              {d.estado_key === 'resuelto' && !d.calificacion && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <CalificacionWidget numero={d.numero_tramite} />
                </div>
              )}

              {d.calificacion && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
                  <div className="flex">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={18} fill={n <= d.calificacion ? '#f59e0b' : 'none'} stroke={n <= d.calificacion ? '#f59e0b' : '#d1d5db'} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">Trámite calificado con {d.calificacion}/5</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 pb-6">
          <p className="font-medium text-gray-500 mb-1">GAD Provincial de Cotopaxi</p>
          <p>Latacunga · Ecuador · Para soporte: sgd@cotopaxi.gob.ec</p>
        </div>
      </div>
    </div>
  )
}