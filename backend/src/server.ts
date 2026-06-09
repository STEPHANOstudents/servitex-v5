import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ordenesRouter from './routes/ordenes.routes';
import recetasRouter from './routes/recetas.routes';

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// ---------------------------------------------------------------------------
// Middleware global
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CORS — permite el frontend en dev y en producción (Render Static Site)
// ---------------------------------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, health checks)
    if (!origin) return callback(null, true);

    const allowed =
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      origin.endsWith('.onrender.com') ||           // cualquier subdominio de Render
      origin === process.env.FRONTEND_URL;           // URL explícita por env var

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'SERVITEX API funcionando correctamente',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Rutas de la API — Módulo 1: Órdenes de Compra
// ---------------------------------------------------------------------------
app.use('/api/ordenes', ordenesRouter);

// ---------------------------------------------------------------------------
// Rutas de la API — Módulo 2: Recetas Técnicas + Motor Químico
// ---------------------------------------------------------------------------
app.use('/api/recetas', recetasRouter);

// ---------------------------------------------------------------------------
// Manejador 404 — Ruta no encontrada
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada en la API de SERVITEX.',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Iniciar servidor
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor SERVITEX corriendo en http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 Rutas activas:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   --- Módulo 1: Órdenes de Compra ---`);
  console.log(`   POST  http://localhost:${PORT}/api/ordenes`);
  console.log(`   GET   http://localhost:${PORT}/api/ordenes`);
  console.log(`   GET   http://localhost:${PORT}/api/ordenes/:id`);
  console.log(`   GET   http://localhost:${PORT}/api/ordenes/numero/:numeroOC`);
  console.log(`   PATCH http://localhost:${PORT}/api/ordenes/:id/estado`);
  console.log(`   --- Módulo 2: Recetas Técnicas + Motor Químico ---`);
  console.log(`   POST  http://localhost:${PORT}/api/recetas`);
  console.log(`   GET   http://localhost:${PORT}/api/recetas`);
  console.log(`   GET   http://localhost:${PORT}/api/recetas/:id`);
});

export default app;

