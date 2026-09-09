# AUDITORÍA NORMATIVA Y TÉCNICA DEL SGDA — MÓDULO ARCHIVÍSTICO

**Fuente normativa:** Regla Técnica Nacional para la Organización y Mantenimiento de los Archivos
Públicos, Acuerdo No. SGPR-2019-0107.

**Alcance:** exclusivamente el código de este repositorio (`C:\sgd-gad`). No se inspeccionó QUIPUX.
No se propone implementación. **No se modificó ningún archivo** — auditoría de solo lectura.

**Fecha:** 2026-09-04. **Rama:** `refactor/pdf-quipux-fidelidad`.

**Convención de estados:**
✅ IMPLEMENTADO · 🟡 PARCIAL · 🟠 DORMIDO (existe pero sin endpoint/UI/flujo real) ·
🔴 NO IMPLEMENTADO · ⚠️ MODELO CONCEPTUAL INADECUADO · ❓ NO VERIFICABLE (procedimental/físico)

---

## 1. RESUMEN EJECUTIVO

El SGDA **sí tiene** un módulo de archivo formal (`backend/apps/archivo/`, 845 líneas, wired en
`/api/v1/archivo/`), con modelos para **Fondo → Sección → Serie → Expediente**,
**Transferencia**, **Baja documental**, **Préstamo** y **Copia certificada** — no es una tabla
suelta con ese nombre: hay CRUD completo (backend + 5 páginas de frontend) para casi todo el
Cuadro de Clasificación y el ciclo de Expediente. Esto contradice la hipótesis de partida más
pesimista ("solo existe organigrama") — **sí existe** un Cuadro General de Clasificación
Documental estructuralmente correcto, separado de `organizacion.Unidad`.

Dicho eso, el módulo tiene **brechas reales, no cosméticas**:

