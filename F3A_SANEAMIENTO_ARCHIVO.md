# F3-A / F3-A.1 — Saneamiento y seguridad de la base archivística existente

> Parte de `AUDITORIA_ARCHIVISTICA_SGDA.md`. **No rediseña el modelo archivístico.**
> **F3-A:** corregir referencias normativas del informe, seguridad global de `/archivo`,
> ACL documental dentro de Expedientes, bug de `VincularExpedienteModal`, código muerto
> `correoId`, bypass de estados críticos vía PATCH genérico, primera suite de tests de
> `apps.archivo`.
> **F3-A.1 (microcierre):** cerrar la fuga residual del nodo restringido de `ExpedienteDocumento`
> — minimizarlo a `{id, acceso_restringido}` y tratar el trámite asociado fail-closed
> (§3.1). Solo backend.
>
> Fecha: 2026-09-07 · Rama: `refactor/pdf-quipux-fidelidad`.

---

## 0. Baseline (antes de tocar nada)

| Comprobación | Resultado |
|---|---|
| `apps.archivo` tests | **0** (`Ran 0 tests`) |
| `apps.documentos` tests | **217 OK** |
| `apps.usuarios` / `apps.organizacion` / `apps.tramites` tests | 0 (sin suite) |
| `tsc --noEmit` | 15 errores, **todos preexistentes** (AdjuntosPanel, ArchivoPage, BajaDocumentalPage, DocumentosPage×2, firma.service) |
| `vite build` | OK |
| Permiso modular en otras apps | Solo `documentos/views.py` (`_NumeracionBaseView`) aplica `tiene_permiso` para el módulo `ajustes`. El resto del SGDA (`archivo`, `tramites`, `auditoria`, `configuracion`, `organizacion`) usa **solo `IsAuthenticated`** en backend y confía en el gating del sidebar. |
| `PERMISOS_ROL['...']['archivo']` | Declarado para `GESTOR_DOCUMENTAL` (`ver/crear/editar/transferir`), `RESPONSABLE_ARCHIVO` y `ADMIN_GENERAL` (`+eliminar`). **Nunca consultado por `archivo/views.py`.** |
| `arc_expediente` DELETE | hard-delete real vía `ModelViewSet.destroy` sin gate |
| Trigger `aud_log` | solo en `arc_expediente` (verificado en `information_schema.triggers`) — sin cambios en F3-A |

Confirmación contra código real: las afirmaciones del informe seguían vigentes; no había cambios
desde su generación.

---

## 1. Referencias normativas del informe

Corregidas en `AUDITORIA_ARCHIVISTICA_SGDA.md` (§4 matriz + G-matrix + prosa) según la lista
verificada del **Acuerdo SGPR-2019-0107**:

| Concepto | Antes (borrador) | Ahora |
|---|---|---|
| Integración del expediente (N-009) | — | **Art. 31** |
| Ordenación documental / orden original (N-010) | — | **Art. 32** |
| Cierre del expediente (N-011, N-012, G-03) | Art. 40 | **Art. 33** |
| Expurgo (N-013) | Art. 40 | **Art. 34** |
| Foliación (N-014, G-07) | Art. 39-40 | **Art. 35** |
| Descripción archivística | — | **Art. 36** |
| Carátula (N-016, G-10) | Art. 41 | **Art. 37** |
| Etiqueta de caja (N-017, G-08, G-10) | Art. 42 | **Art. 38** |
| Inventario documental (N-018, G-15, G-19) | Art. 43-44 | **Art. 39** |
| Guía de archivos (N-019) | Art. 21 | **Art. 40** |
| CGCD / clasificación (N-001…N-006) | 28.2 / 28.4.b / 28.4.c/d | **Arts. 28-30** |
| Expediente archivístico (N-008) | Art. 11 | **Arts. 31-33** |
| TPCD (N-022) | Art. 46 | **Art. 46** (ya correcto) |

