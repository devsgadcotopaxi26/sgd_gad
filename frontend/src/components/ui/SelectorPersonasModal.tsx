import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Users, User, Check, ArrowLeftRight, Building2 } from 'lucide-react';
import { usuariosService, Usuario } from '@/services/usuarios.service';
import { listasService, ListaDistribucion, ListaMiembro } from '@/services/documentos.service';
import { organizacionService } from '@/services/organizacion.service';
import type { PersonaDocumento } from '@/components/ui/EditorDocumento';

type Modo = 'remitente' | 'destinatarios';
type TipoFiltro = 'todos' | 'personas' | 'listas';
type Destino = 'para' | 'copia';

interface SelectorPersonasModalProps {
  modo: Modo;
  // Selección vigente del documento (para preseleccionar). Remitente: 0-1
  // elementos (rol 'de'); destinatarios: N elementos con rol 'para' | 'copia'.
  seleccionActual: PersonaDocumento[];
  // Se llama SOLO al pulsar "Aceptar": aplica la selección al documento.
  // Destinatarios → cada persona lleva su rol ('para' | 'copia') ya fijado.
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
 * Selección de remitente (único) o destinatarios (Para / Con copia) mediante un
 * modal de dos zonas: RESULTADOS (búsqueda/exploración bajo demanda) y
 * SELECCIONADOS (siempre visible, con scroll propio).
 *
 * - Nada se carga al abrir: los funcionarios aparecen solo al escribir o al
 *   elegir un área; las listas de distribución, solo al escribir.
 * - Todo es TEMPORAL: nada toca el documento hasta pulsar "Aceptar".
 *   Cancelar / X / backdrop cierran sin cambios.
 * - Reutiliza usuariosService, listasService y organizacionService (sin
 *   endpoints nuevos).
 */
export default function SelectorPersonasModal({
  modo, seleccionActual, onAceptar, onCancelar,
}: SelectorPersonasModalProps) {
  const esUnico = modo === 'remitente';

  // --- Selección temporal (no toca el formulario principal) ---
  const [selUnico, setSelUnico] = useState<PersonaDocumento | null>(
    () => seleccionActual.find(p => p.rol === 'de') ?? seleccionActual[0] ?? null
  );
  const [selPara, setSelPara] = useState<Map<number, PersonaDocumento>>(
    () => new Map(
      seleccionActual.filter(p => p.rol !== 'copia').map(p => [p.id, { ...p, rol: 'para' as const }])
    )
  );
  const [selCopia, setSelCopia] = useState<Map<number, PersonaDocumento>>(
    () => new Map(
      seleccionActual.filter(p => p.rol === 'copia').map(p => [p.id, { ...p, rol: 'copia' as const }])
    )
  );

  // --- Búsqueda con debounce (el proyecto no tiene util propia) ---
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // --- Filtros ---
  const [areaId, setAreaId] = useState<number | ''>('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');

  // --- Aviso efímero (p. ej. "12 integrantes agregados a Para") ---
  const [aviso, setAviso] = useState('');
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>();
  const flashAviso = (msg: string) => {
    setAviso(msg);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(''), 4000);
  };
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  const hayCriterio = qDeb.length > 0 || areaId !== '';
  const verListas   = !esUnico && tipoFiltro !== 'personas';
  const verPersonas = tipoFiltro !== 'listas';
  const mostrarEmail = qDeb.includes('@');

  // --- Áreas / unidades para el desplegable (payload liviano) ---
  const { data: areas } = useQuery({
    queryKey: ['selector-areas'],
    queryFn: () => organizacionService.select(),
    staleTime: 5 * 60_000,
  });

  // --- Funcionarios: SOLO cuando hay búsqueda o área elegida ---
  // Backend UsuarioViewSet: search_fields = nombres, apellidos, email, cedula,
  // cargo · filtro exacto ?unidad=<id>.
  const { data: usuariosResp, isFetching } = useQuery({
    queryKey: ['selector-usuarios', qDeb, areaId],
    queryFn: () => usuariosService.listar({
      ...(qDeb ? { search: qDeb } : {}),
      ...(areaId !== '' ? { unidad: String(areaId) } : {}),
      page_size: '50',
    }),
    enabled: verPersonas && hayCriterio,
    staleTime: 30_000,
  });

