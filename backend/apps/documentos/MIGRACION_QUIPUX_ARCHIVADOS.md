# Migración QUIPUX → SGDA: bandeja "Archivados" y `bandeja_origen`

> Referencia para el ETL futuro. **NO es lógica de runtime.** El ETL de QUIPUX
> todavía no está implementado; este documento fija la equivalencia que deberá
> aplicarse cuando se construya, según el comportamiento **verificado** del
> QUIPUX comunitario.

## Contexto

SGDA colapsó "estado global del documento" y "pertenencia por-usuario a una
bandeja" en un único campo mutable `BandejaDocumento.bandeja`. Para poder
restaurar un documento archivado a su bandeja correcta, SGDA guarda
**explícitamente** el origen en `BandejaDocumento.bandeja_origen` (nullable;
solo tiene valor mientras `bandeja == 'archivados'`; se limpia a NULL al
restaurar — no es histórico).

## Regla real de QUIPUX (verificada)

QUIPUX **no usa** `usuarios_radicado.radi_usua_tipo` para restaurar. La lógica
comprobada en `Tx.php::noArchivar()` es:

```php
$estado = 2;                              // por defecto: "en trámite" (Recibidos)
if (substr($radi_nume, -1) != 1)
    $estado = 6;                          // "enviado" (Enviados)
```

Es decir, decide **solo por el ÚLTIMO DÍGITO de `radi_nume_radi`**:

| último dígito de `radi_nume_radi` | significado | `noArchivar()` restaura a | bandeja SGDA |
|---|---|---|---|
| `1` | copia del destinatario | `esta_codi = 2` | **Recibidos** |
| `0` | documento de salida / original | `esta_codi = 6` | **Enviados** |
| `2` | documento externo | `esta_codi = 6` (por `!= 1`) | **Enviados** *(ver nota)* |

QUIPUX **archiva** con `esta_codi = 0` (independiente del último dígito).

## Tabla de equivalencia para el ETL

| QUIPUX (radicado) | SGDA `BandejaDocumento` |
|---|---|
| `esta_codi = 0` **y** `radi_nume_radi` termina en `1` | `bandeja = 'archivados'`, `bandeja_origen = 'recibidos'` |
| `esta_codi = 0` **y** `radi_nume_radi` termina en `0` (o `2`, ver nota) | `bandeja = 'archivados'`, `bandeja_origen = 'enviados'` |
| `esta_codi = 2` | `bandeja = 'recibidos'`, `bandeja_origen = NULL` |
| `esta_codi = 6` | `bandeja = 'enviados'`, `bandeja_origen = NULL` |

Las filas `informados` de QUIPUX (tabla `informados`) migran a
`bandeja = 'informados'` y **nunca** llevan `bandeja_origen`.

## Nota — documentos externos (`radi_nume_radi` termina en `2`)

Auditoría directa sobre `quipux_transaccional` (~496 000 radicados):

| Comprobación | Resultado |
|---|---|
| radicados que terminan en `2` | **4** (vs. 325 261 en `1`, 171 013 en `0`) |
| de esos 4, `esta_codi` | `6, 7, 7, 7` |
| radicados `esta_codi = 0` (archivados) que terminan en `2` | **0** |

Respuestas a las preguntas de auditoría:
1. **¿Pueden llegar a `esta_codi = 0` mediante Archivar?** Teóricamente sí
   (`noArchivar()` no tiene guarda por último dígito), pero **en los datos
   reales NUNCA ocurre** (0 de 4).
2. **¿Desde qué bandeja se archivan?** Sin datos. Conceptualmente un externo
   está en Recibidos del receptor.
3. **¿`noArchivar()` los devuelve a `esta_codi = 6`?** Sí, por el literal
   `!= 1 → estado = 6`. Un externo restaurado a "Enviados" es semánticamente
   raro (posible peculiaridad de QUIPUX), pero es lo que hace el código.
4. **¿Condición anterior que lo impida?** El fragmento de `noArchivar()` que
   tenemos no la tiene. **Verificar en el QUIPUX comunitario el cuerpo completo
   de `noArchivar()`** (guardas previas, `esta_codi` de entrada permitidos) si
   se quiere certeza absoluta — pero es irrelevante para el ETL por el punto 5.
5. **¿Datos reales?** No: cero radicados externos archivados en toda la BD.

**Conclusión ETL:** tratar `radi_nume_radi` terminado en `0` **o** `2` igual
→ `bandeja_origen = 'enviados'` (replica `noArchivar()` exactamente). El caso
`2` no tiene volumen y no requiere tratamiento especial.

## Backfill de datos SGDA anteriores a `bandeja_origen`

La migración de esquema `0018_bandeja_origen_archivados` **NO** ejecuta
inferencias de datos (solo `AddField` + `AlterField`). Motivo: separar
migración de ESQUEMA de conversión de DATOS — una heurística automática en una
migración Django permanente podría clasificar mal documentos históricos en
otros entornos.

Estado en la instalación de desarrollo actual: **3 filas** `bandeja='archivados'`
(usuario 426, cuenta del desarrollador, asuntos "prueba…", archivadas durante
las pruebas de F2-A-3 el 2026-09-02). Son **datos de desarrollo**; se
normalizaron a `bandeja_origen='recibidos'` con un ajuste puntual fuera de la
migración (`scripts`/shell), no como parte del esquema.

El backfill real QUIPUX → SGDA se hará en el ETL, con acceso a
`radi_nume_radi`, `esta_codi` y el histórico QUIPUX, aplicando la tabla de
equivalencia de arriba (reglas verificadas, no adivinanza).