Las citas fuera de ese rango (ciclo vital Arts. 11-16, transferencias Arts. 47-50, valoración
Arts. 44-46, baja Art. 53, préstamo Art. 60, expediente electrónico Arts. 69-75, confidencialidad
Art. 66) **no formaban parte de la lista de verificación de F3-A**; se marcaron con **†** y la
instrucción es confirmarlas directamente contra el PDF. No se inventaron números. **El diagnóstico
técnico no cambió** por la corrección de numeración.

---

## 2. Seguridad global de `/archivo` (cierra G-01 / N-040)

### Permiso central reutilizado (NO se creó un segundo sistema)

Nueva clase `PermisoModulo` en **`backend/apps/usuarios/permisos.py`** — un `BasePermission` de
DRF que **adapta la acción del ViewSet al verbo del catálogo** y delega en la función central
`tiene_permiso()` (que ya incluye el bypass de superusuario). No duplica `PERMISOS_ROL` ni
reimplementa nada.

```
list/retrieve/@action-GET   → 'ver'
create                      → 'crear'
update/partial_update       → 'editar'
destroy                     → 'eliminar'
@action-POST no mapeada     → 'editar' (conservador)
override por vista          → view.acciones_permiso = {'transferir': 'transferir', ...}
```

### Aplicación

`backend/apps/archivo/views.py` — nuevo `_ArchivoViewSetBase(viewsets.ModelViewSet)`:

```python
permission_classes = [IsAuthenticated, PermisoModulo]
modulo_permiso     = 'archivo'
```

Heredan de él **los 8 ViewSets**: `Fondo`, `Seccion`, `Serie`, `Expediente`, `Transferencia`,
`BajaDocumental`, `PrestamoDocumental`, `CopiaCertificada`. `ExpedienteViewSet` añade
`acciones_permiso = {'agregar_documento':'editar', 'cerrar':'editar', 'expurgar':'editar',
'foliar':'editar', 'transferir':'transferir'}`.

### Matriz de acceso resultante (según `PERMISOS_ROL` actual — sin ampliar permisos)

