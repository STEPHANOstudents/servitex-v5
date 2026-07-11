// =============================================================================
// SERVITEX Frontend — API Service: Recetas Técnicas
// Actualizado para FK-based catalog (articuloId, composicionFibraCodigo, coloranteId)
// =============================================================================
import type { CrearRecetaInput, RecetaConMotor, RecetaListItem, ColoranteInput } from '../types/recetas';
import type { ApiResponse } from '../types/ordenes';
import { getAuthHeaders } from './authHeaders';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message ?? `Error ${res.status}`);
  return (json as ApiResponse<T>).data;
}

/**
 * POST /api/recetas
 * Body: { detalleOrdenId, pesoRealKg, articuloId, composicionFibraCodigo, relacionBano,
 *         descripcionColor, colorantes: [{coloranteId, porcentaje}], observacionesTecnicas? }
 */
export async function crearReceta(input: CrearRecetaInput): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(input),
  });
  return handle<RecetaConMotor>(res);
}

/** GET /api/recetas */
export async function obtenerRecetas(estado?: string): Promise<RecetaListItem[]> {
  const url = estado ? `${BASE}/recetas?estado=${encodeURIComponent(estado)}` : `${BASE}/recetas`;
  const res = await fetch(url, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return handle<RecetaListItem[]>(res);
}

/** GET /api/recetas/:id */
export async function obtenerRecetaPorId(id: number): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas/${id}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return handle<RecetaConMotor>(res);
}

/**
 * POST /api/recetas/:id/iteracion
 * Registra un ajuste de colorantes
 */
export async function registrarIteracion(
  id: number,
  colorantes: ColoranteInput[],
  observaciones: string
): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas/${id}/iteracion`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ colorantes, observaciones }),
  });
  return handle<RecetaConMotor>(res);
}

/**
 * POST /api/recetas/:id/aprobar
 * Aprueba el color y finaliza el lote
 */
export async function aprobarReceta(id: number): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas/${id}/aprobar`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  });
  return handle<RecetaConMotor>(res);
}

/**
 * POST /api/color/analizar
 * Recibe imagen (archivo) y coordenadas de la zona seleccionada.
 */
export async function analizarColor(
  imagen: File,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<{ colorHex: string; colorRgb: { r: number; g: number; b: number }; miniaturaBase64: string }> {
  const formData = new FormData();
  formData.append('imagen', imagen);
  formData.append('x', String(x));
  formData.append('y', String(y));
  formData.append('width', String(width));
  formData.append('height', String(height));

  const res = await fetch(`${BASE}/color/analizar`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message ?? `Error ${res.status}`);
  }

  return res.json();
}

/**
 * PATCH /api/recetas/:id/color
 * Guarda el colorHex, colorRgb y colorMiniatura en la receta.
 */
export async function guardarColor(
  id: number,
  payload: {
    colorHex: string | null;
    colorRgb: { r: number; g: number; b: number } | null;
    colorMiniatura: string | null;
  }
): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas/${id}/color`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload),
  });
  return handle<RecetaConMotor>(res);
}

// ---------------------------------------------------------------------------
// MÓDULO DE COSTEO Y PRECIOS (Fase 1 y 2)
// ---------------------------------------------------------------------------

export interface PrecioInsumo {
  id: number;
  codigoInsumo: string;
  nombreInsumo: string;
  precioUnitario: number;
  unidadMedida: string;
  updatedAt: string;
}

/**
 * GET /api/precios
 * Obtiene todos los precios de insumos.
 */
export async function obtenerPreciosInsumos(): Promise<PrecioInsumo[]> {
  const res = await fetch(`${BASE}/precios`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return handle<PrecioInsumo[]>(res);
}

/**
 * PUT /api/precios/:id
 * Actualiza el precio unitario de un insumo.
 */
export async function actualizarPrecioInsumo(id: number, precioUnitario: number): Promise<PrecioInsumo> {
  const res = await fetch(`${BASE}/precios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ precioUnitario }),
  });
  return handle<PrecioInsumo>(res);
}

/**
 * GET /api/recetas/:id/precio-sugerido?margenObjetivo=40
 * Obtiene el precio de venta sugerido para una receta dado un margen.
 */
export async function obtenerPrecioSugerido(id: number, margenObjetivo: number): Promise<{ precioSugerido: number | null }> {
  const res = await fetch(`${BASE}/recetas/${id}/precio-sugerido?margenObjetivo=${margenObjetivo}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  return handle<{ precioSugerido: number | null }>(res);
}

/**
 * DELETE /api/recetas/:id
 * Elimina una receta técnica específica (sólo Propietaria).
 */
export async function eliminarReceta(id: number): Promise<{ id: number }> {
  const res = await fetch(`${BASE}/recetas/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders()
    }
  });
  return handle<{ id: number }>(res);
}