  // --- Listas de distribución: SOLO cuando el usuario escribe algo ---
  const { data: listasResp, isFetching: listasFetching } = useQuery({
    queryKey: ['selector-listas', qDeb],
    queryFn: () => listasService.buscar(qDeb),
    enabled: verListas && qDeb.length > 0,
    staleTime: 60_000,
  });

  const usuarios = useMemo(
    () => (usuariosResp?.results ?? []).filter(u => u.activo),
    [usuariosResp]
  );
  const listas = listasResp ?? [];

  // --- Estado de una persona en la selección temporal ---
  const estadoDe = (id: number): Destino | 'de' | null => {
    if (esUnico) return selUnico?.id === id ? 'de' : null;
    if (selPara.has(id)) return 'para';
    if (selCopia.has(id)) return 'copia';
    return null;
  };

  // Una persona nunca queda en Para y Copia a la vez: al fijar un destino se
  // retira del otro grupo.
  const fijarPersona = (persona: PersonaDocumento, destino: Destino) => {
    if (destino === 'para') {
      setSelCopia(prev => { const n = new Map(prev); n.delete(persona.id); return n; });
      setSelPara(prev => new Map(prev).set(persona.id, { ...persona, rol: 'para' }));
    } else {
      setSelPara(prev => { const n = new Map(prev); n.delete(persona.id); return n; });
      setSelCopia(prev => new Map(prev).set(persona.id, { ...persona, rol: 'copia' }));
    }
  };

