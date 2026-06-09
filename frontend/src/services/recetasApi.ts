// =============================================================================
// SERVITEX Frontend — API Service: Recetas Técnicas
// =============================================================================
import type { CrearRecetaInput, RecetaConMotor, RecetaListItem } from '../types/recetas';
import type { ApiResponse } from '../types/ordenes';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function handle<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message ?? `Error ${res.status}`);
  return (json as ApiResponse<T>).data;
}

/** POST /api/recetas */
export async function crearReceta(input: CrearRecetaInput): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<RecetaConMotor>(res);
}

/** GET /api/recetas */
export async function obtenerRecetas(): Promise<RecetaListItem[]> {
  const res = await fetch(`${BASE}/recetas`);
  return handle<RecetaListItem[]>(res);
}

/** GET /api/recetas/:id */
export async function obtenerRecetaPorId(id: number): Promise<RecetaConMotor> {
  const res = await fetch(`${BASE}/recetas/${id}`);
  return handle<RecetaConMotor>(res);
}
