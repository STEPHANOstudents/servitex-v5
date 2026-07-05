// =============================================================================
// SERVITEX — Validadores de Request para Autenticación
// =============================================================================
import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Middleware para validar las credenciales de inicio de sesión.
 * Comprueba correo electrónico no vacío con formato válido, y contraseña >= 6 caracteres.
 */
export function validarLogin(req: Request, res: Response, next: NextFunction): void {
  const { correo, password } = req.body;
  const errores: Record<string, string> = {};

  if (!correo || typeof correo !== 'string' || !correo.trim()) {
    errores['correo'] = 'El correo es obligatorio.';
  } else if (!EMAIL_REGEX.test(correo.trim())) {
    errores['correo'] = 'El formato del correo es inválido.';
  }

  if (!password || typeof password !== 'string') {
    errores['password'] = 'La contraseña es obligatoria.';
  } else if (password.length < 6) {
    errores['password'] = 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (Object.keys(errores).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Error de validación en las credenciales proporcionadas.',
      errors: errores,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
