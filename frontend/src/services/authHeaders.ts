// =============================================================================
// SERVITEX — Manejo de Token JWT en Memoria
// =============================================================================

let tokenInMemory: string | null = null;

/**
 * Guarda el token de autenticación únicamente en memoria.
 */
export function setTokenInMemory(token: string | null): void {
  tokenInMemory = token;
}

/**
 * Retorna las cabeceras de autorización con el token actual si existe.
 */
export function getAuthHeaders(): Record<string, string> {
  if (!tokenInMemory) return {};
  return {
    'Authorization': 'Bearer ' + tokenInMemory,
  };
}