| Rol | ver (list/retrieve/arbol/elegibles/estadisticas) | crear | editar (PATCH + cerrar/expurgar/foliar/agregar_documento) | eliminar (DELETE) | transferir |
|---|:---:|:---:|:---:|:---:|:---:|
| `USUARIO`, `ASISTENTE_ARCHIVO` | ❌ 403 | ❌ | ❌ | ❌ | ❌ |
| `GESTOR_DOCUMENTAL` | ✅ | ✅ | ✅ | ❌ 403 | ✅ |
| `RESPONSABLE_ARCHIVO` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ADMIN_GENERAL` | ✅ | ✅ | ✅ | ✅ | ✅ |
| superusuario | ✅ (bypass `tiene_permiso`) | ✅ | ✅ | ✅ | ✅ |
| anónimo | ❌ 401 | 401 | 401 | 401 | 401 |

Códigos: **401** no autenticado · **403** autenticado sin autorización · **404** solo donde se
oculta deliberadamente la existencia (documento sin ACL en `agregar_documento`).

### Frontend (secundario, no se rediseñó nada)

- El sidebar (`MainLayout.tsx`) **ya** gateaba los enlaces de Archivo por `puede('archivo', ...)`.
- Botón **"Vincular a expediente"** (`DocumentosPage.tsx`, `PanelDetalle`) y
  **"Archivar en expediente"** (`TramitesPage.tsx`): ahora ocultos si `!puede('archivo','editar')`
  — antes se mostraban a todo usuario de bandeja/trámite y habrían devuelto 403 al pulsar.

---

## 3. ACL documental dentro del Expediente (cierra G-02)

Se reutiliza **`apps.documentos.acl_documentos.documentos_visibles_para`** (F2-E). No se duplicó
la política.

- **`ExpedienteViewSet.retrieve`** (`archivo/views.py`): calcula, en 1 consulta, el conjunto de
  `documento_id` del expediente que el usuario puede consultar y lo inyecta en el contexto del
  serializer como `documentos_visibles_ids`.
- **`ExpedienteDocumentoSerializer.to_representation`** (`archivo/serializers.py`): un nodo se
  **enmascara** cuando apunta a un `Documento` fuera de la ACL de lectura del usuario **o** a un
  `Tramite` (ver §3.1). El nodo enmascarado es **exactamente**:

  ```json
  { "id": 12, "acceso_restringido": true }
  ```

  Se conserva el nodo en la estructura del expediente (`num_documentos` sigue contando el total)
  — se eligió **marcar `acceso_restringido`** en vez de ocultar la fila, porque el usuario con
  acceso al expediente legítimamente ve *cuántas* piezas lo componen, sin que eso revele *qué*
  son las que no le corresponden.
- **Bypass admin:** `documentos_visibles_para` ya concede lectura total a
  superuser / `ADMIN_GENERAL` / `RESPONSABLE_ARCHIVO` (F2-E) → estos ven toda la metadata
  **documental** (el trámite es fail-closed también para ellos, ver §3.1).
- **`agregar_documento`**: si se pasa un `documento_id` que el usuario no puede consultar →
  **404** `"Documento no encontrado o sin acceso."` (no se puede vincular a ciegas un documento
  que ni siquiera se puede ver).
- **Abrir el documento desde el expediente:** la UI de Archivo **no** navega hoy al detalle de un
  `Documento` individual (solo muestra el conteo). Si se añade esa navegación en el futuro, debe
  entrar por `GET /api/v1/documentos/{id}/` / `DocumentoPDFView`, que **ya** aplican la ACL F2-E
  (verificado: un `GESTOR_DOCUMENTAL` que abre un expediente con un documento ajeno recibe 404 al
  pedir ese documento directo — test `test_relacion_no_concede_acceso_ni_a_documento_ni_a_tramite`).

---

## 3.1 Microcierre F3-A.1 — nodo restringido mínimo + fail-closed en trámite

Detectada en el propio reporte de F3-A una **fuga residual**: el nodo enmascarado seguía
devolviendo `tramite`, `tramite_numero`, `agregado_por`, `agregado_por_nombre`, `agregado_en`,
`orden_foja`, `expediente` — es decir, la relación "restringida" seguía siendo una ruta indirecta
hacia el trámite asociado y hacia quién/cuándo se archivó la pieza.

### ACL encontrada para Tramite

**No existe.** `TramiteViewSet` (`apps/tramites/views.py`) usa `permission_classes =
[IsAuthenticated]` y `get_queryset` = `Tramite.objects.select_related(...)` **sin ningún filtro
por usuario** — cualquier autenticado lista/consulta todos los trámites. La única comprobación
por canal (`tramites_canales`) se aplica **solo a `create`** y el propio código la documenta como
implementación parcial de RF-TRAM-011 (*"aquí solo se cierra la puerta de creación por canal"*).
No hay ninguna función central tipo `tramites_visibles_para`.

### Decisión (F3-A.1 es microcierre, no F3-B)

- **NO se crea una ACL de Tramite** (regla explícita del microcierre; eso es F3-B con la
  condición de acceso de Serie/Expediente).
- Todo nodo `ExpedienteDocumento` que apunte a un `Tramite` se trata **FAIL-CLOSED**: se enmascara
  a `{id, acceso_restringido: true}` para **todos** los roles (incluidos `RESPONSABLE_ARCHIVO` y
  `ADMIN_GENERAL`), porque no hay forma de verificar que el usuario pueda consultar ese trámite.
- El nodo restringido (por documento sin ACL **o** por trámite) queda reducido a
  **`{id, acceso_restringido: true}`** — sin `documento`, `documento_numero`, `documento_asunto`,
  `tramite`, `tramite_numero`, `agregado_por`, `agregado_por_nombre`, `agregado_en`, `orden_foja`
  ni `expediente`. El `id` es el de la **relación** `ExpedienteDocumento`, no el del documento.
  Se omite `orden_foja` porque la **posición en el array** ya representa el orden
  (`Meta.ordering = ['orden_foja', 'agregado_en']`); no hace falta exponerlo para conservar la
  estructura.
- Los nodos **visibles** (documento dentro de la ACL, sin trámite) mantienen su representación
  completa — `agregado_por`/`agregado_en` son metadato legítimo de custodia (Art. 31) para una
  pieza que el usuario sí puede ver.

### `num_documentos` — conclusión (§4: SIN cambiar la política)

`ExpedienteListSerializer.get_num_documentos` = `obj.documentos.count()` → **total de piezas del
expediente**, incluidas las restringidas. Se **documenta** su semántica, no se cambia:

- Es un metadato archivístico legítimo del Expediente (inventario, **Art. 39**): un usuario
  autorizado a consultar el Expediente puede conocer *cuántas* piezas lo componen.
- La presencia de nodos con `acceso_restringido: true` **sí permite inferir que existe**
  documentación que el usuario no puede ver (no *qué*).
- La resolución definitiva (ocultar el nodo entero vs. mostrarlo marcado; filtrar el conteo)
  depende de la **condición de acceso de Serie/Expediente** → **F3-B**.
- F3-A.1 **no** añade ningún contador de restringidos ni un texto "X documentos ocultos", y **no**
  cambia `num_documentos`.

### Flujo de apertura del documento desde el expediente

Sin cambios respecto de F3-A: la UI de Archivo no navega a un `Documento` individual. La
comprobación `test_relacion_no_concede_acceso_ni_a_documento_ni_a_tramite` verifica que
`GET /api/v1/documentos/{id}/` sobre un documento ajeno (vinculado al expediente) devuelve **404**
— la pertenencia al expediente no concede acceso.

---

## 4. `VincularExpedienteModal` (cierra G-13)

**Problema:** el modal llamaba `POST /archivo/expedientes/{id}/agregar-documento/` (guion) pero la
`@action` DRF real es `agregar_documento` (guion bajo) → **404**. Además había dos métodos de
servicio para la misma operación (`agregarDocumento` correcto, `agregarDocumentoExpediente` roto)
y el modal usaba el roto. Y el alta (`ExpedienteCrearSerializer`) no devolvía `id`, por lo que el
modo "crear expediente nuevo" encadenaba `agregarDocumento(undefined, ...)`.

**Corrección (una sola fuente):**

- `frontend/src/services/archivo.service.ts`:
  - **eliminado** `agregarDocumentoExpediente` (ruta con guion + payload `correo_id`).
  - `agregarDocumento(id, { documento_id?, tramite_id?, orden_foja? })` → ruta DRF real
    `agregar_documento/`, tipado estricto. Es la única función.
- `frontend/src/components/ui/VincularExpedienteModal.tsx`: ambas mutaciones
  (`vincularMutation`, `crearYVincularMutation`) usan `archivoService.agregarDocumento(...)`.
- `backend/apps/archivo/serializers.py` — `ExpedienteCrearSerializer` ahora incluye
  `id` y `codigo_expediente` como `read_only_fields` → el alta devuelve el `id` para encadenar.
- Ruta verificada con `django.urls.resolve('/api/v1/archivo/expedientes/1/agregar_documento/')`
  → `ExpedienteViewSet` (test `test_ruta_agregar_documento_resuelve`).

**UX conservada:** el modal sigue permitiendo (A) elegir expediente abierto elegible,
(B) crear expediente nuevo, (C) vincular el documento/trámite real, (D) refrescar
(`invalidateQueries(['bandeja'])` + `['expedientes']`). No se rediseñó la UI de Expedientes.

---

## 5. `correoId` muerto (cierra G-14)

`frontend/src/components/ui/VincularExpedienteModal.tsx`: eliminados
- prop `correoId?: number` de la interfaz `Props` y del destructuring,
- `correo_id: correoId` de los payloads,
- `qc.invalidateQueries({ queryKey: ['correos'] })` (×2).

`archivo.service.ts`: sin `correo_id` en ningún tipo. Los dos únicos consumidores del modal
(`DocumentosPage.tsx`, `TramitesPage.tsx`) nunca pasaban `correoId` → sin errores de compilación.

*(Residual análogo fuera de alcance: `AdjuntosPanel.tsx` también mantiene un parámetro `correoId`
de la app `correos` eliminada — otro componente, con sus propios errores de tsc preexistentes; no
se tocó en F3-A.)*

---

## 6. Bypass de estados vía PATCH (cierra G-03 respecto al bypass)

**Problema:** `ExpedienteViewSet.get_serializer_class` solo distinguía `create` y `retrieve`; para
`update`/`partial_update` caía en `ExpedienteListSerializer`, que expone `estado`, `fecha_cierre`,
`fecha_expurgo`, `codigo_expediente`, `num_fojas` como campos escribibles → un `PATCH
{"estado":"cerrado"}` cerraba el expediente saltándose el gate `expurgado`+`foliado` de la acción
`cerrar()`, y `{"estado":"abierto"}` "reabría" uno cerrado.

**Corrección:** nuevo `ExpedienteActualizarSerializer` (`archivo/serializers.py`), usado solo para
`update`/`partial_update`, con **whitelist** de campos ordinarios:

```
titulo · descripcion · fecha_inicio · soporte · ubicacion_fisica · numero_caja · numero_parte
```

**Campos NO modificables por PUT/PATCH genérico** (solo por su acción dedicada o el alta):
`estado`, `fecha_cierre`, `expurgado`, `fecha_expurgo`, `foliado`, `fecha_foliacion`,
`categoria_actual`, `num_fojas`, `codigo_expediente`, `serie`, `unidad`, `creado_por`.

Las acciones `cerrar` / `expurgar` / `foliar` / `transferir` **siguen igual** (no se rediseñaron,
§28 de la instrucción) — F3-A solo impide que el update genérico las evada.

`agregar_documento` además ahora **exige expediente abierto** (§11 de la instrucción): si
`estado != 'abierto'` → **409** `"El expediente está {estado}; no admite nuevos documentos."`.
Antes solo lo impedía la lista `elegibles` de la UI.

---

## 7. Tests — `backend/apps/archivo/tests.py` (G-20 → cobertura base)

**23 tests, 100 % verdes.** Cubren exclusivamente F3-A.

| Clase | Tests | Qué valida |
|---|---|---|
| `PermisosModuloTest` | 10 | anon→401 en las 8 rutas; sin permiso→403 en list/detalle/POST/PATCH/DELETE/@action(`arbol`,`estadisticas`,`expurgar`); `GESTOR_DOCUMENTAL` ve/crea/edita pero **no** elimina (403); `RESPONSABLE_ARCHIVO` sí elimina (204); `ADMIN_GENERAL` y superusuario acceso total |
| `ACLDocumentalTest` | **7** (F3-A + **F3-A.1**) | documento sin ACL → nodo **exactamente** `{id, acceso_restringido}` (helper `_assert_nodo_restringido_minimo` prohíbe 11 campos); documento sin ACL **+ trámite sin ACL** → `tramite_id`/`numero_tramite` no aparecen ni en el JSON serializado; trámite **fail-closed** para GESTOR/RESPONSABLE/ADMIN; documento visible → representación normal (incl. `agregado_por`); RESPONSABLE_ARCHIVO y ADMIN_GENERAL ven toda la metadata documental (bypass F2-E); la relación no concede acceso ni a documento ni a trámite (`/documentos/{id}/` → 404); `num_documentos` = total (sin contador de ocultos) |
| `AgregarDocumentoTest` | **7** | abierto + ACL → 201; cerrado → 409; documento sin ACL → 404; sin permiso `archivo` → 403; la ruta `agregar_documento/` resuelve a `ExpedienteViewSet`; **flujo modal expediente existente** (elegibles → agregar); **flujo modal crear nuevo** (POST alta devuelve `id` + `codigo_expediente` → agregar) |
| `PatchBypassTest` | 5 | PATCH `estado='cerrado'`/`fecha_cierre` → ignorado (sigue `abierto`); PATCH `estado='abierto'` sobre cerrado → no reabre; PATCH `expurgado`/`foliado`/`categoria_actual`/`num_fojas` → ignorado; PATCH `titulo`/`descripcion`/`ubicacion_fisica` → sí funciona; la acción `cerrar` sigue exigiendo `expurgar`+`foliar` |

**Total: 29 tests.** NO cubierto (fuera de F3-A): ciclo vital, baja documental, transferencias,
foliación, cardinalidad Documento↔Expediente, archivo físico, TPCD, préstamos, copias
certificadas.

### Resultados (F3-A + F3-A.1)

```
apps.archivo                                     Ran 29  OK   (baseline: 0)
apps.documentos                                  Ran 217 OK   (sin regresión)
apps.archivo + documentos + tramites             Ran 246 OK
+ usuarios + organizacion                        Ran 246 OK   (esas apps: 0 tests)
tsc --noEmit                                     15 errores (idénticos al baseline — 0 nuevos)
vite build                                       OK
python manage.py check                           0 issues
```

*(F3-A.1 es 100 % backend: `serializers.py` + `tests.py`. No se tocó frontend.)*

---

## 8. Archivos modificados

**Backend** (F3-A)
- `backend/apps/usuarios/permisos.py` — nueva clase `PermisoModulo`.
- `backend/apps/archivo/views.py` — `_ArchivoViewSetBase` (permiso de módulo); `ExpedienteViewSet`:
  `acciones_permiso`, serializer de update, `retrieve` con ACL, `agregar_documento`
  (abierto + ACL).
- `backend/apps/archivo/serializers.py` — `ExpedienteActualizarSerializer` (whitelist);
  `ExpedienteCrearSerializer` (`id` + `codigo_expediente` en la respuesta).
- `backend/apps/archivo/tests.py` — **nuevo**.

**Backend** (F3-A.1 — solo backend)
- `backend/apps/archivo/serializers.py` — `ExpedienteDocumentoSerializer.to_representation`:
  nodo restringido reducido a `{id, acceso_restringido}`; nodo de `Tramite` fail-closed.
- `backend/apps/archivo/tests.py` — `ACLDocumentalTest` reescrito (7 tests) + 2 tests de flujo
  del modal.

**Frontend** (F3-A únicamente; F3-A.1 no toca frontend)
- `frontend/src/services/archivo.service.ts` — `agregarDocumento` retipado; eliminado
  `agregarDocumentoExpediente`.
- `frontend/src/components/ui/VincularExpedienteModal.tsx` — usa `agregarDocumento`; sin
  `correoId`/`correo_id`/`['correos']`.
- `frontend/src/pages/documentos/DocumentosPage.tsx` — botón "Vincular a expediente" gateado por
  `puede('archivo','editar')`.
- `frontend/src/pages/tramites/TramitesPage.tsx` — botón "Archivar en expediente" gateado igual.

**Documentación**
- `AUDITORIA_ARCHIVISTICA_SGDA.md` — referencias normativas corregidas; G-matrix y §16/§29/§36
  anotados con el estado post-F3-A.
- `F3A_SANEAMIENTO_ARCHIVO.md` — este documento.

Ningún modelo nuevo. Ninguna migración. `makemigrations --check` no aplica (sin cambios de
esquema).

---

## 9. Brechas expresamente diferidas (siguen ABIERTAS)

| ID | Brecha | Por qué queda fuera de F3-A |
|---|---|---|
| G-04 | Ciclo vital (Gestión/Central/Intermedio/Histórico); `transferir()` no cambia `categoria_actual` | §15 — la lógica del ciclo vital es una fase posterior |
| G-05 | Baja documental "ejecutada" no elimina nada | §16 — F3-A **no** implementa eliminación real ni hard delete |
| G-06 | Documento en N expedientes sin unicidad | §14 — requiere decisión archivística (1:N vs N:M) |
| G-07 | `num_fojas` = conteo de filas, no de fojas físicas | §13 — la foliación es una fase posterior |
| G-08 | Sin archivo físico estructurado (repositorio/zona/caja) | fuera de alcance |
| G-09 | Sin alertas de plazos/caducidades (TPCD pasiva) | fuera de alcance |
| G-10 | Sin carátula ni etiqueta de caja | fuera de alcance |
| G-11 | `aud_log` solo cubre `arc_expediente` | §17 — no se amplían triggers; la auditoría existente **no** se tocó ni se eliminó |
| G-12 | Transiciones de Transferencia/Baja sin acción dedicada (PATCH salta pasos) | §15/§16 — el flujo formal de esos módulos es fase posterior. **Ojo:** F3-A blindó el bypass en `Expediente`, no en `Transferencia`/`BajaDocumental` |
| G-15 | Sin desvincular documento de expediente | fuera de alcance |
| G-16 | Enforcement normativo general de `Documento.confidencial` / `Serie.condicion_acceso` | F3-A cerró la variante concreta (fuga vía Expediente = G-02); el enforcement general sigue pendiente |
| G-17 | `Fondo` sin unicidad "único por institución" | menor; requiere decidir si migrar/validar |
| G-18 | Procedencia (`Unidad`) sin snapshot histórico | requiere rediseño de modelo |
| G-19 | Digitalización masiva crea `ExpedienteDocumento` con `documento=NULL` | bug en `DigitalizacionMasivaView`; ligado a foliación/cardinalidad, diferidas |
| **ACL de lectura de `tramites.Tramite`** | **RF-TRAM-011** — no existe hoy (`TramiteViewSet` = `IsAuthenticated` sin filtro). F3-A.1 **no la crea**: enmascara fail-closed los nodos de trámite en el Expediente. La ACL real de Tramite es F3-B (condición de acceso de Serie/Expediente) |

---

## 10. Criterios de cierre — verificación (F3-A + F3-A.1)

| Criterio (§28 F3-A / §8 F3-A.1) | Estado |
|---|---|
| Ningún endpoint `/archivo` sensible en `IsAuthenticated` puro ignorando el permiso modular | ✅ los 8 ViewSets vía `_ArchivoViewSetBase` |
| Usuario no autorizado recibe rechazo backend (no solo sidebar) | ✅ 403 (autenticado) / 401 (anónimo) |
| Expediente no filtra metadata documental fuera de ACL | ✅ `retrieve` + `to_representation` |
| **Nodo restringido = `{id, acceso_restringido}` — sin ruta indirecta a documento ni trámite** | ✅ **[F3-A.1]** helper `_assert_nodo_restringido_minimo` |
| **`tramite` sin ACL central → fail-closed (no filtra `tramite_id`)** | ✅ **[F3-A.1]** |
| **`num_documentos` — semántica documentada, política sin cambiar** | ✅ **[F3-A.1]** §3.1 |
| Relación con Expediente no concede acceso | ✅ verificado (documento directo → 404) |
| `VincularExpedienteModal` funciona | ✅ ruta real + `id`/`codigo_expediente` en el alta + una sola fuente de servicio; **2 tests de flujo** (existente + crear nuevo) |
| `correoId` muerto eliminado | ✅ del componente y del servicio |
| PATCH no permite saltarse estados críticos | ✅ `ExpedienteActualizarSerializer` |
| Suite de tests de `apps.archivo` | ✅ **29 tests** (antes 0) |
| Tests nuevos 100 % verdes | ✅ |
| `apps.documentos` sigue 100 % verde | ✅ 217/217 |
| Sin regresiones en `tramites` / otras apps | ✅ 246/246 combinadas |
| `tsc` limpio (sin nuevos errores) | ✅ 15 = baseline exacto |
| `vite build` limpio | ✅ |

**F3-A + F3-A.1 cerradas.** No se inició F3-B. No se modificó el diseño archivístico.
