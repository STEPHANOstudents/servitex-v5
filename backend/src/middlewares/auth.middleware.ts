// =============================================================================
// SERVITEX — Middlewares de Seguridad y Control de Roles
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar la validez del token JWT en las cabeceras HTTP.
 * Requiere que se envíe en la forma: Authorization: Bearer <token>
 */
export function verificarToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Token no proporcionado.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      message: 'Formato de token inválido.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Middleware de autorización basado en roles del sistema.
 * Rechaza el acceso con un estado HTTP 403 si el rol del usuario no está permitido.
 */
export function permitirRoles(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = (req as any).usuario;

    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
