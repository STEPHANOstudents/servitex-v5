// =============================================================================
// SERVITEX — Tipos del Módulo de Seguridad (Autenticación)
// =============================================================================

export interface Usuario {
  id: number;
  nombre: string;
  rol: 'PROPIETARIA' | 'OPERARIO';
}

export interface LoginInput {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}
