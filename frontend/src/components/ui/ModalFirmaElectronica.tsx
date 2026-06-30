import { useState, useRef } from 'react'
import { firmarPDF, leerCertificadoP12 } from '@/services/firma.service'
import api from '@/services/api'
import {
  Signature, X, Upload, Eye, EyeOff,
  ShieldCheck, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'

interface Props {
  documentoId: number
  numeroDocumento: string
  onClose: () => void
  onFirmado: () => void
}

type Paso = 'certificado' | 'confirmacion' | 'firmando' | 'exito' | 'error'

export default function ModalFirmaElectronica({ documentoId, numeroDocumento, onClose, onFirmado }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [paso, setPaso]           = useState<Paso>('certificado')
  const [p12Base64, setP12Base64] = useState('')
  const [clave, setClave]         = useState('')
  const [showClave, setShowClave] = useState(false)
  const [infoCert, setInfoCert]   = useState<any>(null)
  const [error, setError]         = useState('')
  const [nombreArchivo, setNombreArchivo] = useState('')

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  const handleArchivoP12 = (file: File) => {
    if (!file.name.match(/\.(p12|pfx)$/i)) {
      setError('El archivo debe ser un certificado .p12 o .pfx')
      return
    }
    setNombreArchivo(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      bytes.forEach(b => binary += String.fromCharCode(b))
      setP12Base64(btoa(binary))
    }
    reader.readAsArrayBuffer(file)
  }

  const verificarCertificado = async () => {
    if (!p12Base64 || !clave) { setError('Selecciona el certificado e ingresa la clave'); return }
    setError('')
    try {
      const { info } = await leerCertificadoP12(p12Base64, clave)
      setInfoCert(info)
      setPaso('confirmacion')
    } catch (e: any) {
      setError('Clave incorrecta o certificado inválido. Verifica e intenta nuevamente.')
    }
  }

  const ejecutarFirma = async () => {
    setPaso('firmando')
    setError('')
    try {
      // 1. Descargar el PDF del documento
      const pdfResponse = await api.get(`/documentos/${documentoId}/pdf/`, { responseType: 'arraybuffer' })
      const pdfBytes = pdfResponse.data as ArrayBuffer

      // 2. Firmar el PDF en el navegador
      const { pdfFirmadoBase64, info } = await firmarPDF(pdfBytes, p12Base64, clave)

      // 3. Subir el PDF firmado como adjunto
      const byteCharacters = atob(pdfFirmadoBase64)
      const byteNumbers    = Array.from(byteCharacters).map(c => c.charCodeAt(0))
      const byteArray      = new Uint8Array(byteNumbers)
      const blob           = new Blob([byteArray], { type: 'application/pdf' })
      const fd             = new FormData()
      fd.append('archivo', blob, `${numeroDocumento}_firmado.pdf`)
      fd.append('tipo', 'documento')
      fd.append('documento', String(documentoId))
      fd.append('origen_digitalizacion', 'nativo_digital')
      await api.post('/documentos/adjuntos/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      // 4. Registrar la firma en el documento
      await api.post(`/documentos/${documentoId}/registrar_firma/`, { firma_info: info })

      setPaso('exito')
      setInfoCert(info)
      setTimeout(() => { onFirmado(); onClose() }, 2500)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Error al firmar el documento')
      setPaso('error')
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
              <h3 className="font-bold text-gray-900 text-sm">Firma electrónica</h3>
              <p className="text-xs text-gray-400">FirmaEC - {numeroDocumento}</p>
            </div>
          </div>
          {paso !== 'firmando' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>

        <div className="px-6 py-5">

          {/* Paso 1: Certificado */}
          {paso === 'certificado' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Sube tu certificado de firma electronica (.p12 o .pfx) emitido por una entidad certificadora acreditada por ARCOTEL (BCE, Security Data, UANATACA, ANF).
              </p>

              {/* Drop zone P12 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleArchivoP12(f) }}
                style={{
                  border: `1.5px dashed ${p12Base64 ? '#0f6e56' : '#d1d5db'}`,
                  borderRadius: 10, padding: '16px', textAlign: 'center',
                  cursor: 'pointer', background: p12Base64 ? '#f0fdf4' : '#fafbfc',
                }}>
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

              {/* Clave */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Clave del certificado
                </label>
                <div className="relative">
                  <input
                    type={showClave ? 'text' : 'password'}
                    className={cls}
                    placeholder="Ingresa la clave de tu certificado"
                    value={clave}
                    onChange={e => setClave(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verificarCertificado()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowClave(!showClave)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showClave ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button onClick={verificarCertificado} disabled={!p12Base64 || !clave}
                className="w-full py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2"
                style={{ background: !p12Base64 || !clave ? '#94a3b8' : '#002f6c' }}>
                <ShieldCheck size={15} /> Verificar certificado
              </button>
            </div>
          )}

          {/* Paso 2: Confirmación */}
          {paso === 'confirmacion' && infoCert && (
            <div className="space-y-4">
              <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 12, padding: 14 }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: '#0f6e56' }} />
                  <span className="text-sm font-bold" style={{ color: '#0f6e56' }}>Certificado válido</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                    {infoCert.entidad_cert}
                  </span>
                </div>
                {[
                  { label: 'Titular',   value: infoCert.firmado_por },
                  { label: 'Cédula',    value: infoCert.cedula || '—' },
                  { label: 'Válido hasta', value: new Date(infoCert.valido_hasta).toLocaleDateString('es-EC') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2 text-xs mb-1">
                    <span className="text-gray-400 w-24 shrink-0">{label}:</span>
                    <span className="font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center">
                Al confirmar, se firmara el documento <strong>{numeroDocumento}</strong> con tu certificado electronico mediante FirmaEC. Esta accion no se puede deshacer.
              </p>
              <p className="text-xs text-gray-400 text-center italic">
                Validez legal: Art. 14 Ley de Comercio Electronico, Firmas Electronicas y Mensajes de Datos del Ecuador.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setPaso('certificado')}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                  Atrás
                </button>
                <button onClick={ejecutarFirma}
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2"
                  style={{ background: '#0f6e56' }}>
                  <Signature size={14} /> Firmar documento
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Firmando */}
          {paso === 'firmando' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 size={32} className="animate-spin mx-auto" style={{ color: '#002f6c' }} />
              <p className="text-sm font-medium text-gray-600">Firmando documento...</p>
              <p className="text-xs text-gray-400">Esto puede tardar unos segundos</p>
            </div>
          )}

          {/* Paso 4: Éxito */}
          {paso === 'exito' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 size={40} className="mx-auto" style={{ color: '#0f6e56' }} />
              <p className="text-sm font-bold text-gray-800">Documento firmado con FirmaEC</p>
              {infoCert && (
                <p className="text-xs text-gray-500">
                  Firmado por {infoCert.firmado_por} · {infoCert.entidad_cert}
                </p>
              )}
              <p className="text-xs text-gray-400 italic">
                Firma valida conforme al Art. 14 Ley de Comercio Electronico, Firmas Electronicas y Mensajes de Datos.
              </p>
            </div>
          )}

          {/* Error */}
          {paso === 'error' && (
            <div className="space-y-4">
              <div className="py-6 text-center">
                <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#dc2626' }} />
                <p className="text-sm font-bold text-gray-800">Error al firmar</p>
                <p className="text-xs text-red-600 mt-2">{error}</p>
              </div>
              <button onClick={() => { setPaso('certificado'); setError('') }}
                className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Intentar nuevamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}