  const quitar = (id: number) => {
    if (esUnico) { setSelUnico(null); return; }
    setSelPara(prev => { const n = new Map(prev); n.delete(id); return n; });
    setSelCopia(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const moverA = (id: number, destino: Destino) => {
    const actual = selPara.get(id) ?? selCopia.get(id);
    if (actual) fijarPersona(actual, destino);
  };

  const onAccionUsuario = (u: Usuario, destino: Destino) => {
    if (esUnico) {
      setSelUnico(prev => prev?.id === u.id ? prev : usuarioAPersona(u, 'de'));
      return;
    }
    // Segundo clic en el mismo destino = quitar.
    if (estadoDe(u.id) === destino) { quitar(u.id); return; }
    fijarPersona(usuarioAPersona(u, destino), destino);
  };

  const agregarLista = (lista: ListaDistribucion, destino: Destino) => {
    const yaSel = new Set<number>([...selPara.keys(), ...selCopia.keys()]);
    const nuevos = lista.miembros.filter(m => !yaSel.has(m.id));
    if (nuevos.length === 0) {
      flashAviso(`Todos los integrantes de «${lista.nombre}» ya estaban seleccionados`);
      return;
    }
    const setter = destino === 'para' ? setSelPara : setSelCopia;
    setter(prev => {
      const n = new Map(prev);
      nuevos.forEach(m => n.set(m.id, miembroAPersona(m, destino)));
      return n;
    });
    flashAviso(
      `${nuevos.length} integrante${nuevos.length !== 1 ? 's' : ''} `
      + `agregado${nuevos.length !== 1 ? 's' : ''} a ${destino === 'para' ? 'Para' : 'Copia'}`
    );
  };

  const seleccionadosPara  = [...selPara.values()];
  const seleccionadosCopia = [...selCopia.values()];
  const puedeAceptar = esUnico ? !!selUnico : selPara.size > 0;

  const handleAceptar = () => {
    if (!puedeAceptar) return;
    onAceptar(
      esUnico
        ? (selUnico ? [{ ...selUnico, rol: 'de' as const }] : [])
        : [...seleccionadosPara, ...seleccionadosCopia]
    );
  };

  const titulo = esUnico ? 'Seleccionar remitente' : 'Seleccionar destinatarios';
  const Icono = esUnico ? User : Users;

  // --- Estilos compartidos ---
  const pill = (activo: boolean, color: 'blue' | 'amber') =>
    `px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors flex-shrink-0 border ${
      activo
        ? (color === 'blue'
            ? 'bg-[#002f6c] border-[#002f6c] text-white'
            : 'bg-amber-500 border-amber-500 text-white')
        : (color === 'blue'
            ? 'bg-white border-blue-200 text-[#002f6c] hover:bg-blue-50'
            : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50')
    }`;

  return (
    <div
      onClick={onCancelar}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-[min(1040px,94vw)] max-h-[88vh]"
      >
        {/* ===== Header ===== */}
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

        {/* ===== Toolbar: búsqueda + filtros ===== */}
        <div className="px-5 pt-3.5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Nombre, cédula, correo o cargo…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/10 bg-white"
              />
            </div>
            <div className="relative sm:w-[220px]">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={areaId}
                onChange={e => setAreaId(e.target.value ? Number(e.target.value) : '')}
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-800 bg-white appearance-none"
              >
                <option value="">Todas las áreas</option>
                {(areas ?? []).map(a => (
                  <option key={a.id} value={a.id}>{a.siglas ? `[${a.siglas}] ` : ''}{a.nombre}</option>
                ))}
              </select>
            </div>
            {!esUnico && (
              <select
                value={tipoFiltro}
                onChange={e => setTipoFiltro(e.target.value as TipoFiltro)}
                className="sm:w-[150px] px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-800 bg-white appearance-none"
              >
                <option value="todos">Personas y listas</option>
                <option value="personas">Solo personas</option>
                <option value="listas">Solo listas</option>
              </select>
            )}
          </div>
          {aviso && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
              {aviso}
            </p>
          )}
        </div>

        {/* ===== Cuerpo: RESULTADOS | SELECCIONADOS =====
             En móvil se apila con los seleccionados arriba (flex-col-reverse);
             en desktop, dos columnas con scroll independiente. */}
        <div className="flex-1 min-h-0 flex flex-col-reverse md:flex-row">

          {/* ---- RESULTADOS ---- */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
            {!hayCriterio ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center gap-2 py-10">
                <Search size={26} className="text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">
                  Busca una persona{esUnico ? '' : ' o lista'} o elige un área para comenzar.
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs">
                  Puedes buscar por nombre, cédula, correo o cargo. El filtro de área
                  se puede combinar con la búsqueda.
                </p>
              </div>
            ) : (
              <>
                {/* Listas de distribución */}
                {verListas && qDeb.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-1.5">
                      <Users size={11} /> Listas de distribución
                    </p>
                    {listasFetching ? (
                      <p className="text-[11px] text-gray-400 px-1 py-2">Buscando listas…</p>
                    ) : listas.length === 0 ? (
                      <p className="text-[11px] text-gray-400 px-1 py-2">Sin listas para «{qDeb}»</p>
                    ) : (
                      <div className="rounded-xl border border-amber-100 divide-y divide-amber-50 overflow-hidden">
                        {listas.map(lista => (
                          <div key={`lista-${lista.id}`} className="flex items-center gap-2 px-3 py-2 bg-amber-50/40">
                            <Users size={15} className="text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{lista.nombre}</p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {lista.total_miembros} integrante{lista.total_miembros !== 1 ? 's' : ''}
                                {lista.preview_miembros.length > 0 && ` · ${lista.preview_miembros.join(', ')}${lista.total_miembros > lista.preview_miembros.length ? '…' : ''}`}
                              </p>
                            </div>
                            <button type="button" onClick={() => agregarLista(lista, 'para')} className={pill(false, 'blue')}>+ Para</button>
                            <button type="button" onClick={() => agregarLista(lista, 'copia')} className={pill(false, 'amber')}>+ Copia</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* "Solo listas" sin texto: nada que mostrar todavía */}
                {verListas && !verPersonas && qDeb.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-10">
                    Escribe el nombre de una lista de distribución para buscarla.
                  </p>
                )}

                {/* Funcionarios */}
                {verPersonas && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Funcionarios</p>
                    {isFetching ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                        <span className="w-4 h-4 border-2 border-gray-300 border-t-[#002f6c] rounded-full animate-spin" />
                        Buscando…
                      </div>
                    ) : usuarios.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-400">Sin resultados</div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        {usuarios.map(u => {
                          const est = estadoDe(u.id);
                          return (
                            <div
                              key={u.id}
                              className={`flex items-center gap-3 px-3 py-2.5 ${est ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                            >
                              {esUnico && (
                                <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center border rounded-full ${est ? 'bg-[#002f6c] border-[#002f6c] text-white' : 'border-gray-300 bg-white'}`}>
                                  {est && <Check size={11} strokeWidth={3} />}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{u.nombre_completo}</p>
                                <p className="text-[11px] text-gray-500 truncate">{subtitulo(u)}</p>
                                {mostrarEmail && u.email && (
                                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                )}
                              </div>
                              {esUnico ? (
                                <button
                                  type="button"
                                  onClick={() => onAccionUsuario(u, 'para')}
                                  className={pill(est === 'de', 'blue')}
                                >
                                  {est === 'de' ? '✓ Remitente' : 'Elegir'}
                                </button>
                              ) : (
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <button type="button" onClick={() => onAccionUsuario(u, 'para')} className={pill(est === 'para', 'blue')}>
                                    {est === 'para' ? '✓ Para' : '+ Para'}
                                  </button>
                                  <button type="button" onClick={() => onAccionUsuario(u, 'copia')} className={pill(est === 'copia', 'amber')}>
                                    {est === 'copia' ? '✓ Copia' : '+ Copia'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* ---- SELECCIONADOS ---- */}
          <div className="md:w-[330px] flex-shrink-0 border-b md:border-b-0 md:border-l border-gray-100 flex flex-col min-h-0 max-h-[38vh] md:max-h-none bg-gray-50/60">
            <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Seleccionados</span>
              <span className="text-[11px] font-semibold text-gray-500">
                {esUnico
                  ? (selUnico ? '1' : '0')
                  : `${selPara.size} Para · ${selCopia.size} Copia`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {esUnico ? (
                selUnico ? (
                  <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{selUnico.nombre_completo}</p>
                      <p className="text-[10px] text-gray-500 truncate">{subtitulo(selUnico)}</p>
                    </div>
                    <button onClick={() => quitar(selUnico.id)} className="text-gray-400 hover:text-red-600 flex-shrink-0" title="Quitar">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 text-center py-6">Ningún remitente elegido todavía</p>
                )
              ) : (
                <>
                  <GrupoSeleccion
                    titulo="Para" color="#002f6c" personas={seleccionadosPara}
                    onQuitar={quitar} onMover={id => moverA(id, 'copia')} accionLabel="A copia"
                  />
                  <GrupoSeleccion
                    titulo="Con copia" color="#b45309" personas={seleccionadosCopia}
                    onQuitar={quitar} onMover={id => moverA(id, 'para')} accionLabel="A para"
                  />
                  {selPara.size === 0 && selCopia.size === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-6">
                      Nada seleccionado. Usa <b>+ Para</b> o <b>+ Copia</b> en los resultados.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== Footer fijo ===== */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-gray-400 min-w-0 truncate">
            {esUnico
              ? 'Se reemplazará el remitente al confirmar.'
              : 'Al aceptar se reemplazan los destinatarios actuales del documento.'}
          </p>
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
              title={puedeAceptar ? undefined : (esUnico ? 'Seleccione un remitente' : 'Seleccione al menos un destinatario en "Para"')}
              className="px-5 py-2 text-sm font-bold text-white bg-[#002f6c] rounded-xl hover:bg-[#002f6c]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GrupoSeleccion({
  titulo, color, personas, onQuitar, onMover, accionLabel,
}: {
  titulo: string;
  color: string;
  personas: PersonaDocumento[];
  onQuitar: (id: number) => void;
  onMover: (id: number) => void;
  accionLabel: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
        {titulo} ({personas.length})
      </p>
      {personas.length === 0 ? (
        <p className="text-[10px] text-gray-400 pl-1">—</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {personas.map(p => (
            <div key={`${titulo}-${p.id}`} className="flex items-center gap-1.5 px-2.5 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-900 truncate" title={p.nombre_completo}>{p.nombre_completo}</p>
                <p className="text-[9px] text-gray-500 truncate">
                  {p.cargo || '—'}{p.unidad_siglas ? ` · ${p.unidad_siglas}` : ''}
                </p>
              </div>
              <button
                onClick={() => onMover(p.id)}
                title={accionLabel}
                className="p-1 rounded text-gray-400 hover:text-[#002f6c] hover:bg-blue-50 flex-shrink-0"
              >
                <ArrowLeftRight size={12} />
              </button>
              <button
                onClick={() => onQuitar(p.id)}
                title="Quitar"
                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