1. **Seguridad — CRÍTICA.** Ningún ViewSet de `archivo` valida el módulo de permisos `archivo`
   (`apps/usuarios/permisos.py` lo declara, pero `apps/archivo/views.py` solo exige
   `IsAuthenticated`). Cualquier usuario autenticado —incluido el rol `USUARIO`, que según
   `PERMISOS_ROL` no tiene el módulo `archivo`— puede crear/editar/**eliminar** Fondos,
   Secciones, Series, Expedientes, Transferencias, Bajas, Préstamos y Copias certificadas por
   API directa. Además, `GET /archivo/expedientes/{id}/` expone `documento_numero` /
   `documento_asunto` de los documentos vinculados **sin pasar por la ACL de lectura documental**
   (`documentos_visibles_para`, F2-E) — la pertenencia a un expediente filtra metadatos de
   documentos a los que el usuario no tendría acceso directo.
2. **`estado` del Expediente es editable por el endpoint genérico**, evitando por completo la
   regla de negocio de la acción `cerrar` (que exige `expurgado` y `foliado`). Un `PATCH
   /archivo/expedientes/{id}/ {"estado":"cerrado"}` cierra sin cumplir nada; y no existe acción
   `reabrir`, pero el mismo PATCH genérico reabre igual.
3. **El ciclo vital (Gestión/Central/Intermedio/Histórico) está solo parcialmente cableado.**
   `categoria_actual` tiene los 4 valores en el modelo, pero la acción `transferir` cambia
   `estado` a `'transferido'` y **nunca** actualiza `categoria_actual` — los valores
   `'intermedio'` y `'historico'` son inalcanzables por cualquier código existente (🟠 DORMIDOS).
4. **La Tabla de Plazos de Conservación SÍ está implementada de verdad** (`Serie.anos_gestion`,
   `anos_central`, `base_legal`, `disposicion_final`, `tecnica_seleccion` + la property
   `Expediente.fecha_limite_categoria`) — pero no dispara ninguna alerta (N-045 no implementado).
5. **Un documento puede estar en N expedientes y un expediente puede repetir el mismo documento**
   — no hay ninguna restricción de unicidad en `ExpedienteDocumento` (ni `unique_together`, ni
   regla de servicio). No es una decisión N:M deliberada: es simplemente la ausencia de una regla.
6. **No hay archivo físico estructurado** (repositorio/zona/estantería/caja): solo campos de
   texto libre (`ubicacion_fisica`, `numero_caja`, `signatura_topografica`).
7. **Carpetas Virtuales (F2-F) y Documentos Asociados (F2-E) son, en efecto, conceptos
   independientes de Expediente/Serie** — confirmado por inspección de código: cero imports
   cruzados en ningún sentido entre `apps.archivo` y `CarpetaVirtual`/`DocumentoCarpetaVirtual`
   o `Documento.responde_a`.
8. **Datos reales en la BD de desarrollo:** 1 Fondo, 52 Secciones, 13 Series (Cuadro de
   Clasificación real y poblado) — pero **0 Expedientes, 0 Transferencias, 0 Bajas, 0 Préstamos,
   0 Copias certificadas**: la capa operativa nunca se ha usado en este entorno.
9. **Trazabilidad desigual:** el trigger `fn_auditoria` (`aud_log`) está enganchado a
   `arc_expediente`, pero **no** a `arc_fondo`, `arc_seccion`, `arc_serie`,
   `arc_expediente_doc`, `arc_transferencia`, `arc_baja_documental`, `arc_prestamo` ni
   `arc_copia_certificada` — verificado contra la base real (`information_schema.triggers`).
10. **0 tests** (`apps.archivo` → `Ran 0 tests`). Ningún endpoint archivístico tiene cobertura
    automatizada.

---

## 2. INVENTARIO TÉCNICO ACTUAL

| Componente SGDA | Existe | Estado real | Archivo/modelo | ¿Tiene flujo? |
|---|---|---|---|---|
| `Fondo` | Sí | Real, CRUD completo | `archivo/models.py:10-21` (`arc_fondo`) | Sí — `FondoViewSet` + `CuadroClasificacionPage.tsx` |
| `Seccion` | Sí | Real, con jerarquía y árbol | `archivo/models.py:24-38` (`arc_seccion`) | Sí — `SeccionViewSet.arbol` + UI |
| `Serie` | Sí | Real, con TPCD embebida | `archivo/models.py:41-91` (`arc_serie`) | Sí — `SerieViewSet` + UI |
| `Expediente` | Sí | Real, con acciones de ciclo | `archivo/models.py:96-174` (`arc_expediente`) | Sí — `ExpedienteViewSet` (7 acciones) + 5 páginas |
| `ExpedienteDocumento` | Sí | Real pero sin unicidad ni dedupe | `archivo/models.py:177-190` (`arc_expediente_doc`) | Sí, parcial — `agregar_documento` + `VincularExpedienteModal` |
| `Transferencia` / `TransferenciaExpediente` | Sí | Real, sin transiciones de estado automatizadas más allá de creación | `archivo/models.py:195-243` | Sí — `TransferenciaViewSet` + `CicloVitalPage.tsx` |
| `BajaDocumental` / `BajaExpediente` | Sí | Real como registro; **no ejecuta ninguna eliminación real** | `archivo/models.py:248-293` | Sí — `BajaDocumentalViewSet` + `BajaDocumentalPage.tsx` |
| `PrestamoDocumental` | Sí | Real, con devolución funcional | `archivo/models.py:298-322` | Sí — `PrestamoDocumentalViewSet` + `PrestamosCopiasCertificadasPage.tsx` |
| `CopiaCertificada` | Sí | Real, solo creación | `archivo/models.py:327-341` | Sí — `CopiaCertificadaViewSet` + UI |
| `VincularExpedienteModal` | Sí | Real, con bug de endpoint (ver §5) | `frontend/src/components/ui/VincularExpedienteModal.tsx` | Sí, desde `DocumentosPage.tsx` |
| `Archivo` (nombre genérico) | **No** | No existe una clase `Archivo` | — | — |
| `ArchivoNivel` / `ArchivoRadicado` | **No** | No existen | — | — |
| `organizacion.Unidad` | Sí | Organigrama, NO cuadro de clasificación | `organizacion/models.py:33-83` (`org_unidad`) | Sí, para organigrama; referenciado por `Seccion.unidad` / `Expediente.unidad` |
| `Documento.etiquetas` | Sí | `JSONField` lista libre de strings, **sin relación con Archivo** | `documentos/models.py:62` | Sí, pero es un campo suelto sin servicio propio |
| `CarpetaVirtual` / `DocumentoCarpetaVirtual` | Sí | Completo (F2-F), **independiente de Archivo** | `documentos/models.py` (`doc_carpeta_virtual`, `doc_documento_carpeta`) | Sí, ver §9 |
| `Documento.confidencial` | Sí | Campo booleano, **sin ningún punto de aplicación** | `documentos/models.py:89` | 🟠 DORMIDO |
| `Serie.condicion_acceso` | Sí | Choices `publico/confidencial/reservado`, **sin ningún punto de aplicación** | `archivo/models.py:48-52,69` | 🟠 DORMIDO |
| Módulo de permisos `archivo` (`PERMISOS_ROL`) | Sí | Declarado, **nunca consultado por `archivo/views.py`** | `usuarios/permisos.py:39,47,62,69` | 🟠 DORMIDO |
| Repositorio físico jerárquico (zona/estantería/caja) | **No** | Solo campos de texto libre | — | 🔴 |

**Regla aplicada:** ningún componente de esta tabla se clasificó "implementado" solo por existir
la clase/tabla — cada fila cita el endpoint, servicio o UI que efectivamente lo usa, o declara
explícitamente que no lo tiene.

---

## 3. MODELO REAL SGDA (tal como está en el código, sin inventar entidades)

```
organizacion.Unidad (org_unidad)                    usuarios.Usuario
   │ padre (self, N:1)                                   │
   │                                                      │
   ├──1:N──> archivo.Seccion.unidad                       │
   │                                                      │
Fondo (arc_fondo)                                         │
   └─1:N──> Seccion (arc_seccion) ──seccion_padre (self, N:1)─┐
                 │                                          │ (subsecciones)
                 └─1:N──> Serie (arc_serie) ──serie_padre (self, N:1)─┐
                                │                                     │ (subseries)
                                └─1:N──> Expediente (arc_expediente)
                                            │ unidad (N:1, INDEPENDIENTE de Seccion.unidad)
                                            │ creado_por (N:1 Usuario)
                                            │
                                            ├─1:N──> ExpedienteDocumento (arc_expediente_doc)
                                            │            │ documento (N:1, SET_NULL, nullable)──> documentos.Documento
                                            │            │ tramite   (N:1, SET_NULL, nullable)──> tramites.Tramite
                                            │            └ SIN unique_together (documento puede repetirse
                                            │              en el mismo expediente; puede estar en N expedientes)
                                            │
                                            ├─1:N──> TransferenciaExpediente ──N:1──> Transferencia (arc_transferencia)
                                            ├─1:N──> BajaExpediente          ──N:1──> BajaDocumental (arc_baja_documental)
                                            ├─1:N──> PrestamoDocumental (arc_prestamo)
                                            └─1:N──> CopiaCertificada (arc_copia_certificada)

documentos.Documento (doc_documento) ── SIN relación directa a Expediente en su propio modelo
   (la relación existe SOLO desde ExpedienteDocumento, unidireccional archivo → documentos)
   │
   ├─ CarpetaVirtual / DocumentoCarpetaVirtual  (F2-F — independiente, ver §9)
   ├─ responde_a (self, antecedente/consecuente F2-E — independiente, ver §10)
   └─ BandejaDocumento.bandeja='archivados'      (operación de bandeja — independiente, ver §11)
```

**Cardinalidades reales verificadas en código (no supuestas):**
- `Fondo 1 — N Seccion`, `Seccion 1 — N Seccion` (subsecciones, `SET_NULL`), `Seccion 1 — N Serie`
  (`PROTECT`), `Serie 1 — N Serie` (subseries, `SET_NULL`), `Serie 1 — N Expediente` (`PROTECT`).
- `Expediente N — 1 Unidad` (`PROTECT`), pero **no** existe relación `Expediente ↔ Seccion.unidad`
  que las mantenga sincronizadas — pueden ser distintas.
- `Expediente 1 — N ExpedienteDocumento`, `Documento 0..1 — N ExpedienteDocumento`
  (`SET_NULL`, nullable) → **N:M efectivo sin restricción** entre `Documento` y `Expediente`.
- `Transferencia 1 — N TransferenciaExpediente N — 1 Expediente` (tabla puente con
  `unique_together`, así que un expediente no se repite en la misma transferencia).
- `BajaDocumental 1 — N BajaExpediente N — 1 Expediente` (mismo patrón, `unique_together`).
- `Expediente 1 — N PrestamoDocumental`, `Expediente 1 — N CopiaCertificada` (FK simples).

---

## 4. MATRIZ NORMATIVA N-001 — N-045

> **Referencias de artículos (revisado F3-A, 2026-09-07).** Las citas del ciclo
> del expediente (integración, ordenación, cierre, expurgo, foliación,
> descripción, carátula, etiqueta, inventario, guía, CGCD, TPCD) se corrigieron
> contra el Acuerdo **SGPR-2019-0107**:
> integración = **Art. 31** · ordenación = **Art. 32** · cierre = **Art. 33** ·
> expurgo = **Art. 34** · foliación = **Art. 35** · descripción = **Art. 36** ·
> carátula = **Art. 37** · etiqueta de caja = **Art. 38** · inventario = **Art. 39** ·
> guía de archivos = **Art. 40** · CGCD/clasificación = **Arts. 28-30** · TPCD = **Art. 46**.
> El diagnóstico técnico NO cambió por la corrección de numeración.
> Las citas marcadas **†** (ciclo vital, valoración, préstamo, expediente
> electrónico, confidencialidad) no formaron parte de esa lista de verificación
> y se conservan del borrador original — **confirmar contra el PDF**.
> Anotaciones **[F3-A]** = ítem intervenido en la fase de saneamiento.

| ID | Requisito | Art. | SGDA | Estado | Evidencia | Gap |
|---|---|---|---|---|---|---|
| N-001 | Fondo documental | Arts. 28-30 | `Fondo` model + CRUD | 🟡 PARCIAL | `archivo/models.py:10-21`, `views.py` `FondoViewSet` | "Único por institución" no tiene constraint; nada impide crear 2+ Fondos (G-17) |
| N-002 | Sección documental | Arts. 28-30 | `Seccion` (FK Fondo+Unidad) | ✅ IMPLEMENTADO | `models.py:24-38`, `views.py` `SeccionViewSet` (`/arbol/`) | **[F3-A]** ahora exige permiso de módulo `archivo` (antes: N-040) |
| N-003 | Subsección documental | Arts. 28-30 | `Seccion.seccion_padre` self-FK | ✅ IMPLEMENTADO | `models.py:30`, `views.py` recursión de árbol | Igual |
| N-004 | Serie documental | Arts. 28-30 | `Serie` (FK Seccion) | ✅ IMPLEMENTADO | `models.py:41-91` | Igual |
| N-005 | Subserie documental | Arts. 28-30 | `Serie.serie_padre` self-FK | ✅ IMPLEMENTADO | `models.py:64` | Igual |
| N-006 | Cuadro General de Clasificación Documental | Arts. 28-30 | Fondo→Sección→Serie completo + UI dedicada | ✅ IMPLEMENTADO | `CuadroClasificacionPage.tsx` (412 líneas, CRUD real) | **[F3-A]** ya no editable por cualquier autenticado — requiere `archivo:crear/editar` |
| N-007 | Unidad productora / principio de procedencia | — | FK viva a `organizacion.Unidad`, sin snapshot histórico | ⚠️ MODELO CONCEPTUAL INADECUADO | `archivo/models.py:27,116`; `documentos/models.py:66-73` | Si la Unidad se renombra/reubica, la procedencia histórica se reescribe retroactivamente — ver §6 (G-18, diferida) |
| N-008 | Expediente archivístico | Arts. 31-33 | `Expediente` con 20+ campos | 🟡 PARCIAL | `archivo/models.py:96-174` | Ver auditoría dedicada §5 |
| N-009 | Integración de documentos al expediente | Art. 31 | `ExpedienteDocumento` + acción + modal | 🟡 PARCIAL | `views.py` `agregar_documento`, `VincularExpedienteModal.tsx` | **[F3-A]** `agregar_documento` ahora exige expediente **abierto** + ACL del documento; sin dedupe y digitalización masiva con filas huérfanas siguen abiertos (G-06/G-19) |
| N-010 | Orden original | Art. 32 | Campo `orden_foja` + `Meta.ordering` | 🟡 PARCIAL | `models.py:181,187` | Nunca lo escribe la UI; el orden real es cronológico por defecto, no manual (diferido) |
| N-011 | Expediente abierto/cerrado | Art. 33 | `estado` choices + acción `cerrar` con gate | 🟡 PARCIAL | `views.py` `cerrar`; `ExpedienteActualizarSerializer` | **[F3-A]** bypass de `estado` vía PATCH genérico **cerrado**; sin `reabrir` formal sigue pendiente |
| N-012 | Fecha apertura/cierre | Art. 33 | `fecha_inicio`, `fecha_cierre` | 🟡 PARCIAL | `models.py:120-121` | **[F3-A]** `fecha_cierre`/`fecha_expurgo`/`fecha_foliacion` ya no editables por PATCH; `fecha_inicio` sigue sin autoasignarse |
| N-013 | Expurgo | Art. 34 | `expurgado` + `fecha_expurgo` + acción | 🟡 PARCIAL | `views.py` `expurgar` | Es un flag, no un procedimiento (sin checklist/servicio) — diferido |
| N-014 | Foliación | Art. 35 | `foliado`+`fecha_foliacion`+`num_fojas` | ⚠️ MODELO CONCEPTUAL INADECUADO | `views.py` `agregar_documento`/`foliar` | `num_fojas` = **conteo de `ExpedienteDocumento`**, no de fojas/páginas físicas reales (G-07, diferido) |
| N-015 | Partes/volúmenes/tomos | Art. 31 † | `numero_parte` CharField libre (ej. "1/3") | 🟡 PARCIAL | `models.py:126` | Sin modelo relacional entre partes de un mismo expediente |
| N-016 | Carátula | Art. 37 | — | 🔴 NO IMPLEMENTADO | sin resultados en `archivo/`, `plantillas.py` | No hay generación de carátula (ni PDF ni HTML) — G-10 |
| N-017 | Etiqueta de caja | Art. 38 | — | 🔴 NO IMPLEMENTADO | sin resultados | No hay generación de etiquetas — G-10 |
| N-018 | Inventario documental | Art. 39 | Datos existen vía API; sin artefacto formal | 🟡 PARCIAL | `ExpedienteListSerializer` | Ver comparación de campos §8; sin export PDF/Excel (Reportes con Excel = pendiente, CLAUDE.md) |
| N-019 | Guía de archivos | Art. 40 | — | 🔴 NO IMPLEMENTADO | sin resultados | — |
| N-020 | Condición de acceso | — | `Serie.condicion_acceso` + `Documento.confidencial` | 🟠 DORMIDO | `archivo/models.py:48-52,69`; `documentos/models.py:89` | Ningún ACL (`acl_documentos.py`) los consulta (G-16, diferido). **[F3-A]** distinto: la fuga de metadata **documental** vía Expediente (G-02) sí se cerró |
| N-021 | Soporte documental | — | `Expediente.soporte` (digital/físico/mixto) | ✅ IMPLEMENTADO | `models.py:97-101,123`; usado en `estadisticas` | — |
| N-022 | Tabla de Plazos de Conservación Documental | Art. 46 | `Serie.anos_gestion/anos_central/base_legal/disposicion_final/tecnica_seleccion` | ✅ IMPLEMENTADO | `models.py:71-76`; `Expediente.fecha_limite_categoria` | Sin alertas automáticas (N-045 / G-09, diferido) |
| N-023 | Archivo de Gestión | Arts. 11-16 † | `categoria_actual='gestion'` (default) | 🟡 PARCIAL | `models.py:108-113,129` | Solo una etiqueta; sin subsistema propio — no confundir con bandeja "Archivados" (§11) |
| N-024 | Archivo Central | Arts. 11-16 † | `categoria_actual='central'` | 🟡 PARCIAL | `models.py:110` | La acción `transferir` **NO** actualiza `categoria_actual` — solo cambia `estado='transferido'` (G-04, diferido) |
| N-025 | Archivo Intermedio | Arts. 11-16 † | `categoria_actual='intermedio'` en el enum | 🟠 DORMIDO | `models.py:111` | Ningún código de este repo escribe este valor jamás (G-04) |
| N-026 | Archivo Histórico | Arts. 11-16 † | `categoria_actual='historico'` en el enum | 🟠 DORMIDO | `models.py:112` | Ídem; tampoco lo toca `BajaDocumental` (G-04) |
| N-027 | Transferencia primaria | Arts. 47-50 † | `Transferencia(tipo='primaria')` + inventario | 🟡 PARCIAL | `models.py:195-243`; `CicloVitalPage.tsx` | Sin transición automática de `categoria_actual` al aceptarse (G-04/G-12, diferido) |
| N-028 | Transferencia secundaria | Arts. 47-50 † | Mismo modelo, `tipo='secundaria'` | 🟡 PARCIAL | `models.py:196-199` | Mismo modelo genérico, mismas brechas de N-027 |
| N-029 | Transferencia final | Arts. 47-50 † | Mismo modelo, `tipo='final'` | 🟡 PARCIAL | `models.py:199` | Ídem |
| N-030 | Valoración documental | Arts. 44-46 † | `Serie.disposicion_final/tecnica_seleccion` a nivel serie | 🟡 PARCIAL | `models.py:53-61,75-76` | Es valoración PRE-ASIGNADA a la serie, no un acto de valoración caso-por-caso auditable (diferido) |
| N-031 | Valores primarios/secundarios | Art. 44 † | No hay campo explícito `valor_primario`/`valor_secundario` | 🔴 NO IMPLEMENTADO | — | La disposición final de la Serie es lo más cercano, no equivalente |
| N-032 | Ficha Técnica de Prevaloración | Art. 45 † | `BajaDocumental` (caracter_proceso, justificacion, normativa_legal, numero_expedientes, numero_cajas, metros_lineales) | ✅ IMPLEMENTADO (como ficha) | `models.py:248-284` | Sin adjunto/documento formal de la ficha; solo campos estructurados |
| N-033 | Baja documental | Art. 53 † | `BajaDocumental` con flujo de estados | 🟡 PARCIAL | `models.py:248-284`; `BajaDocumentalPage.tsx` | `estado='ejecutada'` **no dispara ninguna eliminación real** (G-05, diferido explícitamente en F3-A) |
| N-034 | Préstamo documental | Art. 60 † | `PrestamoDocumental` con devolución | ✅ IMPLEMENTADO | `models.py:298-322`; `PrestamosCopiasCertificadasPage.tsx` | Sin lógica de prórroga; `estado='vencido'` nunca se calcula solo |
| N-035 | Ubicación topográfica | — | Campos de texto libre | 🟡 PARCIAL | `ubicacion_fisica`, `numero_caja` (`models.py:124-125`), `signatura_topografica` (`models.py:236`) | Sin modelo estructurado (ver N-036) |
| N-036 | Caja / repositorio físico | — | — | 🔴 NO IMPLEMENTADO | — | Ningún modelo `Repositorio`/`Zona`/`Estantería`/`Caja`; solo strings sueltos (G-08) |
| N-037 | Expediente electrónico | Arts. 69-75 † | `Expediente.soporte='digital'` + `ExpedienteDocumento.documento` | 🟡 PARCIAL | `models.py:97-101` | Ver §26 |
| N-038 | Expediente híbrido | Arts. 69-75 † | `Expediente.soporte='mixto'` | ✅ IMPLEMENTADO (como valor) | `models.py:100` | Solo el rótulo; sin reglas distintas para la parte física vs digital |
| N-039 | Metadatos archivísticos | — | Ver comparación de campos §8 | 🟡 PARCIAL | — | Metadatos de gestión documental (Documento) sí; metadatos archivísticos formales, parcial |
| N-040 | Seguridad / roles / permisos | — | Módulo `archivo` con enforcement backend | ✅ IMPLEMENTADO **[F3-A]** | `usuarios/permisos.py` `PermisoModulo`; `archivo/views.py` `_ArchivoViewSetBase` (`modulo_permiso='archivo'`, aplicado a los 8 ViewSets); tests `apps/archivo/tests.py::PermisosModuloTest` | RESUELTO (era 🟠 DORMIDO / G-01) — antes solo `IsAuthenticated` |
| N-041 | Auditoría | — | `aud_log` solo en `arc_expediente` | 🟡 PARCIAL | verificado en BD real (`information_schema.triggers`) | G-11 sigue abierta: Fondo/Sección/Serie/Transferencia/Baja/Préstamo/Copia sin trigger (diferido; F3-A no toca triggers) |
| N-042 | Preservación | Art. 72 † | Nada específico de archivo; sí existe para el PDF oficial de `documentos` (congelado inmutable, hash) | 🟡 PARCIAL (fuera de `archivo`) | `pdf_oficial.py` (app `documentos`) | `archivo` no tiene mecanismo de preservación propio (checksums, formatos, migración de formato) |
| N-043 | Migración de información | — | Sin mecanismo de import histórico hacia `archivo` | 🔴 NO IMPLEMENTADO | — | Ver §18 |
| N-044 | Búsqueda/localización/recuperación | — | `search_fields` DRF en Sección/Serie/Expediente | 🟡 PARCIAL | `views.py:35,63,79` (`SearchFilter`) | Búsqueda simple `icontains`, no facetada por Fondo/Sección/Serie/ubicación combinados |
| N-045 | Alertas de plazos/caducidades | — | — | 🔴 NO IMPLEMENTADO | `fecha_limite_categoria` existe pero nada la consulta proactivamente; `dias_para_expurgo` es un campo calculado de solo lectura, no una alerta | Ninguna notificación/cron relacionada con archivo (el módulo `not_` de notificaciones no referencia `archivo`) |

---

## 5. AUDITORÍA DEL `Expediente` ACTUAL

**¿Qué representa?** Es fundamentalmente **B — un expediente archivístico formal**, no un simple
agrupador ni un contenedor físico puro: tiene Serie (clasificación), unidad productora, ciclo
vital, expurgo/foliación como precondición de cierre. No es una mezcla arbitraria de conceptos,
pero su implementación es incompleta en varios puntos (ver matriz).

**Campos verificados uno a uno** (`archivo/models.py:96-152`):

| Campo exigido | ¿Existe? | Campo SGDA |
|---|---|---|
| Número de expediente | Sí | `codigo_expediente` (único, auto-generado `EXP-{siglas}-{año}-{secuencial}`) |
| Asunto/descripción | Sí | `titulo` + `descripcion` |
| Unidad productora | Sí (FK viva, ver N-007) | `unidad` |
| Fondo | Derivable | vía `serie.seccion.fondo` (no denormalizado en `Expediente`) |
| Sección | Derivable | vía `serie.seccion` |
| Subsección | Derivable | vía `serie.seccion.seccion_padre` si aplica |
| Serie | Sí (directo) | `serie` (FK obligatoria) |
| Subserie | Derivable/directo | si `serie` apunta a una subserie (mismo modelo `Serie`) |
| Fecha apertura | Sí | `fecha_inicio` (opcional, no autoasignada) |
| Fecha cierre | Sí | `fecha_cierre` (autoasignada solo por la acción `cerrar`) |
| Estado abierto/cerrado | Sí | `estado` (abierto/cerrado/transferido/eliminado) |
| Condición de acceso | **No existe en Expediente** | Solo en `Serie.condicion_acceso`, no heredada/copiada al Expediente |
| Soporte | Sí | `soporte` (digital/físico/mixto) |
| Número de fojas | Sí, pero mal calculado | `num_fojas` (ver N-014) |
| Tomo/volumen | Sí, texto libre | `numero_parte` |
| Caja | Sí, texto libre | `numero_caja` |
| Ubicación | Sí, texto libre | `ubicacion_fisica` |
| Plazo de conservación | Derivable | vía `serie.anos_gestion/anos_central` + `fecha_limite_categoria` |
| Destino final | Derivable | vía `serie.disposicion_final` |

No se declara "Expedientes implementado" solo por existir la tabla: el 40% de estos campos son
**derivados** (no están almacenados en `Expediente` mismo), lo cual es aceptable normativamente
(la Serie es la fuente de la política), pero **no hay ningún serializer que exponga el Fondo o la
Sección de un Expediente** — `ExpedienteSerializer`/`ExpedienteListSerializer`/
`ExpedienteDetalleSerializer` solo exponen `serie_nombre`/`serie_codigo`, obligando al frontend a
navegar `serie → seccion → fondo` manualmente si quisiera mostrarlos (no lo hace hoy).

---

## 6. `VincularExpedienteModal` — auditoría específica

- **Dónde aparece:** solo en `DocumentosPage.tsx:1314-1322`, botón "Vincular a expediente",
  visible cuando `(recibido || bandeja==='enviados' || enElaboración) && !anulado`
  (`DocumentosPage.tsx:869-870`).
- **Sobre qué documentos:** solo `Documento` de `apps.documentos` (pasa `documentoId`). Nunca se
  invoca con un `tramiteId` real en este repo (grep sin resultados fuera del propio componente).
- **`correoId` es un parámetro MUERTO:** el componente acepta `correoId` y lo envía como
  `correo_id`, e invalida `queryKey:['correos']` al éxito (`VincularExpedienteModal.tsx:9,38,42,58`)
  — pero la app `correos` **fue eliminada por completo** (confirmado en `CLAUDE.md`). Nunca se le
  pasa un valor real desde `DocumentosPage.tsx`. Es código residual de una integración que ya no
  existe.
- **Endpoint que llama — BUG DE RUTA:** el frontend llama
  `POST /archivo/expedientes/{id}/agregar-documento/` (con **guion**,
  `archivo.service.ts:249-250`), pero la acción del backend está registrada como
  `url_path='agregar_documento'` (con **guion bajo**, `archivo/views.py:97`). DRF `@action` no
  normaliza guiones/guiones bajos automáticamente entre sí — **esta llamada específica devuelve
  404** tal como está el código hoy. (Nota: el propio `archivo.service.ts` también define
  `agregarDocumento` en la línea 213-214 apuntando correctamente a `agregar_documento` con guion
  bajo — es decir, existen DOS métodos del servicio para la misma acción, uno roto y otro
  correcto; `VincularExpedienteModal` usa el roto.)
- **Qué estructura escribe:** una fila `ExpedienteDocumento` (`documento=documentoId`,
  `tramite=None`, `agregado_por=usuario`); si `modo='nuevo'`, antes crea el `Expediente` vía
  `POST /archivo/expedientes/`.
- **¿Crea expediente?** Sí, en el modo "Crear expediente nuevo" (`crearYVincularMutation`,
  `VincularExpedienteModal.tsx:49-63`), con solo `serie` y `titulo` como obligatorios.
- **¿Solo vincula?** En el modo "Expediente existente", sí.
- **Permisos:** ninguno propio; hereda la ausencia total de control de `archivo/views.py`
  (cualquier autenticado).
- **Validaciones:** solo de formulario (campos no vacíos). Sin validación de duplicados, sin
  validar `estado` del expediente destino más allá del filtro `elegibles` (que sí filtra
  `estado='abierto'`, `views.py:118-127` — este es el único punto donde el sistema respeta
  "abierto" antes de vincular).
- **¿Puede desvincular?** **No** — no existe ningún botón ni endpoint DELETE/quitar expuesto en
  este componente ni en `archivo.service.ts` para `ExpedienteDocumento`. La única forma de
  "desvincular" sería un DELETE directo a `arc_expediente_doc` fuera de la UI.
- **¿Permite expediente cerrado?** El listado `elegibles` filtra `estado='abierto'`, así que la UI
  no lo ofrece — pero el endpoint genérico `agregar_documento` **no valida el estado del
  expediente**, así que un cliente API directo sí podría agregar documentos a un expediente
  cerrado.
- **¿Evita duplicados?** No, en ningún nivel (ver N-009/N-013 más abajo).
- **¿Conserva orden?** Solo por `agregado_en` implícito (`orden_foja` nunca se envía desde este
  modal).

**Conclusión:** representa un proceso archivístico real pero **incompleto y con un bug de
integración activo** (ruta rota) y una referencia muerta (`correoId`).

---

## 7. ORGANIZACIÓN Y PROCEDENCIA

`organizacion.Unidad` (`org_unidad`): `padre` (self, `SET_NULL`), `nivel` (FK `Nivel`, `PROTECT`),
`funcion` (FK `Funcion`, `SET_NULL`), `tipo` (10 choices: prefectura/viceprefectura/consejo/
dirección/unidad/coordinación/secretaría/asesoría/procuraduría/zona), `activo` (bool),
`orden_display`, sin ningún campo de vigencia temporal (`vigente_desde`/`vigente_hasta`) ni tabla
de historial.

- **¿`Unidad` = `Sección`?** **No, y el código lo confirma explícitamente**: `Seccion` es un
  modelo propio con `unidad` como FK (una Sección PERTENECE a una Unidad, no es lo mismo). Una
  misma `Unidad` puede tener 0, 1 o varias `Seccion` (no hay unicidad `Unidad↔Sección`).
- **¿Aporta la unidad productora?** Sí, es la fuente de `Seccion.unidad`, `Expediente.unidad` y
  `Documento.unidad_origen` — pero siempre como **FK viva**, nunca como copia/snapshot.
- **¿Guarda procedencia histórica o solo una FK mutable?** **Solo FK mutable.** No existe ningún
  modelo de snapshot/versión de `Unidad` en `organizacion/models.py` (solo `Nivel`, `Funcion`,
  `Unidad` — verificado exhaustivamente, sin clases adicionales).
- **Si un usuario cambia de Unidad, ¿un Documento histórico cambia conceptualmente de
  productor?** El **Documento no** (su `unidad_origen` no depende del usuario que lo creó, sino
  de la Unidad elegida al crearlo, que queda fija salvo edición manual). Pero si **esa Unidad**
  es luego renombrada, fusionada o reubicada en el organigrama (editando la fila `Unidad`
  directamente), **todos los documentos y expedientes que la referencian muestran
  retroactivamente los datos nuevos** — no hay forma de saber, mirando un documento antiguo, cuál
  era el nombre/posición exacta de la unidad en el momento de su creación. Esto es lo que motiva
  la clasificación ⚠️ para N-007: el principio de procedencia exige que la vinculación al productor
  sea estable en el tiempo, y aquí es mutable por diseño.

---

## 8. FONDO / SECCIÓN / SUBSECCIÓN — distinción de organigrama

Confirmado: **sí existe** un modelo archivístico equivalente, separado del organigrama
(`archivo.Fondo`, `archivo.Seccion`), por lo que N-001/N-002/N-003 se marcaron como
implementados/parciales **con evidencia**, no por asunción. `Seccion` no es sinónimo de `Unidad`:
es una entidad archivística con su propio `codigo`, jerarquía propia (`seccion_padre`) y
pertenencia a un `Fondo`, que además referencia una `Unidad` (para saber qué área administra esa
sección del cuadro).

---

## 9. SERIES / SUBSERIES — distinción de tipología documental

- **Existe** `archivo.Serie` (con `serie_padre` para subseries). **No existe** ningún modelo
  llamado `TipoDocumental`, `Proceso`, `CategoriaDocumental` o `Clasificacion` adicional.
- `TipoDocumento` (`documentos/models.py:13-25`: `codigo`, `nombre`, `prefijo_numeracion`,
  `requiere_firma`, `requiere_aprobacion`, `dias_plazo_default`, `secuencial_inicial`) **no tiene
  ninguna FK hacia `archivo.Serie`** ni viceversa — están completamente desacoplados en el código.
  Confirma explícitamente lo que pedía la auditoría: **Memorando/Oficio/Circular (TipoDocumento)
  son tipologías documentales para la numeración y el flujo de firma, NO series archivísticas.**
  Un mismo `TipoDocumento` (p. ej. "Oficio") puede producirse desde cualquier `Serie`; no hay
  ningún mecanismo que los relacione ni implícita ni explícitamente.

---

## 10. CARPETAS VIRTUALES — verificación de independencia (F2-F)

Verificado por búsqueda exhaustiva: **cero referencias cruzadas** en ambos sentidos.
`grep "apps.archivo"` dentro de `apps/documentos/` solo aparece en `views.py` para
`ExpedienteDocumento` (ver §12/§23) — nunca junto a `CarpetaVirtual`/`DocumentoCarpetaVirtual`.
`grep "CarpetaVirtual|DocumentoCarpetaVirtual"` dentro de `apps/archivo/` → 0 resultados.

**Explícito:** `CarpetaVirtual` (`doc_carpeta_virtual`) es una clasificación operativa de una
`Unidad` sobre un `Documento` (F2-F), sin `Serie`, sin `Fondo`, sin control de cierre, sin ciclo
vital, sin plazos de conservación, con soft-delete propio y aud_log propio. **No se propone, ni
debe leerse esta auditoría como una sugerencia de, convertir `CarpetaVirtual` en `Expediente`,
`Serie` o `Subserie`.** Son necesariamente distintas: `CarpetaVirtual` no tiene código
archivístico, no tiene Serie, no controla plazos de conservación ni transferencias, y un mismo
documento puede estar en una `CarpetaVirtual` de una unidad y NO en ningún `Expediente`, o
viceversa.

---

## 11. DOCUMENTOS ASOCIADOS — verificación de independencia (F2-E)

Verificado: `Documento.responde_a` (`documentos/models.py:95-98`, FK `'self'`, `SET_NULL`,
`related_name='respuestas'`) es una relación **antecedente/consecuente entre dos Documentos**,
gestionada por `apps.documentos.servicios_documento_asoc`. **Cero acoplamiento** con
`archivo.Expediente`: ningún modelo de `archivo` referencia `responde_a`, y
`servicios_documento_asoc.py` no importa nada de `apps.archivo`. Que un documento "B" responda a
un documento "A" **no implica en absoluto** que ambos pertenezcan al mismo `Expediente` — de
hecho hoy nada sincroniza esas dos nociones (podría decirse que es una brecha funcional futura,
no algo mal implementado: son ejes ortogonales por diseño, tal como debían ser).

---

## 12. BANDEJA "ARCHIVADOS" — ¿es Archivo de Gestión?

**No.** Es una operación exclusivamente de bandeja personal, sin ninguna relación con
`archivo.Expediente`:

- `BandejaDocumento.bandeja='archivados'` + `bandeja_origen` (recibidos/enviados) — implementado
  en `apps.documentos.servicios_bandeja` (`validar_archivado_bandeja`/`aplicar_archivado_bandeja`,
  `validar_desarchivado`/`aplicar_desarchivado`).
- El propio código lo documenta así en `MIGRACION_QUIPUX_ARCHIVADOS.md:1` y en los comentarios de
  la acción "Archivar" del frontend (`DocumentosPage.tsx:868`: *"Pasarán a tu bandeja Archivados
  (archivo de gestión personal). No se vinculan a ningún expediente."*) — el propio equipo que
  construyó esa función ya dejó explícito que NO es Archivo de Gestión formal.
- **Cero import** de `apps.archivo` dentro de `servicios_bandeja.py`.
- Por tanto: "Archivar"/"Restaurar archivado"/bandeja Archivados = **organización operacional
  personal de bandeja**, no el "Archivo de Gestión" normativo (Arts. 11-16 † — categorías de
  archivo del Acuerdo SGPR-2019-0107), que es
  `Expediente.categoria_actual='gestion'` — dos cosas con el mismo nombre coloquial ("archivar")
  pero sistemas completamente distintos y sin ningún puente entre ellos hoy.

---

## 13. INTEGRACIÓN DEL EXPEDIENTE — matriz de operaciones

| Operación | Endpoint | Servicio | Permiso | Frontend | Test |
|---|---|---|---|---|---|
| Crear expediente | `POST /archivo/expedientes/` | `ExpedienteViewSet.perform_create` (`views.py:91-95`) | Solo `IsAuthenticated` | `ArchivoPage.tsx:43-44`, `VincularExpedienteModal.tsx:49-63` | Ninguno |
| Abrir (queda abierto por defecto) | — (implícito al crear, `estado` default `'abierto'`) | — | — | — | Ninguno |
| Vincular documento | `POST /archivo/expedientes/{id}/agregar_documento/` | `views.py:97-116` | Solo `IsAuthenticated` | `VincularExpedienteModal.tsx` (⚠️ ruta rota, §6) | Ninguno |
| Desvincular documento | **No existe** | — | — | — | — |
| Ordenar documentos | Parcial (`orden_foja` en el body de `agregar_documento`) | `views.py:102` | — | Nunca lo envía la UI | Ninguno |
| Consultar | `GET /archivo/expedientes/`, `GET .../{id}/` | `get_queryset` sin filtro de ACL | Solo `IsAuthenticated` | `ArchivoPage.tsx`, `CicloVitalPage.tsx` | Ninguno |
| Cerrar | `POST /archivo/expedientes/{id}/cerrar/` | `views.py:129-137` (exige `expurgado` y `foliado`) | Solo `IsAuthenticated`; bypasseable por PATCH genérico | `ArchivoPage.tsx:172` | Ninguno |
| Bloquear (impedir edición tras cerrado) | **No existe** enforcement | — | — | — | — |
| Reabrir | **No existe** acción dedicada; posible por PATCH genérico sin control | — | — | — | — |

---

## 14. UN DOCUMENTO EN CUÁNTOS EXPEDIENTES

- **Constraint de BD:** ninguno. `arc_expediente_doc` no tiene `unique_together` ni
  `UniqueConstraint` sobre `(expediente, documento)` (confirmado en
  `archivo/migrations/0001_initial.py` y `0002_...py` — solo hay `unique_together` en
  `TransferenciaExpediente` y `BajaExpediente`, no en `ExpedienteDocumento`).
- **Regla de servicio:** ninguna — `agregar_documento` hace `ExpedienteDocumento.objects.create()`
  directo, sin verificar existencia previa.
- **¿FK o M2M?** Es una tabla puente manual con **dos FK independientes** (`expediente`,
  `documento`), sin `ManyToManyField` declarado y sin restricción de unicidad — funcionalmente
  equivale a una relación N:M sin ningún control de integridad de negocio.
- **Comportamiento actual documentado, no decidido:** hoy un mismo `Documento` **puede** estar en
  0, 1 o N `Expediente`s simultáneamente, y puede repetirse más de una vez dentro del mismo
  `Expediente` (dos filas `ExpedienteDocumento` idénticas). No hay ninguna validación que lo
  impida en ningún punto del código.

---

## 15. ORDEN ORIGINAL

- `ExpedienteDocumento.orden_foja` es un `IntegerField(null=True, blank=True)`
  (`archivo/models.py:181`).
- `Meta.ordering = ['orden_foja', 'agregado_en']` (`archivo/models.py:187`) — Postgres ordena los
  `NULL` al final en ASC, así que en la práctica, como **ningún llamador real fija `orden_foja`**
  (ni `VincularExpedienteModal`, ni el flujo de digitalización masiva), todas las filas quedan con
  `orden_foja=NULL` y el orden final resultante es efectivamente **cronológico por
  `agregado_en`** — es decir, orden de incorporación, no un "orden original" deliberado y
  reordenable.
- **No existe ninguna UI que permita arrastrar/reordenar/asignar manualmente `orden_foja`.**
- Conclusión explícita: **el sistema ordena dinámicamente por fecha de agregado, no por un campo
  de secuencia mantenido intencionalmente**, aunque el campo para hacerlo ya existe en el modelo
  (🟡 PARCIAL, no 🔴, porque la infraestructura de datos está lista — falta solo la UI/servicio).

---

## 16. CIERRE DEL EXPEDIENTE

> **[F3-A] Bypass cerrado.** El `PATCH /archivo/expedientes/{id}/` usa ahora
> `ExpedienteActualizarSerializer` (whitelist de campos ordinarios); `estado`, `fecha_cierre`,
> `expurgado`, `fecha_expurgo`, `foliado`, `fecha_foliacion`, `categoria_actual`, `num_fojas` y
> `codigo_expediente` ya **no** son modificables por PUT/PATCH — solo por sus acciones dedicadas.
> Sigue sin existir una acción `reabrir` formal (diferido). Lo que sigue describe el estado previo.

- Búsqueda de `cerrado|fecha_cierre|estado|cerrar_expediente|reabrir` → resultados:
  `Expediente.estado` (choices, incluye `'cerrado'`), `Expediente.fecha_cierre`,
  `ExpedienteViewSet.cerrar` (`views.py:129-137`). **`reabrir`: 0 resultados en todo el repo.**
- **Qué bloquea realmente un cierre:** la acción dedicada `cerrar` exige
  `expediente.expurgado and expediente.foliado`, si no → `400`. Esto **sí es enforcement real**,
  no solo un booleano decorativo, **cuando se usa esa acción específica**.
- **Pero:** como se documentó en la matriz (N-011) y en §13, `estado` es un campo normal y
  editable dentro de `ExpedienteListSerializer` (usado también para `update`/`partial_update`
  porque `get_serializer_class` solo distingue `create` y `retrieve`, `views.py:84-89`), sin
  `read_only_fields` que lo proteja. Por tanto: **`PATCH /archivo/expedientes/{id}/
  {"estado":"cerrado"}` cierra el expediente saltándose expurgo y foliación por completo**, y el
  mismo mecanismo permite "reabrir" (`estado:"abierto"`) sin ninguna restricción, aunque no exista
  una acción `reabrir` formal.
- **Veredicto exacto que pedía la auditoría:** *"cerrado" NO es solo un booleano sin enforcement
  backend* — hay un enforcement real en la acción `cerrar`, pero **es evitable** por la vía
  genérica del mismo ViewSet → clasificado 🟡 PARCIAL, con el matiz preciso documentado.

---

## 17. EXPURGO Y FOLIACIÓN

- **Expurgo** (`expurgado`, `fecha_expurgo`, acción `expurgar` en `views.py:139-145`): la acción
  solo pone `True` + fecha. **No hay ningún procedimiento capturado** (qué se depuró, cuántos
  documentos, motivo, quién lo hizo) — es un interruptor, no un registro de la depuración física.
  → capacidad de **registrar que ocurrió**, no de **controlar el proceso**.
- **Foliación** (`foliado`, `fecha_foliacion`, `num_fojas`, acción `foliar` en
  `views.py:147-156`): igual que expurgo, es un interruptor con un número opcionalmente
  sobrescribible. **El número por defecto (`num_fojas`) se calcula como
  `exp.documentos.count()`** en `agregar_documento` (`views.py:114-115`) y en digitalización
  masiva (`documentos/views.py:2343-2344`) — es decir, **"número de fojas" = "número de
  documentos/filas vinculadas"**, que no es lo mismo que el número real de hojas físicas
  (un documento puede tener 1 o 40 páginas). Este es el hallazgo ⚠️ MODELO CONCEPTUAL INADECUADO
  de N-014.
- **Separación exigida por la auditoría — procedimiento físico vs. capacidad del sistema:**
  el sistema **sí tiene** capacidad de registrar "expurgado: sí/no" y "foliado: sí/no" con fecha,
  pero **no tiene** capacidad de controlar/auditar el procedimiento físico en sí (qué se depuró,
  qué folio corresponde a qué hoja de qué documento). Eso es ❓ NO VERIFICABLE por software —
  depende de un procedimiento institucional que el sistema no modela.

---

## 18. INVENTARIO — comparación de campos

| Campo exigido | EXISTE / DERIVABLE / NO EXISTE | Detalle |
|---|---|---|
| Sección | DERIVABLE | `expediente.serie.seccion` |
| Subsección | DERIVABLE (si aplica) | `expediente.serie.seccion.seccion_padre` |
| Serie | EXISTE | `expediente.serie` (FK directa) |
| Subserie | EXISTE/DERIVABLE | si `serie` es en sí una subserie |
| Descripción | EXISTE | `expediente.descripcion` |
| Número de expediente | EXISTE | `expediente.codigo_expediente` |
| Fecha apertura | EXISTE | `expediente.fecha_inicio` (no automática) |
| Fecha cierre | EXISTE | `expediente.fecha_cierre` (automática solo vía acción `cerrar`) |
| Valor (primario/secundario) | NO EXISTE | ver N-031 |
| Acceso | NO EXISTE en `Expediente`; DERIVABLE de `Serie.condicion_acceso` (no heredado automáticamente, no enforced) | ver N-020 |
| Plazo | DERIVABLE | `expediente.fecha_limite_categoria` (property calculada, no almacenada) |
| Destino final | DERIVABLE | `expediente.serie.disposicion_final` |
| Fojas | EXISTE, pero mal calculado | `expediente.num_fojas` — ver N-014 |
| Tomo | EXISTE (texto libre) | `expediente.numero_parte` |
| Caja | EXISTE (texto libre) | `expediente.numero_caja` |
| Soporte | EXISTE | `expediente.soporte` |
| Ubicación topográfica | EXISTE (texto libre, no estructurado) | `expediente.ubicacion_fisica` |
| Observaciones | NO EXISTE campo específico | `descripcion` podría usarse informalmente, pero no hay un campo "observaciones" separado |

**No se confunde** "derivable" con "almacenado históricamente": todos los campos marcados
DERIVABLE se calculan **al momento de la consulta**, contra el estado actual de `Serie`/`Seccion`
— si la Serie cambia su `disposicion_final` mañana, el "destino final" de expedientes ya cerrados
hace años cambiaría retroactivamente en cualquier reporte que lo derive así (mismo patrón de
riesgo que N-007).

---

## 19. TABLA DE PLAZOS DE CONSERVACIÓN — funcional, no dormida

`Serie.anos_gestion` (default 2), `anos_central` (default 13), `base_legal` (texto),
`disposicion_final` (conservación/eliminación), `tecnica_seleccion` (completa/parcial/N/A) —
todos editables desde `CuadroClasificacionPage.tsx` vía `SerieViewSet`. La property
`Expediente.fecha_limite_categoria` (`archivo/models.py:163-174`) calcula la fecha de
transferencia sumando `anos_gestion` o `anos_central` a `fecha_cierre` según `categoria_actual`.
`ExpedienteListSerializer.dias_para_expurgo` calcula días restantes. **Es funcional**, no un
campo suelto sin usar — pero es **pasiva** (nada la consulta proactivamente para generar una
alerta; ver N-045).

---

## 20. CICLO VITAL

`Expediente.categoria_actual` modela explícitamente las 4 categorías
(gestión/central/intermedio/histórico) — **no** se usa `Documento.estado` ni las bandejas como
sustituto; es un campo propio y dedicado. Pero el ciclo **no está completamente cableado**:

- `gestion` → `central`: la acción `transferir` cambia `estado='transferido'` pero **no**
  `categoria_actual` (bug/gap confirmado, `views.py:158-163`).
- `central` → `intermedio`, `intermedio` → `historico`: **ningún código los alcanza jamás.**
- `Baja` no cambia `categoria_actual`/`estado` del Expediente en absoluto —
  `BajaDocumentalViewSet.perform_create` (`views.py:209-213`) solo crea filas `BajaExpediente`,
  sin tocar el Expediente relacionado.

---

## 21. TRANSFERENCIA PRIMARIA / 22. SECUNDARIA / FINAL

Un único modelo `Transferencia` cubre los tres tipos (`tipo` choices `primaria/secundaria/final`)
+ `TransferenciaExpediente` como inventario de qué expedientes se mueven
(`signatura_topografica` de destino). Flujo auditado:

| Elemento | ¿Existe? |
|---|---|
| Solicitud | Sí — `Transferencia(estado='solicitada')`, `fecha_solicitud`, `solicitado_por` |
| Inventario | Sí — `TransferenciaExpediente` (M2M vía tabla puente, con `unique_together`) |
| Revisión/cotejo | Sí, como estado (`'revisada'`) + `revisado_por` + `fecha_revision`, pero **sin ningún endpoint dedicado** que ejecute la transición — solo editable por PATCH genérico |
| Aprobación/aceptación | Sí, como estado (`'aceptada'`) + `fecha_aceptacion`, mismo matiz |
| Recepción | No hay un paso de "recepción" distinto de "aceptada" |
| Cajas | No — `TransferenciaExpediente` no tiene número de caja propio (usa `signatura_topografica` de texto libre) |
| Ubicación destino | Sí, texto libre (`signatura_topografica`) |
| Fechas | Sí (`fecha_solicitud`, `fecha_revision`, `fecha_aceptacion`) |
| Responsables | Sí (`solicitado_por`, `revisado_por`) |
| Histórico | Sí, la fila persiste (sin trigger de `aud_log`, ver §17 de esta auditoría más abajo) |

Todo el flujo de estados de `Transferencia` (`borrador→solicitada→revisada→aceptada/rechazada`)
existe como **enum**, con UI en `CicloVitalPage.tsx`, pero **sin ninguna acción de backend
dedicada por transición** (a diferencia de `Expediente.cerrar`) — todas las transiciones de
estado se hacen con `PATCH` genérico, sin validar la secuencia (se podría pasar de `'borrador'`
a `'aceptada'` directamente sin pasar por `'solicitada'`/`'revisada'`).

**Secundaria/Final:** mismo modelo, mismas brechas — no se diseñó nada adicional, tal como pedía
la instrucción de no diseñar todavía; se documenta el estado tal cual.

---

## 23. VALORACIÓN / PREVALORACIÓN

- No existen campos `valor_documental`/`valor_primario`/`valor_secundario`/`prevaloracion`
  independientes.
- `BajaDocumental` cumple el rol de "Ficha Técnica de Prevaloración" (Art. 45 † — confirmar) con
  `caracter_proceso`, `justificacion`, `normativa_legal`, `numero_expedientes`, `numero_cajas`,
  `metros_lineales` — campos estructurados reales, no un placeholder.
- **¿Puede un usuario decidir eliminación sin flujo formal?** El *modelo* de `BajaDocumental`
  exige pasar por sus propios estados (`borrador→valorada→enviada_validacion→dictaminada→
  ejecutada`), pero — igual que `Transferencia` — **no hay ninguna acción de backend que valide la
  secuencia de transición**; todo es `PATCH` genérico sobre `BajaDocumentalSerializer`, que
  incluye `estado` como campo editable sin restricciones (`serializers.py:202-216`, sin
  `read_only_fields`). Así que sí: **hoy nada impide marcar una Baja directamente como
  `'ejecutada'` sin haber pasado por `'dictaminada'`.** Lo que sí es cierto es que, aunque se
  marque `'ejecutada'`, **el sistema no elimina nada por sí mismo** (ver §12 siguiente) — el
  campo es un rótulo, no un disparador.

---

## 24. DELETE / ELIMINACIÓN — auditoría CRÍTICA

Búsqueda exhaustiva de `.delete()` y cascadas en todo el repo relacionadas con archivo/expediente:

| Punto | Qué hace | Evidencia |
|---|---|---|
| `DELETE /archivo/expedientes/{id}/` | **Hard delete real** vía `ModelViewSet.destroy()` (no hay `destroy()` sobrescrito) | `ExpedienteViewSet` no override `destroy` → comportamiento DRF por defecto |
| Protección indirecta | Si el Expediente tiene `Transferencia`, `Baja`, `Préstamo` o `CopiaCertificada` asociados (todos `on_delete=PROTECT` hacia `Expediente`), el DELETE fallará con `ProtectedError` — **no gestionado explícitamente**, DRF lo devolvería como error 500 no controlado, no un 409 claro | `archivo/models.py:235,289,306,328` |
| Si el Expediente NO tiene esas relaciones | El DELETE se ejecuta limpio, y en cascada borra sus filas `ExpedienteDocumento` (`on_delete=CASCADE` desde `Expediente`, `models.py:178`) — **pero el `Documento` referenciado NUNCA se borra** (`documento` es `SET_NULL`, no `CASCADE`) | `archivo/models.py:179` |
| `DELETE /archivo/fondos/{id}/`, `/secciones/{id}/`, `/series/{id}/` | Mismo comportamiento — hard delete sin gate de negocio, protegido solo indirectamente por `PROTECT` en cascada | `views.py` (ModelViewSet estándar en las 4 clases) |
| `DELETE` sobre `Documento` (`eliminar_definitivo`, app `documentos`) | **SÍ está protegido explícitamente contra archivo:** antes de `doc.delete()`, verifica `ExpedienteDocumento.objects.filter(documento=doc).exists()` y devuelve `400` si el documento está vinculado a un expediente | `documentos/views.py:780-785` — hallazgo POSITIVO, único gate cruzado real entre las dos apps |
| Baja documental "ejecutada" | **No dispara ningún `.delete()`** en ningún lado del código — confirmado, cero resultados de `.delete()` relacionados con `BajaDocumental`/`BajaExpediente` | grep exhaustivo en `apps/archivo/` |

**Distinción exigida por la auditoría, aplicada:**
- **Eliminación técnica (DELETE HTTP/ORM):** existe y es real para `Fondo`/`Sección`/`Serie`/
  `Expediente`, sin control de negocio.
- **Papelera / soft-delete:** `Expediente.estado='eliminado'` es un **valor de enum que existe
  pero, igual que `intermedio`/`historico` en `categoria_actual`, ningún código de este repo lo
  asigna jamás** — es un 🟠 DORMIDO más. No hay una acción `eliminar()` (soft) equivalente a
  `cerrar()`/`expurgar()`/`foliar()`.
- **Desactivación:** `Fondo.activo`, `Seccion.activo`, `Serie.activo` sí existen como booleanos,
  pero ningún endpoint los expone como una acción dedicada de desactivación (son campos
  editables por PATCH genérico como cualquier otro).
- **Baja documental autorizada:** existe el *modelo* del flujo, pero como se documentó, **no
  ejecuta ninguna eliminación real** — es, en la práctica actual, un registro administrativo sin
  efecto técnico. Esto significa, en términos de riesgo: **hoy el DELETE HTTP crudo sobre
  Expediente es, de hecho, MÁS "efectivo" para borrar datos que el proceso formal de Baja
  Documental**, que es justo el patrón inverso al que exige la Regla Técnica. Es el hallazgo más
  importante de esta sección.

---

## 25. ARCHIVO FÍSICO

Búsqueda de `Repositorio|Zona|Estantería|Bandeja(física)|Caja|Ubicación topográfica|Signatura|
Archivo físico` → **ningún modelo dedicado**. Solo 3 campos de texto libre repartidos en 2
modelos:

| Campo | Modelo | Tipo |
|---|---|---|
| `ubicacion_fisica` | `Expediente` | `CharField(200)` |
| `numero_caja` | `Expediente` | `CharField(30)` |
| `signatura_topografica` | `TransferenciaExpediente` | `CharField(60)` |

- **Jerarquía:** ninguna (no hay Zona→Estantería→Caja).
- **CRUD:** no aplica (son campos de texto dentro de otros modelos, no entidades propias).
- **Permisos:** los mismos (ausentes) del resto de `archivo`.
- **Vínculo a Expediente:** sí, directo (son campos del propio `Expediente`).
- **Vínculo a Documento:** no — la ubicación física se registra a nivel de Expediente, nunca a
  nivel de Documento/página individual.

---

## 26. PRÉSTAMO

`PrestamoDocumental` (`archivo/models.py:298-322`): `expediente`, `solicitante`,
`autorizado_por` (opcional), `fecha_prestamo` (auto), `fecha_devolucion_esperada` (obligatoria),
`fecha_devolucion_real`, `estado` (activo/devuelto/vencido/extraviado), `observaciones`.

- **Es un préstamo formal de expediente FÍSICO** (referencia siempre a `Expediente`, no a
  `Documento` suelto) — **no se confunde** con compartir un documento digital ni con reasignar:
  es un modelo distinto, sin relación con `BandejaDocumento`/`reasignar_a` de `documentos`.
  Verificado: `apps.archivo` no importa nada de `servicios_bandeja`.
- **Devolución:** SÍ funcional — `PrestamosCopiasCertificadasPage.tsx:19-24` implementa
  `devolver()` como `PATCH /archivo/prestamos/{id}/ {estado:'devuelto',
  fecha_devolucion_real:hoy}`. Nota: usa un servicio *local* al componente
  (`const prestamosService = {...}` definido inline en la página, líneas 14-25), **duplicado**
  con `archivoService.listarPrestamos/crearPrestamo/actualizarPrestamo` de
  `archivo.service.ts:236-241` (que no tiene `devolver`, aunque el backend lo soportaría igual
  vía `actualizarPrestamo`).
- **Prórroga:** el modelo no tiene ningún campo ni acción de prórroga. `estado='vencido'` existe
  en el enum pero **nada lo calcula automáticamente** comparando `fecha_devolucion_esperada` con
  hoy — el frontend sí lo calcula solo para colorear la fila (`p.estado === 'activo' &&
  p.fecha_devolucion_esperada < hoy`, `PrestamosCopiasCertificadasPage.tsx:329`), pero **el campo
  `estado` en BD nunca cambia solo a `'vencido'`** — es un cálculo de presentación, no un estado
  persistido.

---

## 27. EXPEDIENTE ELECTRÓNICO — relación con Arts. 69-75 †

*(† rango de artículos no incluido en la lista de verificación de F3-A — confirmar contra el
Acuerdo SGPR-2019-0107.)*

El SGDA **sí** cumple, a nivel del `Documento` individual (app `documentos`, ya auditada
extensamente en fases previas), varios de los requisitos de expediente electrónico:

| Requisito (69-75) | ¿Lo cumple `Documento`? | Evidencia |
|---|---|---|
| Documentos electrónicos | Sí | `Documento` + `AdjuntoDocumento` |
| PDF oficial | Sí | `pdf_oficial.py` — congelado inmutable al enviar/firmar |
| Anexos | Sí | `AdjuntoDocumento` |
| Firma | Sí | `firma_bce_info` (JSONField), integración P12/FirmaEC |
| Metadata | Sí, parcial | ver §28 |
| Identidad | Sí | `uuid`, `numero_documento` |
| Integridad | Sí | `hash_sha256`, `hash_integridad` en `AdjuntoDocumento` |
| Acceso | Parcial | ACL F2-E (`documentos_visibles_para`), pero `confidencial` no aplicado |
| Auditoría | Sí (a nivel Documento) | trigger `trg_auditoria_doc_documento` + `SeguimientoDocumento` |
| Búsqueda | Sí | full-text en adjuntos (`doc_adjunto.contenido_busqueda`) |
| Preservación | Sí, para el PDF oficial (congelado, no regenerable) | `pdf_oficial.py` |

**Pero a nivel de `archivo.Expediente` específicamente**, ninguno de estos mecanismos se hereda ni
se re-verifica: un `Expediente` con `soporte='digital'` no obliga a que sus
`ExpedienteDocumento.documento` tengan PDF oficial congelado, ni valida integridad/hash a nivel
de expediente, ni preserva el conjunto como una unidad — la preservación ocurre documento por
documento en la app `documentos`, no como propiedad del expediente electrónico en sí.

---

## 28. METADATOS MÍNIMOS — `Documento` vs. lista exigida

| Metadato exigido | Campo SGDA | Directo/Derivable/Ausente |
|---|---|---|
| Título | `asunto` | Directo |
| Número de registro | `numero_documento` (+ `numero_secuencial`, `uuid`) | Directo |
| Fecha | `fecha_elaboracion`, `fecha_firma`, `fecha_envio`, `fecha_recepcion`, `fecha_archivo` | Directo (múltiples fechas de ciclo) |
| Descripción | `resumen`, `cuerpo` | Directo |
| Tipo | `tipo_documento` (FK) | Directo |
| Carácter reservado/confidencial | `confidencial` (bool) | Directo, pero **no aplicado** (🟠 DORMIDO, ver N-020) |
| Versión | `VersionDocumento` (modelo dedicado, `numero_version` único por documento) | Directo |
| Número de hojas | `num_paginas` | Directo |

Todos existen como campo directo — el único ausente/no-funcional es la **aplicación real** de
`confidencial`.

---

## 29. SEGURIDAD

> **[F3-A + F3-A.1 — 2026-09-07] RESUELTO.** Los dos hallazgos de esta sección se cerraron:
> (1) toda la API `/archivo` exige ahora el módulo de permisos `archivo` (`PermisoModulo` en
> `_ArchivoViewSetBase`); (2) `ExpedienteViewSet.retrieve` calcula `documentos_visibles_para`
> y `ExpedienteDocumentoSerializer` enmascara los nodos no visibles a **exactamente
> `{id, acceso_restringido:true}`** (sin documento, trámite, `agregado_por` ni timestamps —
> el `id` es el de la relación). Un nodo que apunta a un `Tramite` es **fail-closed** (no
> existe ACL central de lectura de Tramite; F3-A.1 no la crea → F3-B).
> `agregar_documento` rechaza (404) vincular un documento sin ACL. Lo que sigue describe el
> estado **anterior** a F3-A.

- **Política central de lectura documental:** `apps.documentos.acl_documentos
  .documentos_visibles_para(usuario)` — ya auditada y verificada en fases previas de este proyecto
  (F2-E): filtra por `creado_por`/`remitente`/`firmado_por`/`Destinatario`/`BandejaDocumento`, con
  bypass para admin (`ADMIN_GENERAL`/`RESPONSABLE_ARCHIVO`/superuser).
- **¿La pertenencia a un Expediente implica acceso automático?** — **Sí implica una fuga real,
  aunque no por diseño de la ACL de `documentos` sino por ausencia total de ACL en `archivo`.**
  `GET /archivo/expedientes/{id}/` usa `ExpedienteDetalleSerializer`, que incluye
  `documentos = ExpedienteDocumentoSerializer(many=True)`
  (`archivo/serializers.py:68`), y `ExpedienteDocumentoSerializer` expone
  `documento_numero`/`documento_asunto` (`archivo/serializers.py:22-23`) **sin ningún filtro por
  `documentos_visibles_para`**. `ExpedienteViewSet.get_queryset` (`views.py:81-82`) no aplica
  ningún filtro de usuario — devuelve **todos** los expedientes a **cualquier** usuario
  autenticado. Esto significa: un usuario sin ninguna relación con un `Documento` confidencial
  puede, si ese documento está vinculado a *cualquier* expediente, leer su número y asunto
  simplemente listando/abriendo ese expediente por API. **Es exactamente la fuga que la
  auditoría pedía verificar explícitamente, y está confirmada con evidencia de línea.**
- **Otras ACL de Archivo/Expediente:** no existen — ninguna vista de `archivo` filtra por unidad,
  por rol, ni por relación del usuario con el expediente.

---

## 30. AUDITORÍA (trazabilidad)

Verificado contra la base de datos real (`information_schema.triggers`, no solo el código):

| Tabla | Trigger `fn_auditoria` (`aud_log`) |
|---|---|
| `arc_expediente` | ✅ Sí |
| `arc_fondo` | ❌ No |
| `arc_seccion` | ❌ No |
| `arc_serie` | ❌ No |
| `arc_expediente_doc` | ❌ No |
| `arc_transferencia` | ❌ No |
| `arc_transferencia_exp` | ❌ No |
| `arc_baja_documental` | ❌ No |
| `arc_baja_exp` | ❌ No |
| `arc_prestamo` | ❌ No |
| `arc_copia_certificada` | ❌ No |
| `doc_documento` (referencia, app `documentos`) | ✅ Sí |
| `doc_carpeta_virtual` / `doc_documento_carpeta` (F2-F, referencia) | ✅ Sí |

**Qué operaciones archivísticas quedan hoy registradas:** solo los cambios directos sobre la fila
`Expediente` (crear/cerrar/expurgar/foliar/transferir, porque todas pasan por `.save()` sobre esa
fila). **Todo lo demás —crear una Serie, vincular/desvincular un documento, crear una
Transferencia o una Baja, prestar o devolver un expediente, emitir una copia certificada— no deja
ningún rastro en `aud_log`.** `SeguimientoDocumento` (el "Recorrido" de `documentos`) tampoco
registra nada de esto: su `ETAPA_CHOICES` no tiene ninguna etapa relacionada con Archivo/Expediente
(verificado, lista completa en §3 del modelo — sin `vinculado_expediente` ni equivalente).

---

## 31. MIGRABILIDAD (sin implementar nada)

| Información histórica QUIPUX | ¿Tiene destino hoy en el modelo SGDA? |
|---|---|
| Clasificación (cuadro) | Sí — `Fondo`/`Seccion`/`Serie` tienen campos suficientes para recibir un cuadro de clasificación migrado (código, nombre, jerarquía) |
| Expedientes | Sí, parcialmente — `Expediente` tiene campos para casi todo, pero **no tiene destino para "condición de acceso" propia** (solo heredable de Serie, no copiable) ni para un histórico de a qué unidad perteneció en cada momento (ver N-007) |
| Archivo físico (ubicación) | Parcial — solo 3 campos de texto libre, sin estructura para importar una jerarquía real de repositorios/cajas con IDs propios |
| Retención | Sí — `Serie` tiene los campos de TPCD listos |
| Transferencias | Sí, estructuralmente — pero sin destino para pasos intermedios que QUIPUX pudiera tener y este modelo no distinga (todo colapsa a 3 tipos + 5 estados genéricos) |
| Ejecución real de una baja histórica | **Sin destino real** — el modelo `BajaDocumental` puede *registrar* que una baja ya ocurrió (fechas, justificación), pero no hay ningún campo que distinga "esto es un registro histórico importado" de "esto es una baja pendiente de ejecutar hoy" — mezclaría datos históricos con el flujo operativo activo si se migrara sin cuidado |
| Auditoría histórica de cambios en expedientes/series | **Sin destino** — `aud_log` solo captura desde que el trigger se creó hacia adelante; no hay campo para "log histórico importado" |

No se marca ninguna decisión de migración — solo se deja constancia de qué datos, hoy, "caerían al
piso" (sin campo/tabla que los reciba) si se migraran sin diseño adicional: **condición de acceso
histórica por expediente, jerarquía real de ubicación física, y distinción entre registro
histórico vs. operativo activo en Bajas/Transferencias.**

---

## 32. MODELO NORMATIVO MÍNIMO (conceptual — NO implementado, solo referencia)

```
Fondo
 └── Sección
      └── Subsección (opcional)
           └── Serie
                └── Subserie (opcional)
                     └── Expediente
                          └── Documentos

Expediente
 → Archivo de Gestión
 → Archivo Central
 → Archivo Intermedio
 → Archivo Histórico / Baja
```

Comparado con el §3 (modelo real): el SGDA **sí tiene** todas las cajas de este diagrama
representadas como modelos reales — la diferencia no es de nomenclatura/existencia, sino de
**completitud del enforcement** en las transiciones de la segunda mitad del diagrama (el ciclo
vital Gestión→Central→Intermedio→Histórico/Baja), como ya se documentó en §20.

---

## 33. MATRIZ DE BRECHAS

| ID | Requisito normativo | Art. | Estado SGDA | Evidencia | Gap | Severidad |
|---|---|---|---|---|---|---|
| G-01 | Seguridad — módulo `archivo` sin enforcement de permisos | — | ✅ **CERRADA [F3-A]** | `usuarios/permisos.py` `PermisoModulo` + `archivo/views.py` `_ArchivoViewSetBase` en los 8 ViewSets; tests `PermisosModuloTest` (anon 401, sin permiso 403 en list/detalle/POST/PATCH/DELETE/@action, GESTOR sin `eliminar`, RESPONSABLE con `eliminar`, ADMIN/superuser total) | RESUELTA | ~~CRÍTICA~~ |
| G-02 | Fuga de metadatos de Documento vía Expediente sin ACL | Art. 66 † | ✅ **CERRADA [F3-A + F3-A.1]** | `ExpedienteViewSet.retrieve` → contexto `documentos_visibles_ids` (F2-E `documentos_visibles_para`); `ExpedienteDocumentoSerializer.to_representation` → nodo restringido = **exactamente `{id, acceso_restringido:true}`** (sin documento/tramite/agregado_por/timestamps). **[F3-A.1]** el `id` es el de la relación, no del documento; un nodo que apunta a un `Tramite` es **fail-closed** (no existe ACL central de Tramite — RF-TRAM-011). `agregar_documento` rechaza (404) vincular un doc sin ACL. Tests `ACLDocumentalTest` (7) | RESUELTA. ACL real de Tramite = F3-B | ~~CRÍTICA~~ |
| G-03 | `estado` del Expediente editable sin gate de negocio | Art. 33 | ✅ **CERRADA [F3-A]** (respecto al bypass) | `ExpedienteActualizarSerializer` (whitelist: titulo/descripcion/fecha_inicio/soporte/ubicacion_fisica/numero_caja/numero_parte); `estado`/`fecha_cierre`/`expurgado`/`fecha_expurgo`/`foliado`/`fecha_foliacion`/`categoria_actual`/`num_fojas`/`codigo_expediente` ya NO editables por PUT/PATCH. Tests `PatchBypassTest` | RESUELTA el bypass. Sin `reabrir` formal = diferido | ~~ALTA~~ |
| G-04 | Ciclo vital incompleto (Intermedio/Histórico inalcanzables) | Arts. 11-16 † | 🟠 **DIFERIDA** | `models.py:108-113`; `views.py` `transferir` | `transferir()` no actualiza `categoria_actual`; nada alcanza `intermedio`/`historico`. **F3-A no lo toca** (§15) | **ALTA** |
| G-05 | Baja documental "ejecutada" no ejecuta nada | Art. 53 † | 🟡 **DIFERIDA** | sin `.delete()` relacionado en todo `apps/archivo` | **F3-A no implementa eliminación real** (§16). El DELETE crudo sí queda ahora restringido a `archivo:eliminar` (RESPONSABLE_ARCHIVO/ADMIN_GENERAL) | **ALTA** |
| G-06 | Documento en N expedientes sin control | — | 🔴 **DIFERIDA** | sin `unique_together` en `ExpedienteDocumento` | Requiere decisión archivística (1:N vs N:M). **F3-A no la toca** (§14) | **ALTA** |
| G-07 | `num_fojas` = conteo de documentos, no de fojas reales | Art. 35 | ⚠️ **DIFERIDA** | `views.py` `agregar_documento`/`foliar` | Modelo conceptual incorrecto de foliación. **F3-A no lo toca** (§13) | **MEDIA** |
| G-08 | Sin archivo físico estructurado (repositorio/caja) | Art. 38 † | 🔴 **DIFERIDA** | solo 3 `CharField` libres | — | **MEDIA** |
| G-09 | Sin alertas de plazos/vencimientos | Art. 46 | 🔴 **DIFERIDA** | `fecha_limite_categoria`/`dias_para_expurgo` de solo lectura | TPCD calculada pero pasiva | **MEDIA** |
| G-10 | Sin carátula ni etiqueta de caja | Arts. 37-38 | 🔴 **DIFERIDA** | sin resultados en el repo | — | **MEDIA** |
| G-11 | Auditoría desigual (`aud_log` solo en `arc_expediente`) | — | 🟡 **DIFERIDA** | verificado en `information_schema.triggers` | Series/Secciones/Transferencias/Bajas/Préstamos/Copias sin rastro. **F3-A no amplía triggers** (§17), pero no elimina la auditoría existente | **MEDIA** |
| G-12 | Transiciones de estado de Transferencia/Baja sin acción dedicada | Arts. 47-53 † | 🟡 **DIFERIDA** | solo PATCH genérico | **F3-A no toca Transferencias/Bajas** (§15/§16) | **MEDIA** |
| G-13 | `VincularExpedienteModal` — ruta rota + método de servicio duplicado | — | ✅ **CERRADA [F3-A]** | `archivo.service.ts`: eliminado `agregarDocumentoExpediente` (ruta con guion); `agregarDocumento` (guion bajo = ruta DRF real, verificada con `django.urls.resolve`) es la única fuente; el modal la usa; `crear()` ahora devuelve `id` (`ExpedienteCrearSerializer`) para encadenar. Test `test_ruta_agregar_documento_resuelve` | RESUELTA | ~~ALTA~~ |
| G-14 | `correoId` referencia app `correos` eliminada | — | ✅ **CERRADA [F3-A]** | `VincularExpedienteModal.tsx`: eliminados prop `correoId`, payload `correo_id`, `invalidateQueries(['correos'])`; `archivo.service.ts` sin `correo_id`. (`AdjuntosPanel.correoId` — residual análogo, distinto componente, fuera de alcance) | RESUELTA | ~~BAJA~~ |
| G-15 | Sin desvincular documento de expediente | Art. 39 † | 🔴 **DIFERIDA** | sin endpoint/acción | — | **MEDIA** |
| G-16 | Condición de acceso declarada y no aplicada (`Serie`/`Documento`) | Art. 66 † | 🟠 **DIFERIDA** (parcial) | `Serie.condicion_acceso` / `Documento.confidencial` sin enforcement | **F3-A cerró la variante concreta de fuga vía Expediente (G-02)**; el enforcement normativo general de `confidencial`/`condicion_acceso` sigue pendiente | **ALTA** |
| G-17 | Sin unicidad real de `Fondo` ("único por institución") | Arts. 28-30 | 🟡 **DIFERIDA** | `models.py:10-21` sin constraint | — | **BAJA** |
| G-18 | Procedencia (`Unidad`) sin snapshot histórico | — | ⚠️ **DIFERIDA** | `models.py:27,116`; `documentos/models.py:66-73` | Requiere rediseño (fase posterior) | **MEDIA** |
| G-19 | Digitalización masiva crea `ExpedienteDocumento` huérfanos (`documento=NULL`) | Art. 39 † | 🐛 **DIFERIDA** | `documentos/views.py:2336-2344` | Bug preexistente en `DigitalizacionMasivaView`; **F3-A no toca esa vista** (foliación/cardinalidad diferidas) | **MEDIA** |
| G-20 | Cobertura de tests de `apps.archivo` | — | 🟡 **PARCIALMENTE CERRADA [F3-A]** | `apps/archivo/tests.py` — 23 tests: permisos de módulo, ACL documental, `agregar_documento` (abierto+ACL), bypass de PATCH | Cobertura BASE de F3-A creada. NO exhaustiva (ciclo vital, baja, transferencias, foliación, cardinalidad sin tests) | ~~ALTA~~ → BAJA (residual) |

---

## 34. TIPO DE OBLIGACIÓN

| Requisito | Tipo |
|---|---|
| N-001..N-006 (Cuadro de Clasificación) | SISTEMA (ya construido, falta enforcement de permisos) |
| N-007 (procedencia histórica) | SISTEMA (requiere rediseño de snapshot) |
| N-008..N-015 (Expediente: campos, orden, cierre, foliación) | SISTEMA / MIXTO — los campos son sistema; la ejecución real de expurgo/foliación es procedimiento institucional que el sistema solo debería *registrar*, no *sustituir* |
| N-016 Carátula, N-017 Etiqueta de caja | SISTEMA (generación de documento) + PROCEDIMIENTO (imprimir y pegar físicamente) |
| N-018 Inventario, N-019 Guía de archivos | SISTEMA (exportación/reporte) |
| N-020 Condición de acceso | SISTEMA (falta aplicarlo en ACL) |
| N-021 Soporte | SISTEMA |
| N-022 TPCD | MIXTO — captura es sistema, la política de plazos en sí es institucional/legal |
| N-023..N-026 Archivo Gestión/Central/Intermedio/Histórico | MIXTO — el sistema modela la categoría, pero el traslado físico real de expedientes en papel es PROCEDIMIENTO/INFRAESTRUCTURA |
| N-027..N-029 Transferencias | MIXTO |
| N-030..N-032 Valoración/prevaloración | MIXTO — la ficha es sistema, el juicio de valor es institucional (comité de valoración) |
| N-033 Baja documental | MIXTO — el flujo de aprobación es sistema, la destrucción física/segura del papel es PROCEDIMIENTO |
| N-034 Préstamo | SISTEMA |
| N-035, N-036 Ubicación/archivo físico | PROCEDIMIENTO/INFRAESTRUCTURA (mobiliario, señalética) con un componente SISTEMA (registrar dónde está cada cosa) |
| N-037, N-038 Expediente electrónico/híbrido | SISTEMA |
| N-039 Metadatos | SISTEMA |
| N-040 Seguridad | SISTEMA |
| N-041 Auditoría | SISTEMA |
| N-042 Preservación | SISTEMA (con componente institucional de política de preservación a largo plazo) |
| N-043 Migración | SISTEMA (ETL) + PROCEDIMIENTO (decisión institucional de qué migrar) |
| N-044 Búsqueda | SISTEMA |
| N-045 Alertas | SISTEMA |

---

## 35. DEPENDENCIAS ENTRE BRECHAS (sin implementar, solo orden)

Usando las letras de la instrucción original:

```
A. Cuadro General de Clasificación  ──┐
                                       ├──> ya existe (Fondo/Sección/Serie) — base sólida
B. Fondo/Sección/Subsección  ─────────┘

C. Series/Subseries  ──> depende de B (ya satisfecho estructuralmente)

D. Unidad productora/procedencia  ──> requiere resolver G-18 (snapshot) ANTES de
                                        confiar en cualquier reporte histórico de A/B/C

E. Expedientes  ──> depende de C (ya satisfecho estructuralmente, pero con G-03/G-06/G-15
                     pendientes de cerrar antes de considerarlo confiable)

F. Orden/cierre  ──> depende de E — G-03 (cierre evitable) debe resolverse antes de que
                      "cerrado" signifique algo operativamente

G. Inventario  ──> depende de E + F (un inventario de expedientes mal cerrados/mal ordenados
                    no es confiable)

H. Tabla de Plazos  ──> YA existe, depende de C (ya satisfecho) — pero G-09 (alertas)
                         depende de que H exista, que ya es el caso

I. Archivo Gestión/Central/Intermedio/Histórico (ciclo vital)  ──> depende de E + G-04
                                                                    (hoy roto en la transición
                                                                    gestión→central)

J. Transferencias  ──> depende de E + F + I. HOY el modelo de Transferencia YA EXISTE, pero
                        según la dependencia normativa correcta, NO debería considerarse
                        funcionalmente confiable hasta cerrar G-04 (si `transferir()` no
                        actualiza `categoria_actual`, una Transferencia "aceptada" deja al
                        Expediente en un estado de ciclo vital inconsistente: `estado`
                        dice "transferido" pero `categoria_actual` sigue diciendo "gestión")

K. Valoración/Baja  ──> depende de C (disposición final de la Serie, ya existe) + de que
                         J (Transferencias) sea consistente, porque normalmente se da de baja
                         desde Archivo Central/Intermedio, no desde Gestión directamente —
                         hoy `BajaDocumental` no valida desde qué categoría viene el expediente
                         (G-12 aplica aquí también)

L. Préstamos  ──> depende de E (ya satisfecho, es el más completo funcionalmente de todo
                   el módulo)

M. Archivo físico  ──> hoy es prerrequisito débil de J y L (ubicaciones de texto libre ya
                        alcanzan para registrar algo, aunque no de forma estructurada)

N. Expediente electrónico/preservación  ──> depende de la app `documentos` (ya madura) +
                                             de que E exponga el estado de preservación de
                                             sus documentos vinculados (hoy no lo hace)
```

**Aplicando la advertencia de la instrucción:** en este SGDA **hoy ya existe** código de
Transferencia primaria sin que el ciclo vital (I) esté resuelto (G-04) — es decir, el propio
código actual reproduce el antipatrón que la instrucción pedía evitar ("no debería implementarse
Transferencia primaria antes de tener Serie/Subserie→Expediente→Cierre→TPCD"): la parte de
datos (Serie/TPCD/Expediente/Cierre) sí estaba antes, pero **el enforcement de Cierre (F, vía
G-03) y del ciclo vital (I, vía G-04) no se completó**, por lo que Transferencia quedó construida
sobre una base parcialmente sólida. No se propone corrección aquí — solo se documenta la
dependencia rota tal como se pidió.

---

## 36. CIERRE

**Estado del informe.** La auditoría original (2026-09-04) fue de solo lectura. La revisión
**F3-A / F3-A.1 (2026-09-07)** corrigió las referencias normativas del ciclo del expediente y
anotó las brechas intervenidas. Ver `F3A_SANEAMIENTO_ARCHIVO.md` para el detalle de los cambios
de código.

**Resumen de severidad de brechas — tras F3-A / F3-A.1:**
- ✅ **CERRADAS:** G-01, G-02 (eran CRÍTICA) · G-03 (ALTA, respecto al bypass PATCH) ·
  G-13 (ALTA) · G-14 (BAJA). G-20 pasa de ALTA a residual (29 tests de cobertura base).
- 🟠 **ABIERTAS / diferidas:**
  - ALTA: G-04 (ciclo vital), G-05 (baja documental), G-06 (cardinalidad), G-16 (enforcement
    normativo general de confidencialidad).
  - MEDIA: G-07 (foliación), G-08 (archivo físico), G-09 (alertas TPCD), G-10 (carátula/etiqueta),
    G-11 (auditoría completa), G-12 (flujos Transferencia/Baja), G-15 (desvinculación),
    G-18 (snapshot procedencia), G-19 (digitalización masiva).
  - BAJA: G-17 (unicidad de Fondo).
- **ACL de lectura de `tramites.Tramite` (RF-TRAM-011):** no existe hoy. **F3-A.1** la trata
  **fail-closed** — los nodos `ExpedienteDocumento` que apuntan a un `Tramite` se enmascaran a
  `{id, acceso_restringido:true}` para todos los roles (sin filtrar `tramite_id`/`numero_tramite`).
  La ACL real de Tramite (condición de acceso de Serie/Expediente) es **F3-B**.

DETENTE. No se inició ninguna implementación del módulo formal de Expedientes/Archivo.
