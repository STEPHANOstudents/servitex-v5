// =============================================================================
// SERVITEX — Rutas de Clientes
// =============================================================================
import { Router } from 'express';
import { clientesController } from '../controllers/clientes.controller';

const router = Router();

// GET /api/clientes — Listar todos los clientes
router.get('/', clientesController.obtenerTodos);

// POST /api/clientes — Crear un nuevo cliente
router.post('/', clientesController.crearCliente);

export default router;
