# Migración QUIPUX → SGDA: Carpetas Virtuales

> Referencia para el ETL futuro. **NO es lógica de runtime.** El ETL todavía
> no está implementado; este documento fija la equivalencia que deberá
> aplicarse cuando se construya.

## Qué son

Carpeta Virtual = **clasificación operativa** de una Unidad. NO es bandeja,
expediente, archivo físico/institucional, serie/subserie, retención ni copia
del documento. En QUIPUX corresponde al árbol de **carpetas de la dependencia**
(tablas `trd` / `trd_radicado` del QUIPUX comunitario), no al Cuadro de
Clasificación archivístico.

## Reglas funcionales SGDA (afectan al ETL)

- **R1 (RUNTIME) — los documentos EN ELABORACIÓN no se clasifican por
  endpoint** y **no se listan** en la vista compartida de la carpeta.
  QUIPUX **sí** permitía TRD sobre radicados en elaboración.
  **El ETL NO descarta esas clasificaciones históricas.** Migración integral
  = preservar el dato siempre que exista destino estructural:

  ```
  radicado QUIPUX en elaboración con clasificación TRD válida
     └─► el ETL global de documentos decide si migra ese radicado como Documento
          ├── SÍ  → crear también su DocumentoCarpetaVirtual (fila conservada)
          │         · el borrador NO aparece en la carpeta mientras siga en
          │           borrador/en_revision (runtime lo filtra)
          │         · si más adelante pasa a estado formal → la relación
          │           histórica se vuelve visible automáticamente
          └── NO  → tampoco se migra su clasificación (decisión del ETL
                    global de documentos, NO una pérdida de Carpetas Virtuales)
  ```

  El runtime NO permite crear/reclasificar un borrador (R1); solo el ETL
  puede insertar una `DocumentoCarpetaVirtual` sobre un documento en borrador.
- **R2 — administración del árbol solo ADMIN_GENERAL** en runtime; no afecta
  al ETL (el ETL crea el árbol directamente).
- **R4 — desactivación lógica.** Las carpetas QUIPUX inactivas (`trd` con su
  marca de inactiva, si existe) se importan con `activa=False`; no se
  descartan.
- **R5 — matriz de bandejas** (runtime): solo afecta a la clasificación
  *nueva* desde la UI; el ETL no la aplica.

## Equivalencia de tablas

| QUIPUX | SGDA |
|---|---|
| `trd` (nodo de carpeta de la dependencia) | `CarpetaVirtual` (`doc_carpeta_virtual`) |
| `trd.trd_padre` (jerarquía) | `CarpetaVirtual.padre` (FK self, misma unidad en toda la rama) |
| `trd.depe_codi` (dependencia dueña) | `CarpetaVirtual.unidad` → **ver §Dependencias** |
| `trd_radicado` (radicado ↔ carpeta) | `DocumentoCarpetaVirtual` (`doc_documento_carpeta`) |
| `trd_radicado.radi_nume_radi` (fila técnica) | `DocumentoCarpetaVirtual.documento` → **vía MAPA** |

## FASE A — dependencia dueña de la carpeta

`QUIPUX.depe_codi  →  SGDA.organizacion.Unidad`

Usar el mismo mapa `depe_codi → Unidad` que el resto del ETL de QUIPUX
(organigrama). Si una `depe_codi` no tiene Unidad SGDA equivalente:
**marcar la carpeta para revisión ETL** — no adivinar la unidad, no colgarla
de otra. Toda la rama (padre→hijos) debe quedar en UNA sola unidad; si el
árbol QUIPUX mezcla dependencias en una rama (no debería), partir la rama por
dependencia y registrar la incidencia.

## FASE B — identidad del documento clasificado

`trd_radicado` referencia **filas técnicas `radicado`** (`radi_nume_radi`),
no documentos lógicos. QUIPUX genera varias filas por documento (original +
1 copia por destinatario + externas — ver `MIGRACION_QUIPUX_ASOCIADOS.md`).

