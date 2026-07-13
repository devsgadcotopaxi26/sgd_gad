import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { Mail, X, Plus, Trash2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  documentoId: number
  numeroDocumento: string
  asuntoDocumento: string
  onClose: () => void
}

export default function ModalEnviarEmail({ documentoId, numeroDocumento, asuntoDocumento, onClose }: Props) {
  const [destinatarios, setDestinatarios] = useState<string[]>([''])
  const [asuntoEmail, setAsuntoEmail]     = useState(`${numeroDocumento} — ${asuntoDocumento}`)
  const [cuerpoEmail, setCuerpoEmail]     = useState('')
  const [adjuntarPdf, setAdjuntarPdf]     = useState(true)
  const [error, setError]                 = useState('')
  const [enviado, setEnviado]             = useState(false)

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  const enviar = useMutation({
    mutationFn: () => api.post(`/documentos/${documentoId}/enviar_email/`, {
      destinatarios: destinatarios.filter(d => d.trim()),
      asunto_email:  asuntoEmail,
      cuerpo_email:  cuerpoEmail,
      adjuntar_pdf:  adjuntarPdf,
    }).then(r => r.data),
    onSuccess: () => setEnviado(true),
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Error al enviar el correo'),
  })

  const agregarDestinatario = () => setDestinatarios(d => [...d, ''])
  const actualizarDestinatario = (i: number, v: string) =>
    setDestinatarios(d => d.map((x, idx) => idx === i ? v : x))
  const eliminarDestinatario = (i: number) =>
    setDestinatarios(d => d.filter((_, idx) => idx !== i))

  const destinatariosValidos = destinatarios.filter(d => d.trim() && d.includes('@'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <Mail size={15} style={{ color: '#002f6c' }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Enviar por correo electrónico</h3>
              <p className="text-xs text-gray-400">{numeroDocumento}</p>
            </div>
          </div>
          {!enviar.isPending && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>

        {enviado ? (
          <div className="px-6 py-12 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto" style={{ color: '#0f6e56' }} />
            <p className="text-sm font-bold text-gray-800">Correo enviado correctamente</p>
            <p className="text-xs text-gray-500">
              Enviado a: {destinatariosValidos.join(', ')}
            </p>
            <button onClick={onClose}
              className="mt-4 px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Destinatarios *
                </label>
                <div className="space-y-2">
                  {destinatarios.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="email"
                        className={cls}
                        placeholder="correo@institucion.gob.ec"
                        value={d}
                        onChange={e => actualizarDestinatario(i, e.target.value)}
                      />
                      {destinatarios.length > 1 && (
                        <button onClick={() => eliminarDestinatario(i)}
                          className="p-2 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={agregarDestinatario}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#002f6c] hover:underline">
                  <Plus size={12} /> Agregar destinatario
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Asunto</label>
                <input className={cls} value={asuntoEmail} onChange={e => setAsuntoEmail(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Mensaje (opcional)
                </label>
                <textarea className={cls + ' resize-none'} rows={4}
                  placeholder="Si no escribes nada se enviará un mensaje institucional estándar..."
                  value={cuerpoEmail} onChange={e => setCuerpoEmail(e.target.value)} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={adjuntarPdf} onChange={e => setAdjuntarPdf(e.target.checked)}
                  className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
                <span className="text-sm text-gray-600">Adjuntar PDF del documento con membrete institucional</span>
              </label>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                De: sgd@cotopaxi.gob.ec
              </span>
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={() => { setError(''); enviar.mutate() }}
                  disabled={destinatariosValidos.length === 0 || enviar.isPending}
                  className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
                  style={{ background: destinatariosValidos.length === 0 || enviar.isPending ? '#94a3b8' : '#002f6c' }}>
                  {enviar.isPending
                    ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Enviando...</>
                    : <><Send size={14} /> Enviar correo</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}