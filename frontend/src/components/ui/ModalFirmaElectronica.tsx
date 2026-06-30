import { useState, useRef, useEffect } from 'react'
import { firmarPDF, leerCertificadoP12 } from '@/services/firma.service'
import { documentosService } from '@/services/documentos.service'
import api from '@/services/api'
import {
  Signature, X, Upload, Eye, EyeOff, ExternalLink,
  ShieldCheck, AlertCircle, CheckCircle2, Loader2,
  FileSignature, PenLine
} from 'lucide-react'

interface Props {
  documentoId: number
  numeroDocumento: string
  onClose: () => void
  onFirmado: () => void
}

type Metodo  = 'seleccion' | 'firmaec' | 'p12' | 'fisica'
type PasoP12 = 'certificado' | 'confirmacion' | 'firmando' | 'exito' | 'error'

export default function ModalFirmaElectronica({ documentoId, numeroDocumento, onClose, onFirmado }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [metodo, setMetodo]   = useState<Metodo>('seleccion')

  // FirmaEC
  const [firmaecPolling, setFirmaecPolling] = useState(false)
  const [firmaecError, setFirmaecError] = useState('')

  // P12
  const [pasoP12, setPasoP12]       = useState<PasoP12>('certificado')
  const [p12Base64, setP12Base64]   = useState('')
  const [clave, setClave]           = useState('')
  const [showClave, setShowClave]   = useState(false)
  const [infoCert, setInfoCert]     = useState<any>(null)
  const [errorP12, setErrorP12]     = useState('')
  const [nombreArchivo, setNombreArchivo] = useState('')

  // Física
  const [fisicaObs, setFisicaObs]       = useState('')
  const [fisicaGuardando, setFisicaGuardando] = useState(false)
  const [fisicaOk, setFisicaOk]         = useState(false)

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  // ── FirmaEC ──────────────────────────────────────────────
  const abrirFirmaEC = async () => {
    setFirmaecError('')
    try {
      const { firmaec_url } = await documentosService.generarTokenFirmaEC(documentoId)
      window.location.href = firmaec_url  // abre la app FirmaEC instalada
      setFirmaecPolling(true)
    } catch {
      setFirmaecError('No se pudo generar el enlace de firma. Verifica la conexión.')
    }
  }

  // Polling: espera hasta que el doc cambie a estado 'firmado'
  useEffect(() => {
    if (!firmaecPolling) return
    let intentos = 0
    const maxIntentos = 60  // 3 minutos
    const interval = setInterval(async () => {
      intentos++
      if (intentos > maxIntentos) {
        clearInterval(interval)
        setFirmaecPolling(false)
        setFirmaecError('Tiempo de espera agotado. Si ya firmó, cierre este diálogo y recargue la bandeja.')
        return
      }
      try {
        const doc = await documentosService.obtener(documentoId)
        if (doc.estado === 'firmado') {
          clearInterval(interval)
          setFirmaecPolling(false)
          onFirmado()
          onClose()
        }
      } catch { /* silencio — continuar polling */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [firmaecPolling])

  // ── P12 ──────────────────────────────────────────────────
  const handleArchivoP12 = (file: File) => {
    if (!file.name.match(/\.(p12|pfx)$/i)) { setErrorP12('El archivo debe ser .p12 o .pfx'); return }
    setNombreArchivo(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const ab = e.target?.result as ArrayBuffer
      const bytes = new Uint8Array(ab)
      let binary = ''
      bytes.forEach(b => binary += String.fromCharCode(b))
      setP12Base64(btoa(binary))
    }
    reader.readAsArrayBuffer(file)
  }

  const verificarP12 = async () => {
    if (!p12Base64 || !clave) { setErrorP12('Selecciona el certificado e ingresa la clave'); return }
    setErrorP12('')
    try {
      const { info } = await leerCertificadoP12(p12Base64, clave)
      setInfoCert(info)
      setPasoP12('confirmacion')
    } catch {
      setErrorP12('Clave incorrecta o certificado inválido.')
    }
  }

  const ejecutarFirmaP12 = async () => {
    setPasoP12('firmando')
    setErrorP12('')
    try {
      const pdfResponse = await api.get(`/documentos/${documentoId}/pdf/`, { responseType: 'arraybuffer' })
      const { pdfFirmadoBase64, info } = await firmarPDF(pdfResponse.data as ArrayBuffer, p12Base64, clave)

      const byteArr = new Uint8Array(Array.from(atob(pdfFirmadoBase64)).map(c => c.charCodeAt(0)))
      const blob = new Blob([byteArr], { type: 'application/pdf' })
      const fd = new FormData()
      fd.append('archivo', blob, `${numeroDocumento}_firmado.pdf`)
      fd.append('tipo', 'documento')
      fd.append('documento', String(documentoId))
      fd.append('origen_digitalizacion', 'nativo_digital')
      await api.post('/documentos/adjuntos/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      await api.post(`/documentos/${documentoId}/registrar_firma/`, { firma_info: info })
      setPasoP12('exito')
      setTimeout(() => { onFirmado(); onClose() }, 2000)
    } catch (e: any) {
      setErrorP12(e?.response?.data?.detail ?? e?.message ?? 'Error al firmar')
      setPasoP12('error')
    }
  }

  // ── Física ───────────────────────────────────────────────
  const guardarFirmaFisica = async () => {
    setFisicaGuardando(true)
    try {
      await documentosService.registrarFirmaFisica(documentoId, fisicaObs || 'Firma física manuscrita')
      setFisicaOk(true)
      setTimeout(() => { onFirmado(); onClose() }, 1500)
    } catch {
      setFisicaGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
              <Signature size={15} style={{ color: '#0f6e56' }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Firmar documento</h3>
              <p className="text-xs text-gray-400">{numeroDocumento}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── Selección de método ── */}
          {metodo === 'seleccion' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-4">
                Selecciona cómo deseas firmar el documento:
              </p>

              {/* FirmaEC — recomendado */}
              <button onClick={() => { setMetodo('firmaec'); abrirFirmaEC() }}
                className="w-full text-left p-4 rounded-xl border-2 border-[#002f6c] hover:bg-blue-50 transition-colors"
                style={{ background: '#f0f4fc' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#002f6c' }}>
                    <ExternalLink size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#002f6c' }}>FirmaEC <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-1">Recomendado</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Abre la app FirmaEC instalada en tu PC. Firma válida legalmente (Art. 14 Ley de Comercio Electrónico).</p>
                  </div>
                </div>
              </button>

              {/* P12 */}
              <button onClick={() => setMetodo('p12')}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                    <FileSignature size={18} style={{ color: '#0f6e56' }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-700">Certificado P12 / PFX</p>
                    <p className="text-xs text-gray-500 mt-0.5">Sube tu archivo .p12 y firma directamente en el navegador (BCE, Security Data, UANATACA).</p>
                  </div>
                </div>
              </button>

              {/* Física */}
              <button onClick={() => setMetodo('fisica')}
                className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fffbeb' }}>
                    <PenLine size={18} style={{ color: '#92400e' }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-700">Firma física (papel)</p>
                    <p className="text-xs text-gray-500 mt-0.5">El documento será impreso y firmado manuscritamente. Se registra en el sistema como firmado físicamente.</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ── FirmaEC esperando ── */}
          {metodo === 'firmaec' && (
            <div className="space-y-4">
              {firmaecPolling && !firmaecError && (
                <div className="py-6 text-center space-y-4">
                  <Loader2 size={36} className="animate-spin mx-auto" style={{ color: '#002f6c' }} />
                  <p className="text-sm font-bold text-gray-800">FirmaEC abierto</p>
                  <p className="text-xs text-gray-500">Firma el documento en la aplicación FirmaEC. El sistema detectará automáticamente cuando finalices.</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Esperando firma…
                  </div>
                  <button onClick={() => { setFirmaecPolling(false); setMetodo('seleccion') }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline mt-2">
                    Cancelar y volver
                  </button>
                </div>
              )}

              {firmaecError && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-3">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {firmaecError}
                  </div>
                  <button onClick={() => { setMetodo('seleccion'); setFirmaecError('') }}
                    className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                    Volver a opciones
                  </button>
                </div>
              )}

              {!firmaecPolling && !firmaecError && (
                <div className="py-4 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: '#002f6c' }} />
                  <p className="text-xs text-gray-500">Generando enlace FirmaEC…</p>
                </div>
              )}
            </div>
          )}

          {/* ── P12 — Paso certificado ── */}
          {metodo === 'p12' && pasoP12 === 'certificado' && (
            <div className="space-y-4">
              <button onClick={() => setMetodo('seleccion')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                ← Volver
              </button>
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleArchivoP12(f) }}
                style={{ border: `1.5px dashed ${p12Base64 ? '#0f6e56' : '#d1d5db'}`, borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: p12Base64 ? '#f0fdf4' : '#fafbfc' }}>
                {p12Base64 ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} style={{ color: '#0f6e56' }} />
                    <span className="text-sm font-semibold" style={{ color: '#0f6e56' }}>{nombreArchivo}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={20} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 font-medium">Arrastra o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-400 mt-1">Archivos .p12 o .pfx</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".p12,.pfx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleArchivoP12(f) }} />
              </div>
              <div className="relative">
                <input type={showClave ? 'text' : 'password'} className={cls}
                  placeholder="Clave del certificado" value={clave} onChange={e => setClave(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verificarP12()} />
                <button type="button" onClick={() => setShowClave(!showClave)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showClave ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errorP12 && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2"><AlertCircle size={14} /> {errorP12}</div>}
              <button onClick={verificarP12} disabled={!p12Base64 || !clave}
                className="w-full py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2"
                style={{ background: !p12Base64 || !clave ? '#94a3b8' : '#002f6c' }}>
                <ShieldCheck size={15} /> Verificar certificado
              </button>
            </div>
          )}

          {/* P12 — Confirmación */}
          {metodo === 'p12' && pasoP12 === 'confirmacion' && infoCert && (
            <div className="space-y-4">
              <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 12, padding: 14 }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: '#0f6e56' }} />
                  <span className="text-sm font-bold" style={{ color: '#0f6e56' }}>Certificado válido — {infoCert.entidad_cert}</span>
                </div>
                {[['Titular', infoCert.firmado_por], ['Cédula', infoCert.cedula || '—'], ['Válido hasta', new Date(infoCert.valido_hasta).toLocaleDateString('es-EC')]].map(([l, v]) => (
                  <div key={l} className="flex gap-2 text-xs mb-1">
                    <span className="text-gray-400 w-24 shrink-0">{l}:</span>
                    <span className="font-medium text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPasoP12('certificado')} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Atrás</button>
                <button onClick={ejecutarFirmaP12} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2" style={{ background: '#0f6e56' }}>
                  <Signature size={14} /> Firmar
                </button>
              </div>
            </div>
          )}

          {/* P12 — Firmando */}
          {metodo === 'p12' && pasoP12 === 'firmando' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 size={32} className="animate-spin mx-auto" style={{ color: '#002f6c' }} />
              <p className="text-sm font-medium text-gray-600">Firmando documento...</p>
            </div>
          )}

          {/* P12 — Éxito */}
          {metodo === 'p12' && pasoP12 === 'exito' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto" style={{ color: '#0f6e56' }} />
              <p className="text-sm font-bold text-gray-800">Documento firmado con éxito</p>
              {infoCert && <p className="text-xs text-gray-500">{infoCert.firmado_por} · {infoCert.entidad_cert}</p>}
            </div>
          )}

          {/* P12 — Error */}
          {metodo === 'p12' && pasoP12 === 'error' && (
            <div className="space-y-4">
              <div className="py-6 text-center">
                <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#dc2626' }} />
                <p className="text-sm font-bold text-gray-800">Error al firmar</p>
                <p className="text-xs text-red-600 mt-2">{errorP12}</p>
              </div>
              <button onClick={() => { setPasoP12('certificado'); setErrorP12('') }}
                className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Intentar nuevamente
              </button>
            </div>
          )}

          {/* ── Firma Física ── */}
          {metodo === 'fisica' && !fisicaOk && (
            <div className="space-y-4">
              <button onClick={() => setMetodo('seleccion')} className="text-xs text-gray-400 hover:text-gray-600">← Volver</button>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fbbf24' }}>
                <PenLine size={16} style={{ color: '#92400e', flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs text-amber-800">El documento quedará marcado como <strong>firmado físicamente</strong>. Asegúrate de imprimir el documento y firmarlo antes de continuar.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Observación (opcional)</label>
                <textarea className={cls} rows={2} placeholder="ej. Firmado por el Prefecto en sesión del 30/06/2026"
                  value={fisicaObs} onChange={e => setFisicaObs(e.target.value)} />
              </div>
              <button onClick={guardarFirmaFisica} disabled={fisicaGuardando}
                className="w-full py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2"
                style={{ background: '#92400e' }}>
                {fisicaGuardando ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                Confirmar firma física
              </button>
            </div>
          )}

          {metodo === 'fisica' && fisicaOk && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto" style={{ color: '#0f6e56' }} />
              <p className="text-sm font-bold text-gray-800">Firma física registrada</p>
              <p className="text-xs text-gray-500">El documento fue marcado como firmado físicamente.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
