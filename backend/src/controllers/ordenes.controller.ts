// =============================================================================
// SERVITEX — Controlador de Órdenes de Compra
// Sección 1: Módulo de Órdenes de Compra (Registro Comercial)
//
// Responsabilidades:
//  - Recibir y validar los requests HTTP
//  - Delegar la lógica de negocio al servicio
//  - Formatear y devolver las respuestas de la API
// =============================================================================
import { Request, Response } from 'express';
import { ordenesService } from '../services/ordenes.service';
import { validarCrearOrden } from '../validators/ordenes.validator';
import { ActualizarEstadoInput, ApiError, ApiResponse } from '../types/ordenes.types';

// ---------------------------------------------------------------------------
// Helper: construir respuesta de error estándar
// ---------------------------------------------------------------------------
function errorResponse(
  res: Response,
  status: number,
  message: string,
  errors?: Record<string, string>
): Response {
  const body: ApiError = {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(body);
}

// ---------------------------------------------------------------------------
// Helper: construir respuesta exitosa estándar
// ---------------------------------------------------------------------------
function successResponse<T>(
  res: Response,
  status: number,
  message: string,
  data: T
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(body);
}

// =============================================================================
// CONTROLADORES
// =============================================================================

/**
 * POST /api/ordenes
 * Crea una Orden de Compra completa (cabecera + detalles) en una sola transacción.
 * El backend recalcula y valida matemáticamente el total de cada fila.
 */
export async function crearOrden(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validar el body del request
    const { valido, errores, datos } = validarCrearOrden(req.body);

    if (!valido || !datos) {
      res
        .status(400)
        .json({
          success: false,
          message: 'Los datos de la solicitud contienen errores de validación.',
          errors: errores,
          timestamp: new Date().toISOString(),
        } satisfies ApiError);
      return;
    }

    // 2. Delegar la lógica transaccional al servicio
    const ordenCreada = await ordenesService.crearOrdenConDetalles(datos);

    // 3. Responder con la OC creada y su liquidación financiera
    successResponse(res, 201, 'Orden de Compra creada exitosamente.', ordenCreada);
  } catch (error: unknown) {
    // Manejo de errores conocidos de Prisma
    if (isPrismaUniqueError(error)) {
      errorResponse(
        res,
        409,
        `El Número de Orden de Compra ya existe en el sistema. Use un código único.`
      );
      return;
    }

    console.error('[crearOrden] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al procesar la Orden de Compra.');
  }
}

/**
 * GET /api/ordenes
 * Devuelve todas las Órdenes de Compra con sus detalles anidados.
 * Soporta filtrado por estado y cliente, y paginación básica.
 */
export async function obtenerOrdenes(req: Request, res: Response): Promise<void> {
  try {
    const {
      estado,
      clienteId,
      pagina = '1',
      limite = '20',
    } = req.query as Record<string, string>;

    // Parsear y validar parámetros de paginación
    const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
    const limiteNum = Math.min(100, Math.max(1, parseInt(limite, 10) || 20));

    const resultado = await ordenesService.obtenerOrdenes({
      estadoCodigo: estado,
      clienteId: clienteId ? parseInt(clienteId, 10) : undefined,
      pagina: paginaNum,
      limite: limiteNum,
    });

    successResponse(res, 200, 'Órdenes de Compra obtenidas exitosamente.', resultado);
  } catch (error: unknown) {
    console.error('[obtenerOrdenes] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al obtener las Órdenes de Compra.');
  }
}

/**
 * GET /api/ordenes/:id
 * Devuelve una Orden de Compra específica con todos sus detalles y liquidación financiera.
 */
export async function obtenerOrdenPorId(req: Request, res: Response): Promise<void> {
  try {
    const rawId: string = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la Orden de Compra debe ser un número entero positivo.');
      return;
    }

    const orden = await ordenesService.obtenerOrdenPorId(id);

    if (!orden) {
      errorResponse(res, 404, `No se encontró la Orden de Compra con ID ${id}.`);
      return;
    }

    successResponse(res, 200, 'Orden de Compra obtenida exitosamente.', orden);
  } catch (error: unknown) {
    console.error('[obtenerOrdenPorId] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al obtener la Orden de Compra.');
  }
}

/**
 * GET /api/ordenes/numero/:numeroOC
 * Busca una OC por su número de documento (el código visible en pantalla).
 */
export async function obtenerOrdenPorNumero(req: Request, res: Response): Promise<void> {
  try {
    const numeroOC: string = String(req.params['numeroOC'] ?? '');

    if (!numeroOC || numeroOC.trim().length === 0) {
      errorResponse(res, 400, 'El número de OC es obligatorio.');
      return;
    }

    const orden = await ordenesService.obtenerOrdenPorNumero(numeroOC.trim());

    if (!orden) {
      errorResponse(res, 404, `No se encontró la Orden de Compra "${numeroOC}".`);
      return;
    }

    successResponse(res, 200, 'Orden de Compra obtenida exitosamente.', orden);
  } catch (error: unknown) {
    console.error('[obtenerOrdenPorNumero] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor.');
  }
}

/**
 * PATCH /api/ordenes/:id/estado
 * Actualiza únicamente el estado operativo de una OC.
 */
export async function actualizarEstadoOrden(req: Request, res: Response): Promise<void> {
  try {
    const rawId: string = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la Orden de Compra debe ser un número entero positivo.');
      return;
    }

    const body = req.body as any;
    const estadoInput = body.estado || body.estadoCodigo;
    const estadoCodigo = String(estadoInput ?? '').trim().toUpperCase();
    const estadosValidos = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ENTREGADA', 'ANULADA'];

    if (!estadoInput || !estadosValidos.includes(estadoCodigo)) {
      errorResponse(
        res,
        400,
        `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}.`
      );
      return;
    }

    const ordenActualizada = await ordenesService.actualizarEstado(id, { estadoCodigo });

    if (!ordenActualizada) {
      errorResponse(res, 404, `No se encontró la Orden de Compra con ID ${id}.`);
      return;
    }

    successResponse(res, 200, `Estado actualizado a "${estadoCodigo}" exitosamente.`, ordenActualizada);
  } catch (error: unknown) {
    console.error('[actualizarEstadoOrden] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al actualizar el estado.');
  }
}

/**
 * DELETE /api/ordenes/:id
 * Elimina una Orden de Compra y todos sus registros cascada (sólo Propietaria).
 */
export async function eliminarOrden(req: Request, res: Response): Promise<void> {
  try {
    const rawId: string = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      errorResponse(res, 400, 'El ID de la Orden de Compra debe ser un número entero positivo.');
      return;
    }

    const eliminado = await ordenesService.eliminarOrden(id);

    if (!eliminado) {
      errorResponse(res, 404, `No se encontró la Orden de Compra con ID ${id}.`);
      return;
    }

    successResponse(res, 200, 'Orden de Compra eliminada exitosamente.', { id });
  } catch (error: unknown) {
    console.error('[eliminarOrden] Error inesperado:', error);
    errorResponse(res, 500, 'Error interno del servidor al eliminar la Orden de Compra.');
  }
}

// ---------------------------------------------------------------------------
// Type guard para errores de constraint único de Prisma
// ---------------------------------------------------------------------------
function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}
