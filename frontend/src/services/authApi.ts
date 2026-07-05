// =============================================================================
// SERVITEX — Servicio API de Autenticación
// =============================================================================
import type { LoginInput, LoginResponse, Usuario } from '../types/auth';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    const mensaje = json.message ?? `Error ${res.status}: ${res.statusText}`;
    throw new Error(mensaje);
  }
  return (json as ApiResponse<T>).data;
}

/**
 * Envía la petición de login al backend.
 */
export async function login(input: LoginInput): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<LoginResponse>(res);
}

/**
 * Obtiene el perfil del usuario autenticado en base al token.
 */
export async function obtenerPerfil(token: string): Promise<Usuario> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
  });
  return handleResponse<Usuario>(res);
}
