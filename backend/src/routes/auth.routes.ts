// =============================================================================
// SERVITEX — Router de Autenticación
// =============================================================================
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validarLogin } from '../validators/auth.validator';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Rutas del Módulo de Seguridad (Autenticación)
//
//  POST  /api/auth/login   → Iniciar sesión y obtener token JWT
//  GET   /api/auth/me      → Obtener perfil del usuario autenticado
// ---------------------------------------------------------------------------

router.post('/login', validarLogin, authController.login);
router.get('/me', verificarToken, authController.me);

export default router;
