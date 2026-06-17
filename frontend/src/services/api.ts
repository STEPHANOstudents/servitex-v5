// =============================================================================
// SERVITEX Frontend — Capa de Servicio API
// Abstrae todas las llamadas HTTP al backend Express
// Actualizado para el modelo FK-normalizado
// =============================================================================
import type {
  ApiResponse,
  CrearOrdenInput,
  OrdenResponse,
  OrdenesPaginadas,
  EstadoOrdenCodigo,
} from '../types/ordenes';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// ---------------------------------------------------------------------------
// Helper: lanzar error con mensaje del backend si existe
// ---------------------------------------------------------------------------
async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    const mensaje =
      json.message ?? `Error ${res.status}: ${res.statusText}`;
    throw new Error(mensaje);
  }
  return (json as ApiResponse<T>).data;
}

// ---------------------------------------------------------------------------
// POST /api/ordenes — Crear Orden de Compra completa
// Body: { numeroOC, clienteNombre, tipoClienteCodigo, detalles: [{cantidad, articuloId, ...}] }
// ---------------------------------------------------------------------------
export async function crearOrden(input: CrearOrdenInput): Promise<OrdenResponse> {
  const res = await fetch(`${BASE_URL}/ordenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<OrdenResponse>(res);
}

// ---------------------------------------------------------------------------
// GET /api/ordenes — Obtener todas las órdenes (paginadas)
// ---------------------------------------------------------------------------
export async function obtenerOrdenes(pagina = 1, limite = 50): Promise<OrdenesPaginadas> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
  });
  const res = await fetch(`${BASE_URL}/ordenes?${params.toString()}`);
  return handleResponse<OrdenesPaginadas>(res);
}

// ---------------------------------------------------------------------------
// GET /api/ordenes/:id — Obtener orden específica con liquidación
// ---------------------------------------------------------------------------
export async function obtenerOrdenPorId(id: number): Promise<OrdenResponse> {
  const res = await fetch(`${BASE_URL}/ordenes/${id}`);
  return handleResponse<OrdenResponse>(res);
}

// ---------------------------------------------------------------------------
// PATCH /api/ordenes/:id/estado — Cambiar estado de una orden
// Body: { estadoCodigo: string }
// ---------------------------------------------------------------------------
export async function actualizarEstadoOrden(
  id: number,
  estadoCodigo: EstadoOrdenCodigo | string,
): Promise<OrdenResponse> {
  const res = await fetch(`${BASE_URL}/ordenes/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estadoCodigo }),
  });
  return handleResponse<OrdenResponse>(res);
}
