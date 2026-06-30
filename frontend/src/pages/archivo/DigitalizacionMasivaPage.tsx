import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  ScanLine, Upload, X, CheckCircle2, AlertCircle,
  FileText, Loader2, Search, FolderOpen, RefreshCw,
  ChevronRight, Info, ShieldCheck, Clock
} from 'lucide-react'

// ── Servicios ──────────────────────────────────────────────────────────

const digitalizacionService = {
  subirLote: (formData: FormData) =>
    api.post('/documentos/digitalizacion-masiva/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  estadoOcr: () =>
    api.get('/documentos/digitalizacion-masiva/').then(r => r.data),

  buscarTexto: (q: string) =>
    api.get('/documentos/adjuntos/buscar/', { params: { q } }).then(r => r.data),

  expedientes: (search: string) =>
    api.get('/archivo/expedientes/', { params: { search, estado: 'abierto' } })
      .then(r => Array.isArray(r.data) ? r.data : r.data.results ?? []),
}

// ── Tipos ──────────────────────────────────────────────────────────────

interface ArchivoEstado {
  file: File
  estado: 'pendiente' | 'subiendo' | 'ok' | 'error'
  error?: string
  adjunto_id?: number
}

// ── Componente principal ───────────────────────────────────────────────

export default function DigitalizacionMasivaPage() {
  const [tab, setTab] = useState<'carga' | 'busqueda' | 'estado'>('carga')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScanLine size={18} style={{ color: '#002f6c' }} />
          Digitalización masiva de fondo documental histórico
        </h1>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Carga y procesamiento OCR de documentos físicos anteriores · Regla Técnica Nacional Art. 68-79
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
        {[
          { key: 'carga',    label: 'Carga masiva',        icon: Upload   },
          { key: 'busqueda', label: 'Búsqueda en contenido', icon: Search },
          { key: 'estado',   label: 'Estado OCR',           icon: Clock   },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === key ? '#fff' : '#f9fafb',
              color: tab === key ? '#002f6c' : '#9ca3af',
              borderBottom: `2px solid ${tab === key ? '#002f6c' : 'transparent'}`,
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', padding: 24 }}>
        {tab === 'carga'    && <TabCargaMasiva />}
        {tab === 'busqueda' && <TabBusqueda />}
        {tab === 'estado'   && <TabEstadoOcr />}
      </div>
    </div>
  )
}

// ── Tab 1: Carga masiva ────────────────────────────────────────────────

function TabCargaMasiva() {
  const [archivos, setArchivos]         = useState<ArchivoEstado[]>([])
  const [expedienteId, setExpedienteId] = useState<number | null>(null)
  const [busqExp, setBusqExp]           = useState('')
  const [origen, setOrigen]             = useState('institucional')
  const [resolucion, setResolucion]     = useState('300')
  const [anio, setAnio]                 = useState(new Date().getFullYear().toString())
  const [resultado, setResultado]       = useState<any>(null)
  const [subiendo, setSubiendo]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: expedientes } = useQuery({
    queryKey: ['expedientes-dig', busqExp],
    queryFn: () => digitalizacionService.expedientes(busqExp),
    enabled: busqExp.length >= 2,
  })

  const handleDrop = useCallback((files: FileList | null) => {
    if (!files) return
    const nuevos: ArchivoEstado[] = Array.from(files)
      .filter(f => f.type === 'application/pdf' || f.name.match(/\.(pdf|tiff?|jpg|jpeg|png)$/i))
      .filter(f => f.size <= 100 * 1024 * 1024) // 100MB máx
      .map(f => ({ file: f, estado: 'pendiente' as const }))
    setArchivos(prev => [...prev, ...nuevos].slice(0, 50))
  }, [])

  const eliminarArchivo = (idx: number) =>
    setArchivos(prev => prev.filter((_, i) => i !== idx))

  const subirLote = async () => {
    if (archivos.length === 0) return
    setSubiendo(true)
    setResultado(null)

    const LOTE = 10
    const todosResultados: any[] = []

    for (let i = 0; i < archivos.length; i += LOTE) {
      const lote = archivos.slice(i, i + LOTE)

      setArchivos(prev => prev.map((a, idx) =>
        idx >= i && idx < i + LOTE ? { ...a, estado: 'subiendo' } : a
      ))

      const fd = new FormData()
      lote.forEach(a => fd.append('archivos', a.file))
      fd.append('origen_digitalizacion', origen)
      fd.append('resolucion_ppp', resolucion)
      fd.append('anio_documento', anio)
      if (expedienteId) fd.append('expediente_id', String(expedienteId))

      try {
        const resp = await digitalizacionService.subirLote(fd)
        todosResultados.push(...(resp.resultados ?? []))

        setArchivos(prev => prev.map((a, idx) => {
          if (idx < i || idx >= i + LOTE) return a
          const r = resp.resultados?.[idx - i]
          return { ...a, estado: r?.estado === 'subido' ? 'ok' : 'error', error: r?.error, adjunto_id: r?.id }
        }))
      } catch (e: any) {
        setArchivos(prev => prev.map((a, idx) =>
          idx >= i && idx < i + LOTE ? { ...a, estado: 'error', error: 'Error de conexión' } : a
        ))
      }
    }

    const exitosos = todosResultados.filter(r => r.estado === 'subido').length
    const errores  = todosResultados.filter(r => r.estado === 'error').length
    setResultado({ total: archivos.length, exitosos, errores })
    setSubiendo(false)
  }

  const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white"
  const exitosos = archivos.filter(a => a.estado === 'ok').length
  const errores  = archivos.filter(a => a.estado === 'error').length
  const pendientes = archivos.filter(a => a.estado === 'pendiente').length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      {/* Panel izquierdo — zona de carga */}
      <div>
        <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 10 }}>
          <Info size={14} style={{ color: '#15803d', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>
            Sube hasta 50 archivos por lote (PDF, TIFF, JPG). El sistema detecta automáticamente si el PDF tiene texto o requiere OCR. Los documentos escaneados serán procesados con reconocimiento óptico de caracteres en español.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleDrop(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #d1d5db', borderRadius: 12, padding: 32,
            textAlign: 'center', cursor: 'pointer', background: '#fafbfc',
            marginBottom: 16, transition: 'all .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#002f6c')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#d1d5db')}
        >
          <Upload size={28} style={{ color: '#9ca3af', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
            Arrastra los archivos aquí o haz clic para seleccionar
          </p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            PDF, TIFF, JPG · Máx. 100MB por archivo · Hasta 50 archivos por lote
          </p>
          <input ref={inputRef} type="file" multiple accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png"
            style={{ display: 'none' }} onChange={e => handleDrop(e.target.files)} />
        </div>

        {/* Contadores */}
        {archivos.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Total',      val: archivos.length, bg: '#f3f4f6', text: '#374151' },
              { label: 'Pendientes', val: pendientes,       bg: '#fff7ed', text: '#c2410c' },
              { label: 'Exitosos',   val: exitosos,         bg: '#f0fdf4', text: '#15803d' },
              { label: 'Errores',    val: errores,          bg: '#fef2f2', text: '#dc2626' },
            ].map(({ label, val, bg, text }) => (
              <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0 }}>{val}</p>
                <p style={{ fontSize: 10, color: text, margin: 0, opacity: .8 }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista de archivos */}
        {archivos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
            {archivos.map((a, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                border: `0.5px solid ${a.estado === 'ok' ? '#86efac' : a.estado === 'error' ? '#fecaca' : '#f0f0f0'}`,
                background: a.estado === 'ok' ? '#f0fdf4' : a.estado === 'error' ? '#fef2f2' : '#fff',
              }}>
                <FileText size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.file.name}
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                  {(a.file.size / 1024 / 1024).toFixed(1)}MB
                </span>
                {a.estado === 'pendiente' && (
                  <button onClick={() => eliminarArchivo(idx)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                    <X size={12} />
                  </button>
                )}
                {a.estado === 'subiendo' && <Loader2 size={13} style={{ color: '#002f6c', flexShrink: 0 }} className="animate-spin" />}
                {a.estado === 'ok'       && <CheckCircle2 size={13} style={{ color: '#15803d', flexShrink: 0 }} />}
                {a.estado === 'error'    && (
                  <span style={{ fontSize: 10, color: '#dc2626', flexShrink: 0 }} title={a.error}>
                    <AlertCircle size={13} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Resultado final */}
        {resultado && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: resultado.errores === 0 ? '#f0fdf4' : '#fff7ed', border: `0.5px solid ${resultado.errores === 0 ? '#86efac' : '#fed7aa'}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: resultado.errores === 0 ? '#15803d' : '#854f0b', margin: '0 0 4px' }}>
              {resultado.errores === 0 ? '✓ Lote procesado correctamente' : `⚠ Lote procesado con ${resultado.errores} error(es)`}
            </p>
            <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>
              {resultado.exitosos} de {resultado.total} archivos subidos exitosamente. El OCR se procesa en segundo plano — puedes revisar el progreso en la pestaña "Estado OCR".
            </p>
          </div>
        )}

        {/* Botón subir */}
        {archivos.some(a => a.estado === 'pendiente') && (
          <button onClick={subirLote} disabled={subiendo}
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: subiendo ? '#94a3b8' : '#002f6c', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
            {subiendo ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {subiendo ? 'Subiendo archivos...' : `Subir ${archivos.filter(a => a.estado === 'pendiente').length} archivo(s)`}
          </button>
        )}
      </div>

      {/* Panel derecho — parámetros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', marginBottom: 12 }}>Parámetros de digitalización</p>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>
              Origen de digitalización
            </label>
            <select className={cls} value={origen} onChange={e => setOrigen(e.target.value)}>
              <option value="institucional">Institucional (escáner propio · 300ppp)</option>
              <option value="quipux">Recibido vía Quipux (90ppp)</option>
              <option value="nativo_digital">Nativo digital</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>
              Resolución (ppp)
            </label>
            <input type="number" className={cls} value={resolucion} onChange={e => setResolucion(e.target.value)} />
            {origen === 'institucional' && Number(resolucion) < 300 && (
              <p style={{ fontSize: 10, color: '#c2410c', marginTop: 3 }}>⚠ La norma exige mínimo 300ppp para digitalización institucional</p>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>
              Año del documento original
            </label>
            <input type="number" className={cls} value={anio} min="2000" max="2026"
              onChange={e => setAnio(e.target.value)} />
          </div>
        </div>

        <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', marginBottom: 10 }}>Vincular a expediente (opcional)</p>
          <input className={cls} placeholder="Buscar expediente..." value={busqExp}
            onChange={e => { setBusqExp(e.target.value); setExpedienteId(null) }}
            style={{ marginBottom: 6 }} />
          {expedientes && expedientes.length > 0 && !expedienteId && (
            <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {expedientes.slice(0, 5).map((exp: any) => (
                <div key={exp.id}
                  onClick={() => { setExpedienteId(exp.id); setBusqExp(`${exp.codigo_expediente} — ${exp.titulo}`) }}
                  style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 11, borderBottom: '0.5px solid #f5f5f5', background: '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#002f6c', fontWeight: 700 }}>{exp.codigo_expediente}</span>
                  <span style={{ marginLeft: 6, color: '#374151' }}>{exp.titulo}</span>
                </div>
              ))}
            </div>
          )}
          {expedienteId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#f0fdf4', borderRadius: 8, marginTop: 4 }}>
              <FolderOpen size={12} style={{ color: '#15803d' }} />
              <span style={{ fontSize: 11, color: '#15803d', flex: 1 }}>Expediente vinculado</span>
              <button onClick={() => { setExpedienteId(null); setBusqExp('') }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Regla Técnica — Art. 68-79</p>
          <ul style={{ fontSize: 10, color: '#78350f', margin: 0, paddingLeft: 14, lineHeight: 1.8 }}>
            <li>Resolución mínima: 300ppp institucional</li>
            <li>Formato: PDF/A para conservación</li>
            <li>El original físico queda con hoja testigo</li>
            <li>Hash SHA-256 garantiza integridad</li>
            <li>OCR en español para búsqueda full-text</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: Búsqueda en contenido ───────────────────────────────────────

function TabBusqueda() {
  const [query, setQuery]         = useState('')
  const [buscando, setBuscando]   = useState(false)
  const [resultados, setResultados] = useState<any>(null)
  const [error, setError]         = useState('')

  const buscar = async () => {
    if (query.trim().length < 3) { setError('Ingresa al menos 3 caracteres'); return }
    setBuscando(true); setError(''); setResultados(null)
    try {
      const data = await digitalizacionService.buscarTexto(query.trim())
      setResultados(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al buscar')
    }
    setBuscando(false)
  }

  return (
    <div>
      <div style={{ background: '#e8f1fd', border: '0.5px solid #93c5fd', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 10 }}>
        <Info size={14} style={{ color: '#002f6c', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: '#1e3a5f', margin: 0 }}>
          Busca palabras o frases dentro del <strong>contenido</strong> de todos los documentos digitalizados — no solo en el nombre del archivo. Usa el índice full-text de PostgreSQL con stemming en español.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 32px', fontSize: 13, border: '0.5px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#f9fafb', color: '#374151' }}
            placeholder="Ej: contrato obras viales 2019, resolución presupuesto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
          />
        </div>
        <button onClick={buscar} disabled={buscando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: buscando ? '#94a3b8' : '#002f6c', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: buscando ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {resultados && (
        <div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
            {resultados.total} resultado(s) para <strong style={{ color: '#002f6c' }}>"{resultados.query}"</strong>
          </p>
          {resultados.total === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#c4c9d4' }}>
              <Search size={28} style={{ opacity: .3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No se encontraron documentos con ese contenido</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resultados.resultados.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, border: '0.5px solid #e5e7eb', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <FileText size={14} style={{ color: '#002f6c', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.nombre}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        {r.paginas && (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>{r.paginas} págs.</span>
                        )}
                        {r.ocr_confianza && (
                          <span style={{ fontSize: 10, color: r.ocr_confianza > 80 ? '#15803d' : '#c2410c', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ShieldCheck size={9} /> OCR {Math.round(r.ocr_confianza)}%
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>
                          Relevancia: {(r.relevancia * 100).toFixed(0)}%
                        </span>
                      </div>
                      {r.fragmento && (
                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: r.fragmento.replace(/<mark>/g, '<mark style="background:#fef08a;padding:1px 2px;border-radius:2px;font-weight:600">') }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <a href={`/api/v1/documentos/adjuntos/${r.id}/descargar/`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151', textDecoration: 'none' }}>
                        Ver
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Estado OCR ──────────────────────────────────────────────────

function TabEstadoOcr() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['estado-ocr'],
    queryFn: digitalizacionService.estadoOcr,
    refetchInterval: 10000,
  })

  const total = (data?.pendientes ?? 0) + (data?.procesados ?? 0)
  const pct   = total > 0 ? Math.round((data?.procesados ?? 0) / total * 100) : 0

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => refetch()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#6b7280' }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: 12 }}>Cargando estado...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Pendientes de OCR', val: data?.pendientes ?? 0, bg: '#fff7ed', text: '#c2410c', icon: Clock },
              { label: 'Procesados',         val: data?.procesados ?? 0, bg: '#f0fdf4', text: '#15803d', icon: CheckCircle2 },
              { label: 'Sin texto extraído', val: data?.sin_texto ?? 0,  bg: '#fef2f2', text: '#dc2626', icon: AlertCircle },
            ].map(({ label, val, bg, text, icon: Icon }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <Icon size={18} style={{ color: text, margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 22, fontWeight: 700, color: text, margin: '0 0 4px' }}>{val}</p>
                <p style={{ fontSize: 10, color: text, margin: 0, opacity: .8 }}>{label}</p>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div style={{ background: '#f8faff', borderRadius: 10, padding: 16, border: '0.5px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Progreso de procesamiento OCR</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#002f6c' }}>{pct}%</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#002f6c', height: '100%', width: `${pct}%`, borderRadius: 6, transition: 'width .3s' }} />
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                {data?.procesados ?? 0} de {total} documentos procesados
                {(data?.pendientes ?? 0) > 0 && ' · El OCR se procesa en segundo plano automáticamente'}
              </p>
            </div>
          )}

          {(data?.sin_texto ?? 0) > 0 && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: 14, display: 'flex', gap: 10 }}>
              <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: '0 0 3px' }}>
                  {data?.sin_texto} documento(s) sin texto extraído
                </p>
                <p style={{ fontSize: 11, color: '#7f1d1d', margin: 0 }}>
                  Estos documentos fueron procesados pero el OCR no extrajo texto — posiblemente son imágenes de muy baja calidad o resolución. Considera re-escanearlos a mayor resolución.
                </p>
              </div>
            </div>
          )}

          {total === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#c4c9d4' }}>
              <ScanLine size={32} style={{ opacity: .3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No hay documentos digitalizados todavía</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Ve a la pestaña "Carga masiva" para comenzar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}