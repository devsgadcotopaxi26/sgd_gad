import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Users, User, Check } from 'lucide-react';
import { usuariosService, Usuario } from '@/services/usuarios.service';
import { listasService, ListaDistribucion, ListaMiembro } from '@/services/documentos.service';
import type { PersonaDocumento } from '@/components/ui/EditorDocumento';

type Modo = 'remitente' | 'destinatarios';

interface SelectorPersonasModalProps {
  modo: Modo;
  // Selección vigente del documento (para preseleccionar). Remitente: 0-1
  // elementos; destinatarios: N elementos.
  seleccionActual: PersonaDocumento[];
  // Se llama SOLO al pulsar "Aceptar": aplica la selección al documento.
  onAceptar: (personas: PersonaDocumento[]) => void;
  // Cancelar / X / clic en el backdrop → cierra sin aplicar nada.
  onCancelar: () => void;
}

const usuarioAPersona = (u: Usuario, rol: PersonaDocumento['rol']): PersonaDocumento => ({
  id: u.id,
  nombre_completo: u.nombre_completo,
  cargo: u.cargo,
  titulo: u.titulo || '',
  unidad_nombre: u.unidad_nombre,
  unidad_siglas: u.unidad_siglas,
  unidad_id: u.unidad_id,
  rol,
  tipo: u.tipo,
});

const miembroAPersona = (m: ListaMiembro, rol: PersonaDocumento['rol']): PersonaDocumento => ({
  id: m.id,
  nombre_completo: m.nombre_completo,
  cargo: m.cargo,
  titulo: m.titulo,
  unidad_nombre: m.unidad_nombre,
  unidad_siglas: m.unidad_siglas,
  unidad_id: m.unidad_id,
  rol,
});

const subtitulo = (p: { cargo?: string | null; unidad_siglas?: string | null; unidad_nombre?: string | null }) => {
  const area = p.unidad_siglas || p.unidad_nombre;
  return [p.cargo || null, area || null].filter(Boolean).join(' · ') || '—';
};

/**
 * Selección de remitente (único) o destinatarios (múltiple) mediante un modal
 * amplio. Trabaja sobre una selección TEMPORAL: nada se aplica al documento
 * hasta pulsar "Aceptar". Cancelar / X / backdrop cierran sin cambios.
 * Reutiliza usuariosService y listasService (sin endpoints nuevos).
 */
