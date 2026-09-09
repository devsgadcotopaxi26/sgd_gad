# Migración QUIPUX → SGDA: Documentos Asociados

> Referencia para el ETL futuro. **NO es lógica de runtime.**

## Equivalencia

| QUIPUX | SGDA |
|---|---|
| `radicado.radi_nume_asoc` (documento antecedente) | `Documento.responde_a` (FK `'self'`, `SET_NULL`, `related_name='respuestas'`) |
| 1 antecedente máximo · N consecuentes | idéntico |

La relación se origina al **Responder** o al **Asociar Documentos** manualmente.
No la crean Copiar, Nueva Tarea, Reasignar ni Informar. Archivar, Restaurar,
Reasignar y Papelera **no** la destruyen.

El ETL se construye en **dos fases separadas**: primero se fija la IDENTIDAD
de cada documento lógico (FASE A), y solo después se reconstruyen las
RELACIONES entre esos documentos (FASE B). No se puede resolver `responde_a`
sin haber terminado FASE A.

## FASE A (obligatoria) — IDENTIDAD DEL DOCUMENTO LÓGICO

MAPA: fila técnica QUIPUX → Documento lógico SGDA.

QUIPUX no tiene una noción única de "documento". Una operación documental
genera **varias filas `radicado`**:

- `radi_nume_radi` — PK numérica de cada fila (incluye el sufijo de tipo:
  `0` original/salida · `1` copia del destinatario · `2` externo).
- `radi_nume_temp` — número temporal mientras el radicado está en elaboración.
- `radi_nume_text` — número textual "de cara al usuario"; **varias filas pueden
  compartirlo** (la original y sus copias por destinatario).
- Filas **originales** vs **copias por destinatario** vs **externas**.

**NO asumir `mismo radi_nume_text = mismo Documento SGDA`** sin más: eso
colapsaría copias y originales de radicados distintos que reusaron numeración,
y no distingue el original de sus copias.

El ETL debe construir primero un **MAPA explícito**:

```
(radi_nume_radi de cada fila técnica)  ──►  (Documento lógico SGDA)
```

usando la evidencia disponible, típicamente:
1. Agrupar por `radi_nume_text` **+** año/dependencia **+** fila original
   (sufijo `0`) como "ancla" del documento lógico.
2. Las filas-copia (sufijo `1`) del mismo grupo → **el mismo `Documento`**, y
   sus destinatarios se materializan en `doc_destinatario` (no como
   `Documento` aparte).
3. Las filas externas (sufijo `2`) → `Documento` con remitente externo.
4. Radicados en elaboración: resolver por `radi_nume_temp`.
5. Casos ambiguos (sin fila original, numeración reusada) → registrar para
   revisión manual; **no** fabricar un `Documento` por fila.

Evidencia que consume FASE A: `radi_nume_radi`, `radi_nume_temp`,
`radi_nume_text`, la marca de fila original vs. copia vs. externa, y las
relaciones de destinatarios de cada fila.

## FASE B — RECONSTRUIR LAS RELACIONES

Solo **después** de tener el MAPA completo de FASE A:

```
radi_nume_asoc (de una fila)
   └─► fila antecedente QUIPUX (por radi_nume_radi / radi_nume_text)
        └─► MAPA
             └─► Documento lógico SGDA antecedente
                  └─► Documento_consecuente.responde_a = ese
```

Si `radi_nume_asoc` apunta a una fila-copia, se traduce vía el MAPA a su
documento lógico. **Nunca se crea un `Documento` por fila.**

## Ciclos

Validar igual que el runtime (`servicios_documento_asoc.validar_asociacion` /
`cadena_ascendente`): descartar `A→A` y cualquier ciclo `A→…→A`, dejando
`responde_a = NULL` y registrando la incidencia.

## Trazabilidad

El runtime usa la FK estructurada `SeguimientoDocumento.documento_relacionado`
(no texto). El ETL puede o no generar esos eventos históricos — decisión del ETL.

---

## Caso de aceptación real (para validar el futuro ETL)

Caso QUIPUX productivo tomado como prueba de aceptación. El árbol visible
arranca aproximadamente en:

```
GADPC-UEIV-2026-0681-M   "RENUNCIA"
```

y contiene, entre otros, estos documentos lógicos:

```
GADPC-DTH-2026-3366-M
GADPC-DEYP-2026-0030-O
GADPC-DA-2026-0454-C
GADPC-USIG-2026-0156-C
GADPC-DTH-2026-3367-M
GADPC-DTH-2026-3375-M
GADPC-PREF-2026-0876-M
GADPC-DTH-2026-3410-M
GADPC-DA-2026-0465-C
GADPC-USIG-2026-0163-C
```

En QUIPUX este árbol produce **muchísimas filas `radicado`**: varios de esos
números aparecen repetidos, **una vez por copia/destinatario**.

### Criterio de aceptación del ETL

```
QUIPUX:  N filas técnicas  (originales + 1 copia por destinatario + externas)
              │
              ▼  ETL  (FASE A → FASE B)
              │
SGDA:    1 nodo por Documento lógico
         + sus Destinatario(s) como filas separadas en doc_destinatario
         + las mismas relaciones antecedente/consecuente (responde_a)
```

Es decir:

- **un número / documento lógico → exactamente un nodo del árbol**
  (`GET /documentos/{id}/asociados/` devuelve el documento **una sola vez**,
  aunque tenga varios `Destinatario`);
- las copias por destinatario **nunca** se materializan como `Documento`
  aparte;
- `responde_a` se reconstruye sobre los documentos lógicos, no sobre filas.

### Lo que este caso NO fija todavía

**No** se fija en esta documentación un número absoluto de documentos lógicos
del árbol: el conjunto completo aún no se validó contra la BD QUIPUX. La lista
de arriba es indicativa (puede estar incompleta o contener nodos que al
resolverse en FASE A colapsen). Lo que sí queda fijado como invariante es la
**forma**: 1 número → 1 nodo, no 1 fila por destinatario. El recuento exacto
se cerrará al ejecutar el ETL con acceso a `radi_nume_radi` / `esta_codi` /
`radi_nume_asoc` del árbol completo.

---

## `Documento.relacionado_con` — NO usar

`Documento` tiene una **segunda** FK a self, `relacionado_con` (`SET_NULL`,
`related_name='relacionados'`), **dormida** (nada la escribe ni la lee).

- **`responde_a`** = antecedente/consecuente de **Docs. Asociados** (esta
  función). Único concepto de "cadena documental".
- **`relacionado_con`** = **semántica todavía NO confirmada** (¿documentos
  del mismo trámite? ¿referencias cruzadas sin jerarquía?). **No** se usa para
  representar antecedente/consecuente. Permanece dormida hasta que se defina.

El ETL de QUIPUX mapea `radi_nume_asoc` **solo** a `responde_a`.