El ETL debe:

```
trd_radicado.radi_nume_radi
   └─► fila radicado QUIPUX
        └─► MAPA fila técnica → Documento lógico SGDA   (el mismo de Docs. Asociados)
             └─► DocumentoCarpetaVirtual.documento
```

- **NUNCA** crear un `DocumentoCarpetaVirtual` por cada copia técnica del
  mismo documento lógico.
- La regla de BD `(documento, unidad)` único hace que, si varias filas
  técnicas del mismo documento lógico están en carpetas distintas **de la
  misma dependencia**, haya que **resolver el conflicto**: elegir una
  (p. ej. la de la fila original, sufijo `0`) y registrar la incidencia. Si
  están en carpetas de dependencias distintas → son clasificaciones
  independientes y ambas se conservan (una fila por unidad).

## FASE B — jerarquía y nombres

- Reconstruir `padre` con `trd.trd_padre` **después** de crear todos los nodos.
- Normalizar nombres duplicados entre hermanos (SGDA exige
  `unidad + padre + nombre_norm` único, sin distinción de mayúsculas/espacios).
  Si QUIPUX tiene hermanas homónimas, renombrar la segunda (`"X (2)"`) y
  registrar la incidencia.
- Prevención de ciclos: igual que el runtime (`servicios_carpeta._validar_padre`).

## Datos históricos a conservar

- nombre de carpeta;
- jerarquía (`padre`);
- unidad/dependencia;
- relaciones documento↔carpeta (una por documento lógico y unidad);
- usuario que clasificó (`DocumentoCarpetaVirtual.asignado_por`) **cuando el
  usuario QUIPUX pueda mapearse** a un `Usuario` SGDA; si no, dejar NULL;
- fecha de asociación (`asignado_en`) **solo si QUIPUX la almacena** en
  `trd_radicado` y fue confirmada. **No inventar fechas** — si no existe,
  `asignado_en` = fecha de ejecución del ETL y se documenta como tal.

## Trazabilidad — DECISIÓN SGDA (no equivalencia con QUIPUX)

Lo que la auditoría QUIPUX específica de **Carpetas Virtuales / TRD** confirmó:

| Acción QUIPUX (Carpetas Virtuales / TRD) | ¿genera `hist_eventos_radicados`? |
|---|---|
| Clasificar un documento en una Carpeta Virtual — **individual** | **Sí — transacción 32** |
| Clasificar documentos en una Carpeta Virtual — **lote** | **Sí — transacción 88** |
| Crear / renombrar / eliminar estructura TRD | **No** (en el código auditado) |

**SGDA** — clasificar / reclasificar / quitar de Carpeta Virtual, y CRUD de
carpetas → **`aud_log`** (trigger `fn_auditoria`), **NUNCA `SeguimientoDocumento`**.
SGDA deja la clasificación FUERA del Recorrido del documento **a propósito**
(no ensuciar el Recorrido con movimiento organizativo). Es una **decisión del
SGDA**, no una equivalencia con QUIPUX (que sí las registra en `hist_eventos`
vía tx 32 / 88).

Las transacciones **32 / 88 son de Carpetas Virtuales**, NO de Documentos
Asociados. **Documentos Asociados (F2-E)** conserva su trazabilidad propia en
`SeguimientoDocumento` (`asociar` / `desasociar` / `responder` / `respondido`)
y **no se mezcla** con estas transacciones.

El ETL de Carpetas Virtuales puede omitir por completo eventos históricos de
clasificación (SGDA no tiene ese tipo de evento).

## Independencia

Carpetas Virtuales es independiente de:
- **Documentos Asociados** (`responde_a`) — asociar/responder NO copia la
  carpeta;
- el **módulo formal de Archivo/Expedientes** — clasificar NO crea expediente
  ni serie ni aplica retención.
