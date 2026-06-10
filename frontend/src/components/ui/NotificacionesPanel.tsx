import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificacionesService, Notificacion } from '@/services/notificaciones.service'
import { Bell, FileText, ClipboardList, Mail, Settings, CheckCheck, X } from 'lucide-react'

const TIPO_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  tramite:   { icon: ClipboardList, color: '#002f6c', bg: '#e8f1fd' },
  documento: { icon: FileText,      color: '#5b3a8c', bg: '#f0ebf9' },
  correo:    { icon: Mail,          color: '#854f0b', bg: '#faeeda' },
  sistema:   { icon: Settings,      color: '#0f6e56', bg: '#e1f5ee' },
  alerta:    { icon: Bell,          color: '#da291c', bg: '#fef2f2' },
}

function NotificacionItem({ n, onMarcar }: { n: Notificacion; onMarcar: (id: number) => void }) {
  const cfg  = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.sistema
  const Icon = cfg.icon
  const hace = () => {
    const diff = Date.now() - new Date(n.creado_en).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 1)  return 'Ahora'
    if (min < 60) return `Hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `Hace ${hrs}h`
    return `Hace ${Math.floor(hrs / 24)}d`
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
      style={{ background: n.leido ? 'transparent' : '#f8faff', borderBottom: '1px solid #f5f6f8' }}
      onClick={() => !n.leido && onMarcar(n.id)}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.bg }}>
        <Icon size={16} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-gray-900 leading-tight">{n.titulo}</p>
          {!n.leido && (
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#002f6c' }} />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
        <p className="text-[10px] text-gray-400 mt-1">{hace()}</p>
      </div>
    </div>
  )
}

export default function NotificacionesPanel() {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc  = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notificaciones-no-leidas'],
    queryFn:  notificacionesService.noLeidas,
    refetchInterval: 30000,
  })

  const marcar = useMutation({
    mutationFn: notificacionesService.marcarLeida,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notificaciones-no-leidas'] }),
  })

  const marcarTodas = useMutation({
    mutationFn: notificacionesService.marcarTodasLeidas,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notificaciones-no-leidas'] }),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const count         = data?.count ?? 0
  const notificaciones = data?.notificaciones ?? []

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAbierto(!abierto)}
        style={{
          position: 'relative', width: 36, height: 36,
          borderRadius: 10, border: '1px solid #f0f0f0',
          background: abierto ? '#f0f6ff' : '#fff',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: abierto ? '#002f6c' : '#6b7280',
        }}
        aria-label="Notificaciones"
      >
        <Bell size={17} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%',
            background: '#da291c', border: '1.5px solid #fff',
          }} />
        )}
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', top: 44, right: 0,
          width: 360, background: '#fff',
          borderRadius: 16, border: '1px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f5f6f8' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628' }}>Notificaciones</p>
              {count > 0 && (
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{count} sin leer</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {count > 0 && (
                <button
                  onClick={() => marcarTodas.mutate()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#002f6c', background: '#e8f1fd', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                  <CheckCheck size={13} /> Marcar todas
                </button>
              )}
              <button
                onClick={() => setAbierto(false)}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #f0f0f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notificaciones.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <Bell size={28} style={{ opacity: .3, marginBottom: 10 }} />
                <p style={{ fontSize: 13, fontWeight: 500 }}>Sin notificaciones pendientes</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Estás al día con todo</p>
              </div>
            ) : (
              notificaciones.map(n => (
                <NotificacionItem key={n.id} n={n} onMarcar={id => marcar.mutate(id)} />
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f6f8', textAlign: 'center' }}>
              <button style={{ fontSize: 12, fontWeight: 600, color: '#002f6c', background: 'none', border: 'none', cursor: 'pointer' }}>
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}