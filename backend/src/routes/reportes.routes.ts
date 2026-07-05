// =============================================================================
// SERVITEX — Router de Reportes e Inteligencia de Negocios
// =============================================================================
import { Router } from 'express';
import { reportesController } from '../controllers/reportes.controller';
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware';

const router: Router = Router();

// Aplicar verificación de token y rol PROPIETARIA a todas las rutas de reportes
router.use(verificarToken);
router.use(permitirRoles('PROPIETARIA'));

// ---------------------------------------------------------------------------
// Rutas de Reportes
//
//  GET  /api/reportes/consumo-colorantes  → Top colorantes
//  GET  /api/reportes/fidelidad-clientes  → Ranking de clientes
//  GET  /api/reportes/produccion-temporal → Metros teñidos agrupados
// ---------------------------------------------------------------------------

router.get('/consumo-colorantes', reportesController.obtenerConsumoColorantes);
router.get('/fidelidad-clientes', reportesController.obtenerFidelidadClientes);
router.get('/produccion-temporal', reportesController.obtenerProduccionTemporal);

export default router;
