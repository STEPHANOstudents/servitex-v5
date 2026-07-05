// =============================================================================
// SERVITEX — Rutas de Catálogos
// =============================================================================
import { Router } from 'express';
import { catalogosController } from '../controllers/catalogos.controller';

const router = Router();

// GET /api/catalogos — todos los catálogos en un solo request
router.get('/', catalogosController.obtenerTodos);

// GET /api/catalogos/colorantes
router.get('/colorantes', catalogosController.obtenerColorantes);

// GET /api/catalogos/articulos
router.get('/articulos', catalogosController.obtenerArticulos);

export default router;
