// =============================================================================
// SERVITEX — Tipos Compartidos para el Módulo de Órdenes de Compra
// Versión 3.0 — Adaptado al esquema normalizado de 20 tablas.
// =============================================================================

// ---------------------------------------------------------------------------
// REQUEST BODIES (lo que llega al servidor)
// ---------------------------------------------------------------------------

/** Datos de una fila individual del pedido (un lote/color). */
export interface DetalleOrdenInput {
  cantidad:       number;  // metros del lote
  articuloId:     number;  // ID del catálogo articulos_textiles
  colorSolicitado: string; // color pedido por el cliente (texto libre)
  precioPorMetro: number;  // precio en S/. por metro
  unidadMedidaId?: number; // ID del catálogo unidades_medida (default: Metros)
}

/** Payload completo para crear una Orden de Compra. */
export interface CrearOrdenInput {
  numeroOC:          string;
  clienteNombre:     string;
  tipoClienteCodigo: string; // 'EMPRESA' | 'PERSONA_NATURAL' | 'TALLER_EXTERNO' | 'DISTRIBUIDOR'
  observaciones?:    string;
  detalles:          DetalleOrdenInput[];
}

/** Payload para actualizar el estado de una OC. */
export interface ActualizarEstadoInput {
  estadoCodigo: string; // 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'ANULADA'
}

// ---------------------------------------------------------------------------
// RESPONSE SHAPES
// ---------------------------------------------------------------------------

/** Resumen de liquidación financiera de una OC. Calculado al vuelo, nunca persistido. */
export interface LiquidacionOC {
  subtotalVenta: number;
  igv:           number;
  totalReal:     number;
  cantidadLotes: number;
  metrosTotales: number;
}

/** Respuesta estándar de la API para operaciones exitosas. */
export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}

/** Respuesta estándar de la API para errores. */
export interface ApiError {
  success:    false;
  message:    string;
  errors?:    Record<string, string>;
  timestamp:  string;
}
