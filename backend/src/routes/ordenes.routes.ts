// =============================================================================
// SERVITEX — Router de Órdenes de Compra
// Registra todos los endpoints del módulo de OC con sus middlewares.
// =============================================================================
import { Router } from 'express';
import {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenPorNumero,
  actualizarEstadoOrden,
} from '../controllers/ordenes.controller';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Rutas de Órdenes de Compra
//
//  POST   /api/ordenes                    → Crear OC completa (transacción)
//  GET    /api/ordenes                    → Listar OCs con detalles (paginado)
//  GET    /api/ordenes/:id                → Obtener OC por ID interno
//  GET    /api/ordenes/numero/:numeroOC   → Obtener OC por código de documento
//  PATCH  /api/ordenes/:id/estado         → Actualizar estado operativo
// ---------------------------------------------------------------------------

router.post('/', crearOrden);
router.get('/', obtenerOrdenes);
router.get('/numero/:numeroOC', obtenerOrdenPorNumero); // Debe ir ANTES de /:id
router.get('/:id', obtenerOrdenPorId);
router.patch('/:id/estado', actualizarEstadoOrden);

export default router;
