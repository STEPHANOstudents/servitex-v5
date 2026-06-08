// =============================================================================
// SERVITEX — Tipos Compartidos para el Módulo de Órdenes de Compra
// Contrato de datos estrictamente tipado entre el cliente y el servidor.
// =============================================================================
import { TipoCliente, EstadoOrden } from '@prisma/client';

// ---------------------------------------------------------------------------
// REQUEST BODIES (lo que llega al servidor)
// ---------------------------------------------------------------------------

/**
 * Datos de una fila individual del pedido (un lote/color).
 * Regla: El backend ignora el campo "total" del cliente y lo recalcula.
 */
export interface DetalleOrdenInput {
  cantidad: number;           // Float: metros del lote (ej. 150.5)
  descripcionArticulo: string; // Ej. "Avío", "Prenda", "Tela cruda"
  colorSolicitado: string;    // Ej. "Keeneland Khaki"
  precioPorMetro: number;     // Float: precio en S/. por metro
  // "unidadMedida" no se acepta del cliente — es siempre "Metros" (constante de negocio)
  // "total" no se acepta del cliente — se calcula en el servidor (seguridad matemática)
}

/**
 * Payload completo para crear una Orden de Compra.
 * Contiene la cabecera + todas las filas de colores en un solo request.
 */
export interface CrearOrdenInput {
  // --- CABECERA (datos fijos) ---
  numeroOC: string;           // Código único del documento físico del cliente
  clienteNombre: string;      // Nombre del cliente (se crea/busca en el catálogo)
  tipoCliente: TipoCliente;   // Enum: EMPRESA | PERSONA_NATURAL | TALLER_EXTERNO | DISTRIBUIDOR
  observaciones?: string;     // Observaciones generales de la OC (opcional)

  // --- FILAS DINÁMICAS (mínimo 1 requerida) ---
  detalles: DetalleOrdenInput[];
}

/**
 * Payload para actualizar el estado de una Orden de Compra.
 */
export interface ActualizarEstadoInput {
  estado: EstadoOrden;
}

// ---------------------------------------------------------------------------
// RESPONSE SHAPES (lo que devuelve el servidor)
// ---------------------------------------------------------------------------

/**
 * Resumen de liquidación financiera de una OC.
 * Se calcula al vuelo — nunca se persiste en la BD.
 */
export interface LiquidacionOC {
  subtotalVenta: number;   // Suma de todos los totales de fila
  igv: number;             // 18% del subtotalVenta
  totalReal: number;       // subtotalVenta + igv (Monto Facturado)
  cantidadLotes: number;   // Número de filas/teñidos individuales
  metrosTotales: number;   // Suma de todos los metros
}

/**
 * Respuesta estándar de la API para operaciones exitosas.
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Respuesta estándar de la API para errores.
 */
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
  timestamp: string;
}
