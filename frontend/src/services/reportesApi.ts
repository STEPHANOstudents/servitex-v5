// =============================================================================
// SERVITEX — Servicio API de Reportes e Inteligencia
// =============================================================================
import type { ConsumoColorante, FidelidadCliente, ProduccionTemporal } from '../types/reportes';
import type { ApiResponse } from '../types/ordenes';
import { getAuthHeaders } from './authHeaders';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    const mensaje = json.message ?? `Error ${res.status}: ${res.statusText}`;
    throw new Error(mensaje);
  }
  return (json as ApiResponse<T>).data;
}

/**
 * Obtiene el top 5 de colorantes consumidos en un rango de fechas.
 */
export async function fetchConsumoColorantes(desde?: string, hasta?: string): Promise<ConsumoColorante[]> {
  const params = new URLSearchParams();
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);

  const res = await fetch(`${BASE_URL}/reportes/consumo-colorantes?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<ConsumoColorante[]>(res);
}

/**
 * Obtiene el ranking de fidelidad de clientes en un rango de fechas.
 */
export async function fetchFidelidadClientes(desde?: string, hasta?: string): Promise<FidelidadCliente[]> {
  const params = new URLSearchParams();
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);

  const res = await fetch(`${BASE_URL}/reportes/fidelidad-clientes?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<FidelidadCliente[]>(res);
}

/**
 * Obtiene la producción temporal acumulada (metros) según rango y agrupación.
 */
export async function fetchProduccionTemporal(
  agrupacion: 'dia' | 'mes' | 'año',
  desde?: string,
  hasta?: string
): Promise<ProduccionTemporal[]> {
  const params = new URLSearchParams();
  params.append('agrupacion', agrupacion);
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);

  const res = await fetch(`${BASE_URL}/reportes/produccion-temporal?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse<ProduccionTemporal[]>(res);
}
