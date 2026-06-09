// =============================================================================
// SERVITEX — Router de Recetas Técnicas
// =============================================================================
import { Router } from 'express';
import {
  crearReceta,
  obtenerRecetas,
  obtenerRecetaPorId,
} from '../controllers/recetas.controller';

const router: Router = Router();

/**
 * POST /api/recetas
 * Crea una Receta Técnica completa con transacción atómica.
 * El backend calcula: litrosAgua, nivelIntensidad y ejecuta el Motor Químico.
 */
router.post('/', crearReceta);

/**
 * GET /api/recetas
 * Devuelve todas las recetas ordenadas cronológicamente (más reciente primero).
 * Incluye colorantes y contexto del lote (OC, cliente, color).
 */
router.get('/', obtenerRecetas);

/**
 * GET /api/recetas/:id
 * Devuelve una receta específica con el desglose completo del Motor Químico
 * (secuencia de baños, litros y gramos de cada producto).
 */
router.get('/:id', obtenerRecetaPorId);

export default router;
