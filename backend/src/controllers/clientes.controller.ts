// =============================================================================
// SERVITEX — Controlador de Clientes
// =============================================================================
import { Request, Response } from 'express';
import { clientesService } from '../services/clientes.service';

export const clientesController = {
  /**
   * GET /api/clientes
   * Retorna todos los clientes registrados.
   */
  async obtenerTodos(req: Request, res: Response): Promise<void> {
    try {
      const data = await clientesService.obtenerTodos();
      res.json({
        success: true,
        message: 'Clientes obtenidos exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[obtenerTodos] Error al obtener clientes:', e);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los clientes de la base de datos.',
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * POST /api/clientes
   * Registra un nuevo cliente en el sistema.
   */
  async crearCliente(req: Request, res: Response): Promise<void> {
    try {
      const { nombre, tipoClienteCodigo, ruc, telefono } = req.body;

      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        res.status(400).json({
          success: false,
          message: 'El nombre del cliente es obligatorio.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!tipoClienteCodigo || typeof tipoClienteCodigo !== 'string') {
        res.status(400).json({
          success: false,
          message: 'El código del tipo de cliente es obligatorio.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validar RUC si está presente: solo números, máximo 11 caracteres
      if (ruc) {
        const rucStr = String(ruc).trim();
        if (rucStr.length > 0) {
          if (!/^\d+$/.test(rucStr) || rucStr.length > 11) {
            res.status(400).json({
              success: false,
              message: 'El RUC debe contener solo números y tener un máximo de 11 dígitos.',
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      // Validar Teléfono si está presente: máximo 15 caracteres
      if (telefono) {
        const telStr = String(telefono).trim();
        if (telStr.length > 15) {
          res.status(400).json({
            success: false,
            message: 'El teléfono debe tener un máximo de 15 caracteres.',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const cliente = await clientesService.crearCliente({
        nombre: nombre.trim(),
        tipoClienteCodigo: tipoClienteCodigo.trim(),
        ruc: ruc ? String(ruc).trim() : undefined,
        telefono: telefono ? String(telefono).trim() : undefined,
      });

      res.status(201).json({ // 201 Created
        success: true,
        message: 'Cliente registrado exitosamente.',
        data: cliente,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[crearCliente] Error al crear cliente:', e);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el cliente en la base de datos.',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
