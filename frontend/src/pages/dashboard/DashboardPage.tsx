import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import GlassCard from '@/components/ui/GlassCard'
import { dashboardService } from '@/services/dashboard.service'
import {
  FileText, Clock, CheckCircle, Mail, Plus,
  FilePlus, ClipboardList, FileEdit, MailOpen,
  AlertTriangle, TrendingUp, Activity, Zap,
  BarChart2, Star, Target
} from 'lucide-react'

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  borrador:      { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  en_revision:   { bg: '#faf5ff', text: '#7e22ce', label: 'En revisión' },
  aprobado:      { bg: '#f0fdf4', text: '#15803d', label: 'Aprobado' },
  enviado:       { bg: '#eff6ff', text: '#1d4ed8', label: 'Enviado' },
  archivado:     { bg: '#f9fafb', text: '#374151', label: 'Archivado' },
  ingresado:     { bg: '#f0f9ff', text: '#0369a1', label: 'Ingresado' },
  asignado:      { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso:    { bg: '#eff6ff', text: '#1d4ed8', label: 'En proceso' },
  resuelto:      { bg: '#f0fdf4', text: '#15803d', label: 'Resuelto' },
  rechazado:     { bg: '#fef2f2', text: '#dc2626', label: 'Rechazado' },
}

function KpiCard({ valor, label, color, bgColor, icono: Icon, delta, deltaType, loading, index = 0 }: {
  valor: number | string; label: string; color: string; bgColor: string
  icono: any; delta: string; deltaType: 'up' | 'down' | 'warn'; loading?: boolean; index?: number
}) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const dc = {
    up:   { bg: '#e8f5ee', text: '#1d6a3a' },
    down: { bg: '#fef2f2', text: '#991b1b' },
    warn: { bg: '#fff7ed', text: '#92400e' },
  }[deltaType]

  return (
    <div className={`kpi-card-${index} btn-liquid`} style={{
      background: T.glassBackground,
      backdropFilter: T.glassBackdrop,
      WebkitBackdropFilter: T.glassBackdrop,
      border: T.glassBorder,
      boxShadow: T.glassShadow,
      borderRadius: 18,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', borderRadius: '18px 0 0 18px', background: color }} />
      <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, background: bgColor }}>
        <Icon size={17} style={{ color }} />
      </div>
      {loading ? (
        <div className="shimmer" style={{ height: 32, width: 64, borderRadius: 8, marginBottom: 4 }} />
      ) : (
        <p style={{ fontSize: 24, fontWeight: 700, color: T.rowTxt, lineHeight: 1 }}>{valor}</p>
      )}
      <p style={{ fontSize: 11, color: T.rowSub, fontWeight: 500, marginTop: 4 }}>{label}</p>
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, marginTop: 8, padding: '2px 8px', borderRadius: 20, background: dc.bg, color: dc.text }}>
        {delta}
      </span>
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      {data.map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: T.rowSub, textAlign: 'right', minWidth: 100, flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, overflow: 'hidden', background: T.rowBd }}>
            <div className="transition-all duration-700"
              style={{ width: `${Math.round(value / max * 100)}%`, height: '100%', borderRadius: 999, background: color }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, minWidth: 24 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

const CAT_COLORS = ['#002f6c','#0f6e56','#185fa5','#854f0b','#da291c','#534ab7']

const ACCIONES = [
  { label: 'Nuevo oficio',      icon: FilePlus,     bg: '#e8f1fd', color: '#002f6c', to: '/documentos' },
  { label: 'Nuevo trámite',     icon: ClipboardList, bg: '#fef2f2', color: '#da291c', to: '/tramites' },
  { label: 'Memorando',         icon: FileEdit,     bg: '#e1f5ee', color: '#0f6e56', to: '/documentos' },
  { label: 'Responder correo',  icon: MailOpen,     bg: '#faeeda', color: '#854f0b', to: '/correos' },
]

export default function DashboardPage() {
  const { usuario } = useAuthStore()
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const now    = new Date()
  const hora   = now.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fecha  = `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]} de ${now.getFullYear()}`

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.stats,
    refetchInterval: 60000,
  })

  const categoriasData = (stats?.tramites_categoria ?? []).map((c, i) => ({
    label: c.tipo_tramite__categoria__nombre || 'Sin categoría',
    value: c.total,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))

  const docs7dMax = Math.max(...(stats?.docs_7d ?? []).map(d => d.total), 1)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>{saludo}, {usuario?.nombres}</h1>
          <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>{fecha}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: T.rowSub, background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
            <TrendingUp size={14} /> Actualizar
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, cursor: 'pointer', border: 'none' }}>
            <Plus size={14} /> Nuevo documento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard index={0} valor={stats?.kpis.tramites_pendientes ?? '—'} label="Trámites pendientes"
          color="#002f6c" bgColor="#e8f1fd" icono={ClipboardList}
          delta="Activos en sistema" deltaType="warn" loading={isLoading} />
        <KpiCard index={1} valor={stats?.kpis.tramites_vencen_hoy ?? '—'} label="Vencen hoy"
          color="#da291c" bgColor="#fef2f2" icono={Clock}
          delta="⚠ Requieren atención" deltaType="warn" loading={isLoading} />
        <KpiCard index={2} valor={stats?.kpis.tramites_resueltos_mes ?? '—'} label="Resueltos este mes"
          color="#0f6e56" bgColor="#e1f5ee" icono={CheckCircle}
          delta="Últimos 30 días" deltaType="up" loading={isLoading} />
        <KpiCard index={3} valor={stats?.kpis.correos_sin_atender ?? '—'} label="Correos sin atender"
          color="#854f0b" bgColor="#faeeda" icono={Mail}
          delta="Pendientes de respuesta" deltaType="down" loading={isLoading} />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Docs. en revisión',      value: stats?.kpis.docs_pendientes, icon: FileText, color: '#5b3a8c', bg: '#f0ebf9' },
          { label: 'Cumplimiento plazo',      value: stats?.kpis.cumplimiento_plazo ? `${stats.kpis.cumplimiento_plazo}%` : '—', icon: Target, color: '#0f6e56', bg: '#e1f5ee' },
          { label: 'Satisfacción ciudadana',  value: stats?.kpis.satisfaccion ? `${stats.kpis.satisfaccion}/5` : '—', icon: Star, color: '#854f0b', bg: '#faeeda' },
        ].map(({ label, value, icon: Icon, color, bg }, idx) => (
          <GlassCard key={label} className={`kpi-card-${idx + 4}`} padding="16px" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              {isLoading
                ? <div className="shimmer" style={{ height: 24, width: 48, borderRadius: 6, marginBottom: 4 }} />
                : <p style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>{value ?? '—'}</p>
              }
              <p style={{ fontSize: 11, color: T.rowSub }}>{label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Fila principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico categorías */}
        <GlassCard className="lg:col-span-2 animate-fade-in-up" padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: T.glassBorder }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={15} style={{ color: T.accentDk }} /> Trámites por categoría (últimos 30 días)
            </span>
          </div>
          <div style={{ padding: 20 }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 16, borderRadius: 8 }} />)}
              </div>
            ) : categoriasData.length > 0 ? (
              <BarChart data={categoriasData} />
            ) : (
              <p style={{ fontSize: 13, color: T.rowSub, textAlign: 'center', padding: '24px 0' }}>Sin datos de trámites aún</p>
            )}
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.rowSub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={13} /> Documentos creados últimos 7 días
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64 }}>
              {(stats?.docs_7d ?? Array(7).fill({ dia: '—', total: 0 })).map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', transition: 'height .7s ease',
                    height: `${Math.round(d.total / docs7dMax * 100)}%`, minHeight: 4,
                    background: i === 6 ? T.accentDk : T.rowBlNr,
                  }} />
                  <span style={{ fontSize: 9, color: T.rowSub }}>{d.dia}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Acciones rápidas */}
          <GlassCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: T.glassBorder }}>
              <Zap size={14} style={{ color: T.accentDk }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Acciones rápidas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
              {ACCIONES.map(({ label, icon: Icon, bg, color }) => (
                <button key={label} className="btn-liquid"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, border: 'none', cursor: 'pointer', background: bg }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.7)' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'left', lineHeight: 1.3 }}>{label}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Próximos a vencer */}
          <GlassCard padding="0" style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: T.glassBorder }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} style={{ color: '#da291c' }} /> Próximos a vencer
              </span>
            </div>
            {isLoading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 40, borderRadius: 10 }} />)}
              </div>
            ) : (stats?.proximos_vencer ?? []).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: 11, color: T.rowSub }}>Sin vencimientos próximos</p>
              </div>
            ) : (
              (stats?.proximos_vencer ?? []).map(({ numero, titulo, unidad, dias }) => (
                <div key={numero} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${T.pnMetaBd}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: dias <= 0 ? '#fef2f2' : '#fff7ed', color: dias <= 0 ? '#991b1b' : '#92400e' }}>
                    {dias <= 0 ? 'Hoy' : `${dias}d`}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: T.rowTxt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</p>
                    <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{unidad}</p>
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Trámites recientes */}
        <GlassCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: T.glassBorder }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={14} style={{ color: T.accentDk }} /> Trámites recientes
            </span>
          </div>
          {isLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 10 }} />)}
            </div>
          ) : (stats?.tramites_recientes ?? []).length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 11, color: T.rowSub }}>Sin trámites registrados</p>
            </div>
          ) : (
            (stats?.tramites_recientes ?? []).map(t => {
              const s = ESTADOS[t.estado] ?? ESTADOS.ingresado
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.pnMetaBd}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{t.numero}</p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: T.rowTxt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{t.asunto}</p>
                    <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{t.persona} · {t.unidad}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: s.bg, color: s.text }}>{s.label}</span>
                </div>
              )
            })
          )}
        </GlassCard>

        {/* Documentos recientes */}
        <GlassCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: T.glassBorder }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} style={{ color: T.accentDk }} /> Documentos recientes
            </span>
          </div>
          {isLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 10 }} />)}
            </div>
          ) : (stats?.docs_recientes ?? []).length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 11, color: T.rowSub }}>Sin documentos registrados</p>
            </div>
          ) : (
            (stats?.docs_recientes ?? []).map(d => {
              const s = ESTADOS[d.estado] ?? ESTADOS.borrador
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.pnMetaBd}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{d.numero}</p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: T.rowTxt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{d.asunto}</p>
                    <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{d.tipo} · {d.unidad}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: s.bg, color: s.text }}>{s.label}</span>
                </div>
              )
            })
          )}
        </GlassCard>

        {/* Actividad reciente */}
        <GlassCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: T.glassBorder }}>
            <Activity size={14} style={{ color: T.accentDk }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Actividad reciente</span>
          </div>
          {isLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 40, borderRadius: 10 }} />)}
            </div>
          ) : (stats?.actividad ?? []).length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 11, color: T.rowSub }}>Sin actividad reciente</p>
            </div>
          ) : (
            (stats?.actividad ?? []).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.pnMetaBd}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: a.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: T.rowTxt, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.texto}</p>
                  <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{a.fecha} · {a.unidad}</p>
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  )
}