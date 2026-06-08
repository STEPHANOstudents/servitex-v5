import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ordenesRouter from './routes/ordenes.routes';

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// ---------------------------------------------------------------------------
// Middleware global
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'SERVITEX API funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Rutas de la API — Módulo 1: Órdenes de Compra
// ---------------------------------------------------------------------------
app.use('/api/ordenes', ordenesRouter);

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
  console.log(`   POST http://localhost:${PORT}/api/ordenes`);
  console.log(`   GET  http://localhost:${PORT}/api/ordenes`);
  console.log(`   GET  http://localhost:${PORT}/api/ordenes/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/ordenes/numero/:numeroOC`);
  console.log(`   PATCH http://localhost:${PORT}/api/ordenes/:id/estado`);
});

export default app;