export default function SelectorPersonasModal({
  modo, seleccionActual, onAceptar, onCancelar,
}: SelectorPersonasModalProps) {
  const rolDestino: PersonaDocumento['rol'] = modo === 'remitente' ? 'de' : 'para';
  const esUnico = modo === 'remitente';

  // --- Selección temporal (no toca el formulario principal) ---
  const [selUnico, setSelUnico] = useState<PersonaDocumento | null>(
    () => seleccionActual[0] ?? null
  );
  const [selMulti, setSelMulti] = useState<Map<number, PersonaDocumento>>(
    () => new Map(seleccionActual.map(p => [p.id, { ...p, rol: rolDestino }]))
  );

  // --- Búsqueda con debounce (el proyecto no tiene util propia) ---
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Backend: search_fields = nombres, apellidos, email, cedula, cargo.
  const { data: usuariosResp, isFetching } = useQuery({
    queryKey: ['selector-personas-usuarios', qDeb],
    queryFn: () => usuariosService.listar(
      qDeb ? { search: qDeb, page_size: '40' } : { page_size: '40' }
    ),
    staleTime: 30_000,
  });

  // Listas de distribución (solo en modo destinatarios). El endpoint devuelve
  // todas; se filtra por nombre en cliente, igual que hacía el editor.
  const { data: todasListas } = useQuery({
    queryKey: ['selector-personas-listas'],
    queryFn: () => listasService.buscar(''),
    enabled: !esUnico,
    staleTime: 5 * 60_000,
  });

  const usuarios = useMemo(
    () => (usuariosResp?.results ?? []).filter(u => u.activo),
    [usuariosResp]
  );
  const listas = useMemo(
    () => !esUnico
      ? (todasListas ?? []).filter(l =>
          !qDeb || l.nombre.toLowerCase().includes(qDeb.toLowerCase()))
      : [],
    [todasListas, qDeb, esUnico]
  );

  const estaSel = (id: number) => esUnico ? selUnico?.id === id : selMulti.has(id);

  const toggleUsuario = (u: Usuario) => {
    if (esUnico) {
      setSelUnico(prev => prev?.id === u.id ? prev : usuarioAPersona(u, 'de'));
      return;
    }
    setSelMulti(prev => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, usuarioAPersona(u, 'para'));
      return next;
    });
  };

  const agregarLista = (lista: ListaDistribucion) => {
    setSelMulti(prev => {
      const next = new Map(prev);
      lista.miembros.forEach(m => {
        if (!next.has(m.id)) next.set(m.id, miembroAPersona(m, 'para'));
      });
      return next;
    });
  };

  const quitarSel = (id: number) => {
    if (esUnico) setSelUnico(null);
    else setSelMulti(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const seleccionados: PersonaDocumento[] = esUnico
    ? (selUnico ? [selUnico] : [])
    : [...selMulti.values()];
  const puedeAceptar = seleccionados.length > 0;

  const handleAceptar = () => {
    if (!puedeAceptar) return;
    onAceptar(seleccionados.map(p => ({ ...p, rol: rolDestino })));
  };

  const titulo = esUnico ? 'Seleccionar remitente' : 'Seleccionar destinatarios';
  const Icono = esUnico ? User : Users;

  return (
    <div
      onClick={onCancelar}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-[min(900px,92vw)] max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icono size={14} className="text-[#002f6c]" />
            </span>
            {titulo}
          </h3>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Cerrar sin aplicar">
            <X size={16} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Buscar funcionario{esUnico ? '' : ' o lista de distribución'}
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Nombre, apellido, cargo, cédula…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/10 bg-white"
            />
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          {/* Listas de distribución */}
          {!esUnico && listas.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-1.5">
                <Users size={11} /> Listas de distribución
              </p>
              <div className="rounded-xl border border-amber-100 divide-y divide-amber-50 overflow-hidden">
                {listas.map(lista => (
                  <div key={`lista-${lista.id}`} className="flex items-center gap-2 px-3 py-2 bg-amber-50/40">
                    <Users size={15} className="text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lista.nombre}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {lista.total_miembros} integrante{lista.total_miembros !== 1 ? 's' : ''}
                        {lista.preview_miembros.length > 0 && ` · ${lista.preview_miembros.join(', ')}${lista.total_miembros > 3 ? '…' : ''}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => agregarLista(lista)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
                      title="Agregar todos los integrantes a la selección"
                    >
                      + Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Funcionarios */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Funcionarios</p>
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-[#002f6c] rounded-full animate-spin" />
              Buscando…
            </div>
          ) : usuarios.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {qDeb ? 'Sin resultados para esta búsqueda' : 'Escriba para buscar funcionarios'}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden mb-2">
              {usuarios.map(u => {
                const sel = estaSel(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUsuario(u)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center border ${esUnico ? 'rounded-full' : 'rounded'} ${sel ? 'bg-[#002f6c] border-[#002f6c] text-white' : 'border-gray-300 bg-white'}`}>
                      {sel && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{u.nombre_completo}</span>
                      <span className="block text-[11px] text-gray-500 truncate">{subtitulo(u)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: resumen + acciones */}
        <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-500 mb-1">
                {esUnico ? 'Remitente seleccionado' : `Seleccionados: ${seleccionados.length}`}
              </p>
              {seleccionados.length === 0 ? (
                <p className="text-[11px] text-gray-400">Ninguno todavía</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[68px] overflow-y-auto">
                  {seleccionados.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-700 max-w-full">
                      <span className="truncate">{p.nombre_completo}{p.unidad_siglas ? ` · ${p.unidad_siglas}` : ''}</span>
                      <button type="button" onClick={() => quitarSel(p.id)} className="text-gray-400 hover:text-red-600 flex-shrink-0" title="Quitar">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={onCancelar}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAceptar}
                disabled={!puedeAceptar}
                title={puedeAceptar ? undefined : (esUnico ? 'Seleccione un remitente' : 'Seleccione al menos un destinatario')}
                className="px-5 py-2 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
