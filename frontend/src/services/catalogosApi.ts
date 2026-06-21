// =============================================================================
// SERVITEX Frontend — Servicio: Catálogos Normalizados
// GET /api/catalogos — trae todas las tablas de referencia del backend
// =============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface TipoCliente {
  id: number;
  codigo: string;
  etiqueta: string;
}

export interface EstadoOrden {
  id: number;
  codigo: string;
  etiqueta: string;
  esEstadoFinal: boolean;
}

export interface ComposicionFibra {
  id: number;
  codigo: string;
  etiqueta: string;
  totalBanos: number;
  descripcionRuta?: string;
}

export interface ArticuloTextil {
  id: number;
  nombre: string;
}

export interface UnidadMedida {
  id: number;
  codigo: string;
  simbolo: string;
  etiqueta: string;
}

export interface ColoranteCatalogo {
  id: number;
  nombre: string;
  tipoColorante: 'REACTIVO' | 'ACIDO' | 'DISPERSO';
}

export interface Catalogos {
  tiposCliente: TipoCliente[];
  estadosOrden: EstadoOrden[];
  composicionesFibra: ComposicionFibra[];
  articulosTextiles: ArticuloTextil[];
  unidadesMedida: UnidadMedida[];
  colorantesCatalogo: ColoranteCatalogo[];
}

export async function fetchCatalogos(): Promise<Catalogos> {
  const res = await fetch(`${API_BASE}/api/catalogos`);
  if (!res.ok) throw new Error(`Error al cargar catálogos: ${res.status}`);
  const json = await res.json();
  return json.data as Catalogos;
}
