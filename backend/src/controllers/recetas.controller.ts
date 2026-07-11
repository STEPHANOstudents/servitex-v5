// =============================================================================
// SERVITEX — Controlador de Recetas Técnicas
// =============================================================================
import { Request, Response } from 'express';
import { recetasService } from '../services/recetas.service';
import { validarCrearReceta } from '../validators/recetas.validator';
import { prisma } from '../lib/prisma';
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
    const estado = req.query.estado ? String(req.query.estado) : undefined;
    const recetas = await recetasService.obtenerRecetas(estado);
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

// ---------------------------------------------------------------------------
// POST /api/recetas/:id/iteracion
// Registra una nueva iteración (ajuste) en una receta existente
// ---------------------------------------------------------------------------
export async function registrarIteracion(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const { colorantes, observaciones } = req.body;
    if (!Array.isArray(colorantes)) {
      errorResponse(res, 400, 'Los colorantes deben ser una lista válida.');
      return;
    }

    const resultado = await recetasService.registrarIteracion(id, { colorantes, observaciones });
    successResponse(res, 200, 'Iteración registrada exitosamente.', resultado);
  } catch (error: unknown) {
    console.error('[registrarIteracion] Error:', error);
    errorResponse(res, 500, error instanceof Error ? error.message : 'Error interno al registrar la iteración.');
  }
}

// ---------------------------------------------------------------------------
// POST /api/recetas/:id/aprobar
// Cambia el estado de una receta a APROBADO
// ---------------------------------------------------------------------------
export async function aprobarReceta(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const resultado = await recetasService.aprobarReceta(id);
    successResponse(res, 200, 'Receta aprobada exitosamente.', resultado);
  } catch (error: unknown) {
    console.error('[aprobarReceta] Error:', error);
    errorResponse(res, 500, error instanceof Error ? error.message : 'Error interno al aprobar la receta.');
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/recetas/:id/color
// Guarda colorHex, colorRgb y colorMiniatura en la receta correspondiente
// ---------------------------------------------------------------------------
export async function guardarColor(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const { colorHex, colorRgb, colorMiniatura } = req.body;
    const resultado = await recetasService.guardarColor(id, { colorHex, colorRgb, colorMiniatura });
    successResponse(res, 200, 'Color guardado en la receta exitosamente.', resultado);
  } catch (error: unknown) {
    console.error('[guardarColor] Error:', error);
    errorResponse(res, 500, error instanceof Error ? error.message : 'Error interno al guardar el color.');
  }
}

// ---------------------------------------------------------------------------
// GET /api/recetas/:id/precio-sugerido?margenObjetivo=40
// Calcula el precio de venta sugerido basado en el costo total de la receta y un margen
// ---------------------------------------------------------------------------
export async function obtenerPrecioSugerido(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const margen = parseFloat(req.query['margenObjetivo'] as string);
    if (isNaN(margen) || margen < 0 || margen >= 100) {
      errorResponse(res, 400, 'El margen objetivo debe ser un número entre 0 y 99.');
      return;
    }

    const receta = await prisma.recetaTecnica.findUnique({
      where: { id },
    });

    if (!receta) {
      errorResponse(res, 404, 'Receta técnica no encontrada.');
      return;
    }

    if (receta.costoTotal == null) {
      successResponse(res, 200, 'La receta no ha sido costeada.', { precioSugerido: null });
      return;
    }

    // Precio Venta Sugerido = Costo Producción Receta / (1 − (Margen Objetivo % / 100))
    const precioSugerido = receta.costoTotal / (1 - (margen / 100));
    const rounded = Math.round(precioSugerido * 100) / 100;

    successResponse(res, 200, 'Precio de venta sugerido calculado exitosamente.', {
      precioSugerido: rounded,
    });
  } catch (error: unknown) {
    console.error('[obtenerPrecioSugerido] Error:', error);
    errorResponse(res, 500, error instanceof Error ? error.message : 'Error interno al calcular el precio sugerido.');
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/recetas/:id
// Elimina una receta técnica (sólo Propietaria)
// ---------------------------------------------------------------------------
export async function eliminarReceta(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la receta debe ser un entero positivo.');
      return;
    }

    const eliminado = await recetasService.eliminarReceta(id);

    if (!eliminado) {
      errorResponse(res, 404, `No se encontró la receta técnica con ID ${id}.`);
      return;
    }

    successResponse(res, 200, 'Receta técnica eliminada exitosamente.', { id });
  } catch (error: unknown) {
    console.error('[eliminarReceta] Error:', error);
    errorResponse(res, 500, error instanceof Error ? error.message : 'Error interno al eliminar la receta técnica.');
  }
}
