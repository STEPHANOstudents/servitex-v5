// =============================================================================
// SERVITEX — Router: Precios de Insumos (precios_insumos)
// =============================================================================
import { Router } from 'express';
import { obtenerPrecios, actualizarPrecio } from '../controllers/precios.controller';
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware';

const router: Router = Router();

/**
 * GET /api/precios
 * Obtiene todos los precios de insumos.
 */
router.get('/', verificarToken, obtenerPrecios);

/**
 * PUT /api/precios/:id
 * Actualiza un precio. Permitido solo para PROPIETARIA.
 */
router.put('/:id', verificarToken, permitirRoles('PROPIETARIA'), actualizarPrecio);

export default router;
