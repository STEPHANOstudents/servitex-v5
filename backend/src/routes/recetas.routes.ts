// =============================================================================
// SERVITEX — Router de Recetas Técnicas
// =============================================================================
import { Router } from 'express';
import {
  crearReceta,
  obtenerRecetas,
  obtenerRecetaPorId,
  registrarIteracion,
  aprobarReceta,
  guardarColor,
} from '../controllers/recetas.controller';
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware';

const router: Router = Router();

/**
 * POST /api/recetas
 * Crea una Receta Técnica completa con transacción atómica.
 * El backend calcula: litrosAgua, nivelIntensidad y ejecuta el Motor Químico.
 */
router.post('/', verificarToken, permitirRoles('PROPIETARIA'), crearReceta);

/**
 * GET /api/recetas
 * Devuelve todas las recetas ordenadas cronológicamente (más reciente primero).
 * Incluye colorantes y contexto del lote (OC, cliente, color).
 */
router.get('/', verificarToken, obtenerRecetas);

/**
 * GET /api/recetas/:id
 * Devuelve una receta específica con el desglose completo del Motor Químico
 * (secuencia de baños, litros y gramos de cada producto).
 */
router.get('/:id', verificarToken, obtenerRecetaPorId);

/**
 * POST /api/recetas/:id/iteracion
 * Registra una nueva iteración (ajuste) de colorantes en la receta.
 */
router.post('/:id/iteracion', verificarToken, permitirRoles('PROPIETARIA'), registrarIteracion);

/**
 * POST /api/recetas/:id/aprobar
 * Marca la receta técnica como APROBADO (fórmula final).
 */
router.post('/:id/aprobar', verificarToken, permitirRoles('PROPIETARIA'), aprobarReceta);

/**
 * PATCH /api/recetas/:id/color
 * Guarda colorHex, colorRgb y colorMiniatura de referencia.
 */
router.patch('/:id/color', verificarToken, permitirRoles('PROPIETARIA'), guardarColor);

export default router;
