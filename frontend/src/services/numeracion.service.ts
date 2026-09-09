import api from './api'

export type ElementoNumeracion =
  | 'institucion' | 'area' | 'anio' | 'secuencial' | 'abreviatura'

export interface ConfigNumeracionTipo {
  tipo_id: number
  tipo_codigo: string
  tipo_nombre: string
  configurado: boolean
  activo: boolean
  abreviatura: string
  separador: string
  digitos_anio: number
  digitos_secuencia: number
  estructura: ElementoNumeracion[]
  anio: number
  secuencia_actual: number
  proximo_numero: string
}

export interface TablaNumeracion {
  unidad: { id: number; siglas: string; nombre: string }
  tipos: ConfigNumeracionTipo[]
}

export interface ConfigNumeracionInput {
  abreviatura: string
  separador: string
  digitos_anio: number
  digitos_secuencia: number
  estructura: ElementoNumeracion[]
  activo: boolean
}

const base = (unidadId: number) => `/documentos/numeracion/unidades/${unidadId}`

export const numeracionService = {
  tabla: (unidadId: number) =>
    api.get<TablaNumeracion>(`${base(unidadId)}/`).then(r => r.data),

  guardarConfig: (unidadId: number, tipoId: number, data: ConfigNumeracionInput) =>
    api.put(`${base(unidadId)}/tipos/${tipoId}/`, data).then(r => r.data),

  preview: (unidadId: number, tipoId: number, overrides: Partial<ConfigNumeracionInput>) =>
    api.post<{ preview: string }>(`${base(unidadId)}/tipos/${tipoId}/preview/`, overrides)
      .then(r => r.data.preview),

  ajustarSecuencia: (unidadId: number, tipoId: number, nueva_secuencia: number, motivo: string) =>
    api.post<{ secuencia_actual: number; proximo_numero: string }>(
      `${base(unidadId)}/tipos/${tipoId}/ajustar-secuencia/`,
      { nueva_secuencia, motivo },
    ).then(r => r.data),

  copiarDe: (unidadId: number, unidad_origen_id: number) =>
    api.post<{ copiadas: number; detail: string; tipos: ConfigNumeracionTipo[] }>(
      `${base(unidadId)}/copiar-de/`, { unidad_origen_id },
    ).then(r => r.data),
}

export const ELEMENTOS_NUMERACION: { id: ElementoNumeracion; label: string }[] = [
  { id: 'institucion',  label: 'Institución'  },
  { id: 'area',         label: 'Área'         },
  { id: 'anio',         label: 'Año'          },
  { id: 'secuencial',   label: 'Secuencial'   },
  { id: 'abreviatura',  label: 'Abreviatura'  },
]
