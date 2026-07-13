import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  ScanLine, Upload, X, CheckCircle2, AlertCircle,
  FileText, Loader2, Search, FolderOpen, RefreshCw,
  Info, ShieldCheck, Clock
} from 'lucide-react'

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

interface ArchivoEstado {
  file: File
  estado: 'pendiente' | 'subiendo' | 'ok' | 'error'
  error?: string
  adjunto_id?: number
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle: React.CSSProperties = { background: T.rowBg, color: T.rowTxt, border: `0.5px solid ${T.rowBd}`, outline: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 4 }
  return { T, inputStyle, labelStyle }
}

export default function DigitalizacionMasivaPage() {
  const { T } = useTheme()
  const [tab, setTab] = useState<'carga' | 'busqueda' | 'estado'>('carga')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScanLine size={18} style={{ color: T.accentDk }} />
          Digitalización masiva de fondo documental histórico
        </h1>
        <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>
          Carga y procesamiento OCR de documentos físicos anteriores · Regla Técnica Nacional Art. 68-79
        </p>
      </div>

      <div style={{ display: 'flex', background: T.ctHdrBg, borderRadius: 12, border: `0.5px solid ${T.rowBd}`, marginBottom: 16, overflow: 'hidden' }}>
        {[
          { key: 'carga',    label: 'Carga masiva',          icon: Upload   },
          { key: 'busqueda', label: 'Búsqueda en contenido', icon: Search   },
          { key: 'estado',   label: 'Estado OCR',            icon: Clock    },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === key ? T.ctHdrBg : T.rowHv,
              color: tab === key ? T.accentDk : T.rowSub,
              borderBottom: `2px solid ${tab === key ? T.accentDk : 'transparent'}`,
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, padding: 24 }}>
        {tab === 'carga'    && <TabCargaMasiva />}
        {tab === 'busqueda' && <TabBusqueda />}
        {tab === 'estado'   && <TabEstadoOcr />}
      </div>
    </div>
  )
}

