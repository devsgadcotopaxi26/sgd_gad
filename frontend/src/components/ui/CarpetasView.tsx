import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderTree, Plus, Pencil, Trash2, X, Check, Inbox, FolderInput, RefreshCw,
} from 'lucide-react'
import { carpetaService } from '@/services/carpeta.service'
import { useAuthStore } from '@/store/authStore'
import { construirArbol, rutaDe, type CarpetaTreeNode } from './carpetaTree'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  T: ThemeVars
  onAbrirDoc: (docId: number) => void
}

/**
 * Carpetas Virtuales — vista transversal (sidebar). Panel-árbol de carpetas de
 * LA UNIDAD del usuario + lista de documentos clasificados. NO es una bandeja:
 * la lista puede contener documentos que estén en Recibidos / Enviados /
 * Archivados / etc. La ACL documental se respeta (la carpeta no concede acceso).
 */
export default function CarpetasView({ T, onAbrirDoc }: Props) {
  const qc = useQueryClient()
  const usuario = useAuthStore(s => s.usuario)
  const [sel, setSel] = useState<number | null>(null)
  const [incluirSub, setIncluirSub] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [err, setErr] = useState('')

  const { data: arbolData, refetch: refetchArbol, isLoading } = useQuery({
    queryKey: ['carpetas-arbol'],
    queryFn: () => carpetaService.arbol(),
  })
  const planas = arbolData?.carpetas ?? []
  const arbol = useMemo(() => construirArbol(planas), [planas])
  // R2 — crear/renombrar/mover/desactivar solo ADMIN_GENERAL / superusuario.
  const puedeAdministrar = !!arbolData?.puede_administrar

  const { data: docs, isFetching: docsFetching, refetch: refetchDocs } = useQuery({
    queryKey: ['carpeta-docs', sel, incluirSub],
    queryFn: () => carpetaService.documentos(sel!, { incluir_subcarpetas: incluirSub }),
    enabled: sel != null,
  })

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['carpetas-arbol'] })
    qc.invalidateQueries({ queryKey: ['carpeta-docs'] })
  }

  const crear = useMutation({
    mutationFn: () => carpetaService.crear(nombre.trim(), sel ?? null),
    onSuccess: (c) => { setNombre(''); setCreando(false); setErr(''); refetchArbol(); setSel(c.id) },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'No se pudo crear la carpeta.'),
  })
  const renombrar = useMutation({
    mutationFn: () => carpetaService.renombrar(editId!, editNombre.trim()),
    onSuccess: () => { setEditId(null); setErr(''); refetchArbol() },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'No se pudo renombrar.'),
  })
  const desactivar = useMutation({
    mutationFn: (id: number) => carpetaService.desactivar(id),
    onSuccess: (_r, id) => { setErr(''); if (sel === id) setSel(null); refetchArbol() },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'No se pudo desactivar la carpeta.'),
  })
  const quitarDoc = useMutation({
    mutationFn: (docId: number) => carpetaService.quitarDocumento(sel!, docId),
    onSuccess: () => { invalidar(); refetchDocs() },
  })

  const rutaSel = rutaDe(sel, planas)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Panel izquierdo: árbol ── */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.ctHdrBd}`, display: 'flex', flexDirection: 'column', background: T.ctHdrBg }}>
        <div style={{ padding: '10px 12px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderTree size={14} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.rowTxt }}>
            Carpetas · {usuario?.unidad_siglas || usuario?.unidad_nombre || 'Mi unidad'}
          </span>
          {puedeAdministrar && (
            <button onClick={() => { setCreando(c => !c); setErr('') }} title="Nueva carpeta"
              style={{ marginLeft: 'auto', padding: 3, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.accentDk }}>
              <Plus size={15} />
            </button>
          )}
          <button onClick={() => refetchArbol()} title="Refrescar"
            style={{ marginLeft: puedeAdministrar ? 0 : 'auto', padding: 3, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {puedeAdministrar && creando && (
          <div style={{ padding: '8px 12px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 6 }}>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nombre.trim()) crear.mutate() }}
              placeholder={sel != null ? `Subcarpeta de "${rutaSel}"` : 'Carpeta raíz'}
              style={{ flex: 1, padding: '5px 8px', border: `0.5px solid ${T.rowBd}`, borderRadius: 7, fontSize: 11.5, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
            <button onClick={() => nombre.trim() && crear.mutate()} disabled={crear.isPending}
              style={{ padding: '5px 10px', border: 'none', borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', background: T.accentDk, color: '#fff' }}>OK</button>
          </div>
        )}

        {err && <p style={{ fontSize: 10.5, color: '#b91c1c', background: '#fef2f2', margin: 0, padding: '6px 12px' }}>{err}</p>}

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {isLoading ? (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 20 }}>Cargando…</p>
          ) : arbol.length === 0 ? (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 20 }}>
              {puedeAdministrar
                ? <>Sin carpetas. Cree la primera con <Plus size={11} style={{ verticalAlign: 'middle' }} />.</>
                : 'Su unidad todavía no tiene carpetas virtuales.'}
            </p>
          ) : (
            <Arbol nodos={arbol} nivel={0} sel={sel} setSel={setSel} T={T}
              puedeAdministrar={puedeAdministrar}
              editId={editId} editNombre={editNombre} setEditNombre={setEditNombre}
              onEditar={(n) => { setEditId(n.id); setEditNombre(n.nombre); setErr('') }}
              onGuardarEdit={() => editNombre.trim() && renombrar.mutate()}
              onCancelarEdit={() => setEditId(null)}
              onEliminar={(id) => {
                if (window.confirm('¿Desactivar esta carpeta y sus subcarpetas? No se eliminan documentos ni clasificaciones; la carpeta deja de aparecer en el árbol.')) desactivar.mutate(id)
              }}
            />
          )}
        </div>
      </div>

      {/* ── Panel derecho: documentos de la carpeta ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.ctBg }}>
        {sel == null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
            <FolderTree size={30} style={{ opacity: .3, marginBottom: 8 }} />
            <p style={{ fontSize: 12 }}>Seleccione una carpeta para ver sus documentos</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.ctHdrBd}`, display: 'flex', alignItems: 'center', gap: 10, background: T.ctHdrBg }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.accentDk }}>{rutaSel}</span>
              <span style={{ fontSize: 11, color: T.rowSub }}>{docs?.count ?? 0} documento(s)</span>
              <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.rowSub, cursor: 'pointer' }}>
                <input type="checkbox" checked={incluirSub} onChange={e => setIncluirSub(e.target.checked)}
                  style={{ accentColor: T.accentDk }} />
                Incluir subcarpetas
              </label>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {docsFetching && !docs ? (
                <p style={{ fontSize: 12, color: T.rowSub, textAlign: 'center', padding: 30 }}>Cargando…</p>
              ) : (docs?.results?.length ?? 0) === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: T.rowSub }}>
                  <Inbox size={26} style={{ opacity: .3, marginBottom: 8 }} />
                  <p style={{ fontSize: 12 }}>Esta carpeta no tiene documentos que pueda consultar</p>
                </div>
              ) : (
                docs!.results.map((d: any) => (
                  <div key={d.id} onClick={() => onAbrirDoc(d.id)}
                    style={{ display: 'grid', gridTemplateColumns: '58px 1fr 110px 130px 96px 30px', gap: 8, alignItems: 'center',
                      padding: '8px 14px', borderBottom: `0.5px solid ${T.rowBd}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.rowHv}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <span style={{ fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '2px 5px', borderRadius: 4, background: T.rowBg, color: T.rowSub }}>
                      {d.tipo_prefijo}
                    </span>
                    <span style={{ fontSize: 12, color: T.rowTxt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.asunto}</span>
                    <span style={{ fontSize: 11, color: T.rowTxt, fontFamily: 'monospace' }}>{d.numero_documento || '—'}</span>
                    <span style={{ fontSize: 11, color: T.rowSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.remitente_entidad || d.unidad_origen_siglas || d.creado_por_nombre}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.rowSub }}>{d.estado}</span>
                    <button onClick={e => { e.stopPropagation(); if (window.confirm('¿Quitar el documento de esta carpeta? No se elimina el documento.')) quitarDoc.mutate(d.id) }}
                      title="Quitar de la carpeta"
                      style={{ padding: 3, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                      <FolderInput size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Arbol({ nodos, nivel, sel, setSel, T, puedeAdministrar, editId, editNombre, setEditNombre, onEditar, onGuardarEdit, onCancelarEdit, onEliminar }: {
  nodos: CarpetaTreeNode[]; nivel: number; sel: number | null; setSel: (id: number | null) => void; T: ThemeVars
  puedeAdministrar: boolean
  editId: number | null; editNombre: string; setEditNombre: (s: string) => void
  onEditar: (n: CarpetaTreeNode) => void; onGuardarEdit: () => void; onCancelarEdit: () => void; onEliminar: (id: number) => void
}) {
  return (
    <>
      {nodos.map(n => {
        const activo = sel === n.id
        const editando = editId === n.id
        return (
          <div key={n.id}>
            <div className="carpeta-fila"
              onClick={() => !editando && setSel(activo ? null : n.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', marginLeft: nivel * 14, borderRadius: 7,
                cursor: 'pointer', background: activo ? T.rowSel : 'transparent',
                border: `0.5px solid ${activo ? T.accentDk : 'transparent'}` }}>
              {editando ? (
                <>
                  <input autoFocus value={editNombre} onChange={e => setEditNombre(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') onGuardarEdit(); if (e.key === 'Escape') onCancelarEdit() }}
                    style={{ flex: 1, padding: '3px 6px', border: `0.5px solid ${T.accentDk}`, borderRadius: 6, fontSize: 11.5, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
                  <button onClick={e => { e.stopPropagation(); onGuardarEdit() }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#15803d', padding: 2 }}><Check size={13} /></button>
                  <button onClick={e => { e.stopPropagation(); onCancelarEdit() }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><X size={13} /></button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: n.activa ? T.rowTxt : T.rowSub, fontStyle: n.activa ? 'normal' : 'italic', fontWeight: activo ? 700 : 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.nombre}</span>
                  {n.n_docs > 0 && <span style={{ fontSize: 10, color: T.rowSub, background: T.rowBg, borderRadius: 10, padding: '0 6px' }}>{n.n_docs}</span>}
                  {puedeAdministrar && <>
                    <button onClick={e => { e.stopPropagation(); onEditar(n) }} title="Renombrar"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><Pencil size={11} /></button>
                    <button onClick={e => { e.stopPropagation(); onEliminar(n.id) }} title="Desactivar carpeta (recursivo; no borra documentos)"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><Trash2 size={11} /></button>
                  </>}
                </>
              )}
            </div>
            {n.hijos.length > 0 && (
              <Arbol nodos={n.hijos} nivel={nivel + 1} sel={sel} setSel={setSel} T={T}
                puedeAdministrar={puedeAdministrar}
                editId={editId} editNombre={editNombre} setEditNombre={setEditNombre}
                onEditar={onEditar} onGuardarEdit={onGuardarEdit} onCancelarEdit={onCancelarEdit} onEliminar={onEliminar} />
            )}
          </div>
        )
      })}
    </>
  )
}
