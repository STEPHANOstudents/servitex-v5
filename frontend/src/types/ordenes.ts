// =============================================================================
// SERVITEX Frontend — Tipos TypeScript compartidos
// Espejo de los tipos del backend (FK-based catalog, normalizado)
// =============================================================================

// ---------------------------------------------------------------------------
// Objetos de catálogo (FK normalizados — vienen anidados en las respuestas)
// ---------------------------------------------------------------------------
export interface TipoClienteObj {
  id: number;
  codigo: string;
  etiqueta: string;
}

export interface EstadoOrdenObj {
  id: number;
  codigo: string;
  etiqueta: string;
  esEstadoFinal: boolean;
}

export interface ArticuloObj {
  id: number;
  nombre: string;
}

export interface UnidadMedidaObj {
  id: number;
  codigo: string;
  simbolo: string;
  etiqueta: string;
}

// ---------------------------------------------------------------------------
// Tipos de string (códigos) — usados en requests salientes
// ---------------------------------------------------------------------------
export type TipoClienteCodigo =
  | 'EMPRESA'
  | 'PERSONA_NATURAL'
  | 'TALLER_EXTERNO'
  | 'DISTRIBUIDOR';

export type EstadoOrdenCodigo =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'ANULADA';

// ---------------------------------------------------------------------------
// Fila del formulario (estado local del componente)
// Incluye un id local para React key prop
// ---------------------------------------------------------------------------
export interface FilaDetalle {
  localId: string;          // Solo para React key — no se envía al backend
  cantidad: string;         // String para el input (se convierte a Float al enviar)
  articuloId: string;       // String del id (select) — se convierte a number al enviar
  colorSolicitado: string;
  precioPorMetro: string;   // String para el input
}

// ---------------------------------------------------------------------------
// Request al backend
// ---------------------------------------------------------------------------
export interface DetalleOrdenInput {
  cantidad: number;
  articuloId: number;
  colorSolicitado: string;
  precioPorMetro: number;
}

export interface CrearOrdenInput {
  numeroOC: string;
  clienteNombre: string;
  tipoClienteCodigo: TipoClienteCodigo;
  observaciones?: string;
  detalles: DetalleOrdenInput[];
}

// ---------------------------------------------------------------------------
// Respuestas del backend — objetos anidados normalizados
// ---------------------------------------------------------------------------
export interface ClienteDB {
  id: number;
  nombre: string;
  tipoClienteId: number;
  tipoCliente: TipoClienteObj;
  createdAt: string;
  updatedAt: string;
}

export interface DetalleOrdenDB {
  id: number;
  ordenCompraId: number;
  cantidad: number;
  articuloId: number;
  articulo: ArticuloObj;
  unidadMedidaId: number;
  unidadMedida: UnidadMedidaObj;
  colorSolicitado: string;
  precioPorMetro: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdenCompraDB {
  id: number;
  numeroOC: string;
  clienteId: number;
  cliente: ClienteDB;
  estadoId: number;
  estado: EstadoOrdenObj;
  observaciones: string | null;
  detalles: DetalleOrdenDB[];
  createdAt: string;
  updatedAt: string;
}

export interface LiquidacionOC {
  subtotalVenta: number;
  igv: number;
  totalReal: number;
  cantidadLotes: number;
  metrosTotales: number;
}

export interface OrdenResponse {
  orden: OrdenCompraDB;
  liquidacion: LiquidacionOC;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface OrdenesPaginadas {
  ordenes: OrdenCompraDB[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}
