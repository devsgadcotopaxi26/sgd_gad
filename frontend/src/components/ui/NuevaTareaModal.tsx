import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Search, X } from 'lucide-react'
import { usuariosService } from '@/services/usuarios.service'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  pending: boolean
  error?: string
  onConfirm: (data: { usuario_id: number; descripcion: string; prioridad: string; fecha_limite: string | null }) => void
  onCancel: () => void
  T: ThemeVars
}

/**
 * "Nueva tarea": asigna una instrucción sobre el documento a otro usuario.
 * NO transfiere responsabilidad documental (≠ Reasignar) ni pone en
 * conocimiento (≠ Informar).
 */
export default function NuevaTareaModal({ pending, error, onConfirm, onCancel, T }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [usuario, setUsuario] = useState<{ id: number; nombre: string } | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState('normal')
  const [fechaLimite, setFechaLimite] = useState('')

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-nueva-tarea', busqueda],
    queryFn: () => usuariosService.listar(busqueda ? { search: busqueda } : {}),
  })

  const puede = !!usuario && descripcion.trim().length > 0 && !pending

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={15} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Nueva tarea</span>
          <button onClick={onCancel} disabled={pending}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 18px 0' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Asignar a</label>
          {usuario ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, background: T.rowSel, color: T.accentDk, borderRadius: 10, padding: '3px 10px' }}>{usuario.nombre}</span>
              <button onClick={() => setUsuario(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, fontSize: 11 }}>cambiar</button>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input placeholder="Buscar usuario…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
            </div>
          )}
        </div>

        {!usuario && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 90 }}>
            {usuarios?.results?.map(u => (
              <div key={u.id} onClick={() => setUsuario({ id: u.id, nombre: u.nombre_completo })}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `0.5px solid ${T.rowBd}`, background: T.rowBg }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '4px 18px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Descripción / instrucción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
              placeholder="Ej. Preparar informe técnico y adjuntarlo al expediente."
              style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="muy_urgente">Muy urgente</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Fecha límite (opcional)</label>
              <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
            </div>
          </div>
          {error && (
            <p style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>{error}</p>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={pending}
            style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
            Cancelar
          </button>
          <button
            onClick={() => puede && onConfirm({ usuario_id: usuario!.id, descripcion: descripcion.trim(), prioridad, fecha_limite: fechaLimite || null })}
            disabled={!puede}
            style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: puede ? 'pointer' : 'not-allowed', background: puede ? T.accentDk : T.rowBd, color: '#fff' }}>
            {pending ? 'Creando…' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}
