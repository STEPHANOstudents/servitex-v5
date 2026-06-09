// =============================================================================
// SERVITEX — Controlador de Recetas Técnicas
// =============================================================================
import { Request, Response } from 'express';
import { recetasService } from '../services/recetas.service';
import { validarCrearReceta } from '../validators/recetas.validator';
import type { ApiError, ApiResponse } from '../types/ordenes.types';

function errorResponse(
  res: Response,
  status: number,
  message: string,
  errors?: Record<string, string>
): Response {
  return res.status(status).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  } satisfies ApiError);
}

function successResponse<T>(res: Response, status: number, message: string, data: T): Response {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse<T>);
}

// ---------------------------------------------------------------------------
// POST /api/recetas
// Crea una Receta Técnica con transacción atómica + Motor Químico
// ---------------------------------------------------------------------------
export async function crearReceta(req: Request, res: Response): Promise<void> {
  try {
    const { valido, errores, datos } = validarCrearReceta(req.body);

    if (!valido || !datos) {
      res.status(400).json({
        success: false,
        message: 'Los datos de la receta contienen errores de validación.',
        errors: errores,
        timestamp: new Date().toISOString(),
      } satisfies ApiError);
      return;
    }

    const resultado = await recetasService.crearReceta(datos);
    successResponse(res, 201, 'Receta Técnica creada exitosamente.', resultado);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido.';

    // Errores de negocio conocidos (lote no existe, ya tiene receta)
    if (
      mensaje.includes('No existe un DetalleOrden') ||
      mensaje.includes('ya tiene una Receta Técnica')
    ) {
      errorResponse(res, 409, mensaje);
      return;
    }

    console.error('[crearReceta] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al crear la Receta Técnica.');
  }
}

// ---------------------------------------------------------------------------
// GET /api/recetas
// Devuelve todas las recetas ordenadas cronológicamente (más reciente primero)
// ---------------------------------------------------------------------------
export async function obtenerRecetas(req: Request, res: Response): Promise<void> {
  try {
    void req;
    const recetas = await recetasService.obtenerRecetas();
    successResponse(res, 200, `${recetas.length} receta(s) obtenida(s).`, recetas);
  } catch (error: unknown) {
    console.error('[obtenerRecetas] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al obtener las recetas.');
  }
}

// ---------------------------------------------------------------------------
// GET /api/recetas/:id
// Devuelve una receta específica con el desglose del Motor Químico
// ---------------------------------------------------------------------------
export async function obtenerRecetaPorId(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const resultado = await recetasService.obtenerRecetaPorId(id);

    if (!resultado) {
      errorResponse(res, 404, `No se encontró la Receta Técnica con ID ${id}.`);
      return;
    }

    successResponse(res, 200, 'Receta Técnica obtenida exitosamente.', resultado);
  } catch (error: unknown) {
    console.error('[obtenerRecetaPorId] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor.');
  }
}