function TabCargaMasiva() {
  const { T, inputStyle, labelStyle } = useTheme()
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
      .filter(f => f.size <= 100 * 1024 * 1024)
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
      } catch {
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

  const exitosos  = archivos.filter(a => a.estado === 'ok').length
  const errores   = archivos.filter(a => a.estado === 'error').length
  const pendientes = archivos.filter(a => a.estado === 'pendiente').length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 10 }}>
          <Info size={14} style={{ color: '#15803d', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>
            Sube hasta 50 archivos por lote (PDF, TIFF, JPG). El sistema detecta automáticamente si el PDF tiene texto o requiere OCR.
          </p>
        </div>

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleDrop(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${T.rowBd}`, borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', background: T.rowBg, marginBottom: 16, transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accentDk }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.rowBd }}
        >
          <Upload size={28} style={{ color: T.rowSub, margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt, margin: '0 0 4px' }}>
            Arrastra los archivos aquí o haz clic para seleccionar
          </p>
          <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>
            PDF, TIFF, JPG · Máx. 100MB por archivo · Hasta 50 archivos por lote
          </p>
          <input ref={inputRef} type="file" multiple accept=".pdf,.tiff,.tif,.jpg,.jpeg,.png"
            style={{ display: 'none' }} onChange={e => handleDrop(e.target.files)} />
        </div>

        {archivos.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Total',      val: archivos.length, bg: T.rowHv, text: T.rowTxt },
              { label: 'Pendientes', val: pendientes,       bg: '#fff7ed', text: '#c2410c' },
              { label: 'Exitosos',   val: exitosos,         bg: '#f0fdf4', text: '#15803d' },
              { label: 'Errores',    val: errores,          bg: '#fef2f2', text: '#dc2626' },
            ].map(({ label, val, bg, text }) => (
              <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0 }}>{val}</p>
                <p style={{ fontSize: 10, color: text, margin: 0, opacity: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {archivos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
            {archivos.map((a, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                border: `0.5px solid ${a.estado === 'ok' ? '#86efac' : a.estado === 'error' ? '#fecaca' : T.rowBd}`,
                background: a.estado === 'ok' ? '#f0fdf4' : a.estado === 'error' ? '#fef2f2' : T.ctHdrBg,
              }}>
                <FileText size={13} style={{ color: T.rowSub, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: T.rowTxt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.file.name}
                </span>
                <span style={{ fontSize: 10, color: T.rowSub, flexShrink: 0 }}>
                  {(a.file.size / 1024 / 1024).toFixed(1)}MB
                </span>
                {a.estado === 'pendiente' && (
                  <button onClick={() => eliminarArchivo(idx)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}>
                    <X size={12} />
                  </button>
                )}
                {a.estado === 'subiendo' && <Loader2 size={13} style={{ color: T.accentDk, flexShrink: 0 }} className="animate-spin" />}
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

        {resultado && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: resultado.errores === 0 ? '#f0fdf4' : '#fff7ed', border: `0.5px solid ${resultado.errores === 0 ? '#86efac' : '#fed7aa'}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: resultado.errores === 0 ? '#15803d' : '#854f0b', margin: '0 0 4px' }}>
              {resultado.errores === 0 ? '✓ Lote procesado correctamente' : `⚠ Lote procesado con ${resultado.errores} error(es)`}
            </p>
            <p style={{ fontSize: 11, color: T.rowTxt, margin: 0 }}>
              {resultado.exitosos} de {resultado.total} archivos subidos exitosamente. El OCR se procesa en segundo plano.
            </p>
          </div>
        )}

        {archivos.some(a => a.estado === 'pendiente') && (
          <button onClick={subirLote} disabled={subiendo}
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: subiendo ? '#94a3b8' : T.accentDk, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
            {subiendo ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {subiendo ? 'Subiendo archivos...' : `Subir ${archivos.filter(a => a.estado === 'pendiente').length} archivo(s)`}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accentDk, marginBottom: 12 }}>Parámetros de digitalización</p>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Origen de digitalización</label>
            <select style={inputStyle} value={origen} onChange={e => setOrigen(e.target.value)}>
              <option value="institucional">Institucional (escáner propio · 300ppp)</option>
              <option value="quipux">Recibido vía Quipux (90ppp)</option>
              <option value="nativo_digital">Nativo digital</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Resolución (ppp)</label>
            <input type="number" style={inputStyle} value={resolucion} onChange={e => setResolucion(e.target.value)} />
            {origen === 'institucional' && Number(resolucion) < 300 && (
              <p style={{ fontSize: 10, color: '#c2410c', marginTop: 3 }}>⚠ La norma exige mínimo 300ppp para digitalización institucional</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Año del documento original</label>
            <input type="number" style={inputStyle} value={anio} min="2000" max="2030"
              onChange={e => setAnio(e.target.value)} />
          </div>
        </div>

        <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accentDk, marginBottom: 10 }}>Vincular a expediente (opcional)</p>
          <input style={{ ...inputStyle, marginBottom: 6 }} placeholder="Buscar expediente..." value={busqExp}
            onChange={e => { setBusqExp(e.target.value); setExpedienteId(null) }} />
          {expedientes && expedientes.length > 0 && !expedienteId && (
            <div style={{ border: `0.5px solid ${T.rowBd}`, borderRadius: 8, overflow: 'hidden' }}>
              {(expedientes as any[]).slice(0, 5).map((exp: any) => (
                <div key={exp.id}
                  onClick={() => { setExpedienteId(exp.id); setBusqExp(`${exp.codigo_expediente} — ${exp.titulo}`) }}
                  style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 11, borderBottom: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg, color: T.rowTxt }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.rowSel)}
                  onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: T.accentDk, fontWeight: 700 }}>{exp.codigo_expediente}</span>
                  <span style={{ marginLeft: 6, color: T.rowTxt }}>{exp.titulo}</span>
                </div>
              ))}
            </div>
          )}
          {expedienteId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#f0fdf4', borderRadius: 8, marginTop: 4 }}>
              <FolderOpen size={12} style={{ color: '#15803d' }} />
              <span style={{ fontSize: 11, color: '#15803d', flex: 1 }}>Expediente vinculado</span>
              <button onClick={() => { setExpedienteId(null); setBusqExp('') }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
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

function TabBusqueda() {
  const { T } = useTheme()
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
      <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 10 }}>
        <Info size={14} style={{ color: T.accentDk, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: T.rowTxt, margin: 0 }}>
          Busca palabras o frases dentro del <strong>contenido</strong> de todos los documentos digitalizados — usa el índice full-text de PostgreSQL con stemming en español.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 32px', fontSize: 13, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }}
            placeholder="Ej: contrato obras viales 2019, resolución presupuesto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
          />
        </div>
        <button onClick={buscar} disabled={buscando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: buscando ? '#94a3b8' : T.accentDk, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: buscando ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
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
          <p style={{ fontSize: 12, color: T.rowSub, marginBottom: 12 }}>
            {resultados.total} resultado(s) para <strong style={{ color: T.accentDk }}>"{resultados.query}"</strong>
          </p>
          {resultados.total === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.rowSub }}>
              <Search size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No se encontraron documentos con ese contenido</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resultados.resultados.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                  onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <FileText size={14} style={{ color: T.accentDk, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.nombre}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        {r.paginas && <span style={{ fontSize: 10, color: T.rowSub }}>{r.paginas} págs.</span>}
                        {r.ocr_confianza && (
                          <span style={{ fontSize: 10, color: r.ocr_confianza > 80 ? '#15803d' : '#c2410c', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ShieldCheck size={9} /> OCR {Math.round(r.ocr_confianza)}%
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: T.rowSub }}>Relevancia: {(r.relevancia * 100).toFixed(0)}%</span>
                      </div>
                      {r.fragmento && (
                        <p style={{ fontSize: 11, color: T.rowSub, margin: 0, lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: r.fragmento.replace(/<mark>/g, '<mark style="background:#fef08a;padding:1px 2px;border-radius:2px;font-weight:600">') }} />
                      )}
                    </div>
                    <a href={`/api/v1/documentos/adjuntos/${r.id}/descargar/`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt, textDecoration: 'none', flexShrink: 0 }}>
                      Ver
                    </a>
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

function TabEstadoOcr() {
  const { T } = useTheme()
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
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.rowSub }}>
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
                <p style={{ fontSize: 10, color: text, margin: 0, opacity: 0.8 }}>{label}</p>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div style={{ background: T.rowHv, borderRadius: 10, padding: 16, border: `0.5px solid ${T.rowBd}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt }}>Progreso de procesamiento OCR</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.accentDk }}>{pct}%</span>
              </div>
              <div style={{ background: T.rowBd, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: T.accentDk, height: '100%', width: `${pct}%`, borderRadius: 6, transition: 'width .3s' }} />
              </div>
              <p style={{ fontSize: 10, color: T.rowSub, marginTop: 6 }}>
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
                  Estos documentos fueron procesados pero el OCR no extrajo texto — posiblemente son imágenes de muy baja calidad. Considera re-escanearlos a mayor resolución.
                </p>
              </div>
            </div>
          )}

          {total === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: T.rowSub }}>
              <ScanLine size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No hay documentos digitalizados todavía</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Ve a la pestaña "Carga masiva" para comenzar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
