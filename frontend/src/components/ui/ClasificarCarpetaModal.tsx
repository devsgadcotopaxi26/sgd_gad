import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderTree, X, Plus } from 'lucide-react'
import { carpetaService } from '@/services/carpeta.service'
import { CarpetaTree, construirArbol, rutaDe } from './carpetaTree'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  count: number
  /** clasificación actual (para 1 documento): muestra "será reclasificado". */
  actual?: { carpeta_id: number; ruta: string } | null
  pending: boolean
  error?: string
  onConfirm: (carpetaId: number) => void
  onCancel: () => void
  T: ThemeVars
}

/**
 * "Clasificar en carpeta" — UN solo modal para toda la selección. El documento
 * NO cambia de bandeja ni de estado: la carpeta es una clasificación operativa
 * de la unidad. Si ya estaba en otra carpeta de la misma unidad, se
 * RECLASIFICA (no se duplica).
 */
export default function ClasificarCarpetaModal({ count, actual, pending, error, onConfirm, onCancel, T }: Props) {
  const [sel, setSel] = useState<number | null>(actual?.carpeta_id ?? null)
  const [creando, setCreando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creaError, setCreaError] = useState('')

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['carpetas-arbol'],
    queryFn: () => carpetaService.arbol(),
  })
  const planas = data?.carpetas ?? []
  const arbol = useMemo(() => construirArbol(planas), [planas])
  // R2 — "Nueva carpeta" solo para quien administra el árbol (ADMIN_GENERAL).
  const puedeAdministrar = !!data?.puede_administrar

  const crearCarpeta = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    setCreaError('')
    try {
      const c = await carpetaService.crear(nombre, sel ?? null)
      setNuevoNombre(''); setCreando(false)
      await refetch()
      setSel(c.id)
    } catch (e: any) {
      setCreaError(e.response?.data?.detail ?? 'No se pudo crear la carpeta.')
    }
  }

  const reclasifica = actual && sel != null && actual.carpeta_id !== sel
  const rutaSel = rutaDe(sel, planas)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderTree size={15} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>
            {count === 1 ? 'Clasificar documento en carpeta' : `Clasificar ${count} documentos en carpeta`}
          </span>
          <button onClick={onCancel} disabled={pending}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.04em' }}>Carpeta</span>
          {puedeAdministrar && (
            <button onClick={() => { setCreando(c => !c); setCreaError('') }}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: T.accentDk, background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={11} /> Nueva carpeta
            </button>
          )}
        </div>

        {puedeAdministrar && creando && (
          <div style={{ padding: '0 18px 8px', display: 'flex', gap: 6 }}>
            <input autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') crearCarpeta() }}
              placeholder={sel != null ? `Subcarpeta de "${rutaSel}"` : 'Nombre de la carpeta raíz'}
              style={{ flex: 1, padding: '6px 9px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
            <button onClick={crearCarpeta}
              style={{ padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: T.accentDk, color: '#fff' }}>Crear</button>
          </div>
        )}
        {creaError && <p style={{ fontSize: 10.5, color: '#b91c1c', padding: '0 18px 6px', margin: 0 }}>{creaError}</p>}

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px', minHeight: 140 }}>
          {isLoading ? (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 20 }}>Cargando…</p>
          ) : arbol.length === 0 ? (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 20 }}>
              {puedeAdministrar
                ? 'Su unidad todavía no tiene carpetas. Cree una con “Nueva carpeta”.'
                : 'Su unidad todavía no tiene carpetas virtuales. Solicite a un administrador que cree el árbol.'}
            </p>
          ) : (
            <CarpetaTree nodos={arbol} seleccionada={sel} onSeleccionar={setSel} T={T} mostrarConteo />
          )}
        </div>

        <div style={{ padding: '10px 18px 0' }}>
          {sel != null && (
            <p style={{ fontSize: 11, color: T.rowTxt, margin: 0 }}>
              Destino: <strong>{rutaSel}</strong>
            </p>
          )}
          {reclasifica && (
            <p style={{ fontSize: 10.5, color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 10px', margin: '6px 0 0' }}>
              Este documento ya está en “{actual!.ruta}”. Será <strong>reclasificado</strong> a la carpeta seleccionada.
            </p>
          )}
          <p style={{ fontSize: 10.5, color: T.rowSub, margin: '6px 0 0' }}>
            Clasificar no cambia la bandeja, el estado ni el responsable del documento.
          </p>
          {error && <p style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={pending}
            style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
            Cancelar
          </button>
          <button onClick={() => sel != null && !pending && onConfirm(sel)} disabled={sel == null || pending}
            style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: sel != null && !pending ? 'pointer' : 'not-allowed',
              background: sel != null ? T.accentDk : T.rowBd, color: '#fff' }}>
            {pending ? 'Clasificando…' : (count === 1 ? 'Clasificar' : `Clasificar ${count}`)}
          </button>
        </div>
      </div>
    </div>
  )
}
