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
  eliminarOrden,
} from '../controllers/ordenes.controller';
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware';

const router: Router = Router();

// ---------------------------------------------------------------------------
// Rutas de Órdenes de Compra
//
//  POST   /api/ordenes                    → Crear OC completa (transacción)
//  GET    /api/ordenes                    → Listar OCs con detalles (paginado)
//  GET    /api/ordenes/:id                → Obtener OC por ID interno
//  GET    /api/ordenes/numero/:numeroOC   → Obtener OC por código de documento
//  PATCH  /api/ordenes/:id/estado         → Actualizar estado operativo
//  DELETE /api/ordenes/:id                → Eliminar OC (con cascade técnico)
// ---------------------------------------------------------------------------

router.post('/', verificarToken, permitirRoles('PROPIETARIA'), crearOrden);
router.get('/', verificarToken, obtenerOrdenes);
router.get('/numero/:numeroOC', verificarToken, obtenerOrdenPorNumero); // Debe ir ANTES de /:id
router.get('/:id', verificarToken, obtenerOrdenPorId);
router.patch('/:id/estado', verificarToken, permitirRoles('PROPIETARIA'), actualizarEstadoOrden);
router.delete('/:id', verificarToken, permitirRoles('PROPIETARIA'), eliminarOrden);

export default router;
