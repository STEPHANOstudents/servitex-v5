// =============================================================================
// SERVITEX — Controlador: Precios de Insumos (precios_insumos)
// =============================================================================
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * GET /api/precios
 * Obtiene la lista de todos los precios de insumos registrados.
 */
export async function obtenerPrecios(req: Request, res: Response): Promise<void> {
  try {
    const precios = await prisma.precioInsumo.findMany({
      orderBy: { codigoInsumo: 'asc' },
    });
    res.status(200).json({
      success: true,
      data: precios,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener precios de insumos.',
      error: error.message,
    });
  }
}

/**
 * PUT /api/precios/:id
 * Actualiza el precio unitario de un insumo específico.
 * Body: { precioUnitario: number }
 */
export async function actualizarPrecio(req: Request, res: Response): Promise<void> {
  try {
    const rawId = String(req.params['id'] ?? '');
    const id = parseInt(rawId, 10);
    const { precioUnitario } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID de insumo inválido.' });
      return;
    }

    if (typeof precioUnitario !== 'number' || precioUnitario < 0) {
      res.status(400).json({
        success: false,
        message: 'El precio unitario debe ser un número positivo.',
      });
      return;
    }

    const insumoActualizado = await prisma.precioInsumo.update({
      where: { id },
      data: { precioUnitario },
    });

    res.status(200).json({
      success: true,
      message: 'Precio de insumo actualizado correctamente.',
      data: insumoActualizado,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el precio de insumo.',
        error: error.message,
      });
    }
  }
}
