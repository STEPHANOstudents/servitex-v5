import { Router } from 'express';
import multer from 'multer';
import { analizarColor } from '../controllers/color.controller';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/color/analizar
 * Recibe imagen (multipart/form-data) y coordenadas x, y, width, height.
 */
router.post('/analizar', upload.single('imagen'), analizarColor);

export default router;
