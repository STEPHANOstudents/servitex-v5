// =============================================================================
// SERVITEX Frontend — Tipos TypeScript compartidos
// Espejo de los tipos del backend para tipado end-to-end
// =============================================================================

export type TipoCliente =
  | 'EMPRESA'
  | 'PERSONA_NATURAL'
  | 'TALLER_EXTERNO'
  | 'DISTRIBUIDOR';

export type EstadoOrden =
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
  descripcionArticulo: string;
  colorSolicitado: string;
  precioPorMetro: string;   // String para el input
}

// ---------------------------------------------------------------------------
// Request al backend
// ---------------------------------------------------------------------------
export interface DetalleOrdenInput {
  cantidad: number;
  descripcionArticulo: string;
  colorSolicitado: string;
  precioPorMetro: number;
}

export interface CrearOrdenInput {
  numeroOC: string;
  clienteNombre: string;
  tipoCliente: TipoCliente;
  observaciones?: string;
  detalles: DetalleOrdenInput[];
}

// ---------------------------------------------------------------------------
// Respuestas del backend
// ---------------------------------------------------------------------------
export interface ClienteDB {
  id: number;
  nombre: string;
  tipoCliente: TipoCliente;
  createdAt: string;
  updatedAt: string;
}

export interface DetalleOrdenDB {
  id: number;
  ordenCompraId: number;
  cantidad: number;
  unidadMedida: string;
  descripcionArticulo: string;
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
  estado: EstadoOrden;
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
