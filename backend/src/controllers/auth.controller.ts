// =============================================================================
// SERVITEX — Controlador de Autenticación
// =============================================================================
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export const authController = {
  /**
   * POST /api/auth/login
   * Autentica al usuario con correo y contraseña.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { correo, password } = req.body;
      const data = await authService.login(correo, password);
      
      res.status(200).json({
        success: true,
        message: 'Sesión iniciada exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[login] Error al iniciar sesión:', e);
      
      const status = e.message === 'Correo o contraseña incorrectos.' ? 401 : 500;
      res.status(status).json({
        success: false,
        message: e.message || 'Error interno del servidor al iniciar sesión.',
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna el perfil del usuario autenticado en base al token provisto.
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userPayload = (req as any).usuario;
      if (!userPayload || !userPayload.userId) {
        res.status(401).json({
          success: false,
          message: 'No autenticado.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const data = await authService.obtenerPerfil(userPayload.userId);
      res.status(200).json({
        success: true,
        message: 'Perfil de usuario obtenido exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[me] Error al obtener perfil:', e);
      
      res.status(500).json({
        success: false,
        message: e.message || 'Error interno del servidor al obtener el perfil.',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
