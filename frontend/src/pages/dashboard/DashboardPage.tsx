import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
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

function KpiCard({ valor, label, color, bgColor, icono: Icon, delta, deltaType, loading }: {
  valor: number | string; label: string; color: string; bgColor: string
  icono: any; delta: string; deltaType: 'up' | 'down' | 'warn'; loading?: boolean
}) {
  const dc = {
    up:   { bg: '#e8f5ee', text: '#1d6a3a' },
    down: { bg: '#fef2f2', text: '#991b1b' },
    warn: { bg: '#fff7ed', text: '#92400e' },
  }[deltaType]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: color }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bgColor }}>
        <Icon size={17} style={{ color }} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 leading-none">{valor}</p>
      )}
      <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
      <span className="inline-flex items-center text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full"
        style={{ background: dc.bg, color: dc.text }}>
        {delta}
      </span>
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      {data.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3 mb-2.5 last:mb-0">
          <span className="text-xs text-gray-500 text-right" style={{ minWidth: 100 }}>{label}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.round(value / max * 100)}%`, background: color }} />
          </div>
          <span className="text-xs font-semibold text-gray-700" style={{ minWidth: 24 }}>{value}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{saludo}, {usuario?.nombres}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{fecha}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <TrendingUp size={14} /> Actualizar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl"
            style={{ background: '#002f6c' }}>
            <Plus size={14} /> Nuevo documento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard valor={stats?.kpis.tramites_pendientes ?? '—'} label="Trámites pendientes"
          color="#002f6c" bgColor="#e8f1fd" icono={ClipboardList}
          delta="Activos en sistema" deltaType="warn" loading={isLoading} />
        <KpiCard valor={stats?.kpis.tramites_vencen_hoy ?? '—'} label="Vencen hoy"
          color="#da291c" bgColor="#fef2f2" icono={Clock}
          delta="⚠ Requieren atención" deltaType="warn" loading={isLoading} />
        <KpiCard valor={stats?.kpis.tramites_resueltos_mes ?? '—'} label="Resueltos este mes"
          color="#0f6e56" bgColor="#e1f5ee" icono={CheckCircle}
          delta="Últimos 30 días" deltaType="up" loading={isLoading} />
        <KpiCard valor={stats?.kpis.correos_sin_atender ?? '—'} label="Correos sin atender"
          color="#854f0b" bgColor="#faeeda" icono={Mail}
          delta="Pendientes de respuesta" deltaType="down" loading={isLoading} />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Docs. en revisión', value: stats?.kpis.docs_pendientes, icon: FileText,   color: '#5b3a8c', bg: '#f0ebf9' },
          { label: 'Cumplimiento plazo', value: stats?.kpis.cumplimiento_plazo ? `${stats.kpis.cumplimiento_plazo}%` : '—', icon: Target, color: '#0f6e56', bg: '#e1f5ee' },
          { label: 'Satisfacción ciudadana', value: stats?.kpis.satisfaccion ? `${stats.kpis.satisfaccion}/5` : '—', icon: Star, color: '#854f0b', bg: '#faeeda' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              {isLoading
                ? <div className="h-6 w-12 bg-gray-100 rounded animate-pulse mb-1" />
                : <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
              }
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fila principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico categorías */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 size={15} style={{ color: '#002f6c' }} /> Trámites por categoría (últimos 30 días)
            </span>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : categoriasData.length > 0 ? (
              <BarChart data={categoriasData} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Sin datos de trámites aún</p>
            )}
          </div>

          {/* Mini chart docs 7 días */}
          <div className="px-5 pb-5">
            <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
              <TrendingUp size={13} /> Documentos creados últimos 7 días
            </p>
            <div className="flex items-end gap-2 h-16">
              {(stats?.docs_7d ?? Array(7).fill({ dia: '—', total: 0 })).map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.round(d.total / docs7dMax * 100)}%`,
                      minHeight: 4,
                      background: i === 6 ? '#002f6c' : '#b5d4f4',
                    }} />
                  <span className="text-[9px] text-gray-400">{d.dia}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Acciones rápidas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
              <Zap size={14} style={{ color: '#002f6c' }} />
              <span className="text-sm font-bold text-gray-900">Acciones rápidas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {ACCIONES.map(({ label, icon: Icon, bg, color }) => (
                <button key={label}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors hover:opacity-80"
                  style={{ background: bg }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.7)' }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span className="text-xs font-semibold leading-tight" style={{ color }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Próximos a vencer */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: '#da291c' }} /> Próximos a vencer
              </span>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (stats?.proximos_vencer ?? []).length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-xs">Sin vencimientos próximos</p>
              </div>
            ) : (
              (stats?.proximos_vencer ?? []).map(({ numero, titulo, unidad, dias }) => (
                <div key={numero} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: dias <= 0 ? '#fef2f2' : '#fff7ed', color: dias <= 0 ? '#991b1b' : '#92400e' }}>
                    {dias <= 0 ? 'Hoy' : `${dias}d`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{titulo}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{unidad}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Trámites recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={14} style={{ color: '#002f6c' }} /> Trámites recientes
            </span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (stats?.tramites_recientes ?? []).length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-xs">Sin trámites registrados</div>
          ) : (
            (stats?.tramites_recientes ?? []).map(t => {
              const s = ESTADOS[t.estado] ?? ESTADOS.ingresado
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{t.numero}</p>
                    <p className="text-xs font-medium text-gray-900 truncate mt-0.5">{t.asunto}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.persona} · {t.unidad}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: s.bg, color: s.text }}>{s.label}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Documentos recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText size={14} style={{ color: '#002f6c' }} /> Documentos recientes
            </span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (stats?.docs_recientes ?? []).length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-xs">Sin documentos registrados</div>
          ) : (
            (stats?.docs_recientes ?? []).map(d => {
              const s = ESTADOS[d.estado] ?? ESTADOS.borrador
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{d.numero}</p>
                    <p className="text-xs font-medium text-gray-900 truncate mt-0.5">{d.asunto}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{d.tipo} · {d.unidad}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: s.bg, color: s.text }}>{s.label}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <Activity size={14} style={{ color: '#002f6c' }} />
            <span className="text-sm font-bold text-gray-900">Actividad reciente</span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (stats?.actividad ?? []).length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-xs">Sin actividad reciente</div>
          ) : (
            (stats?.actividad ?? []).map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-relaxed truncate">{a.texto}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.fecha} · {a.unidad}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}