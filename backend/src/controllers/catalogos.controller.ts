// =============================================================================
// SERVITEX — Controlador de Catálogos
// =============================================================================
import { Request, Response } from 'express';
import { catalogosService } from '../services/catalogos.service';

export const catalogosController = {
  async obtenerTodos(req: Request, res: Response) {
    try {
      const data = await catalogosService.obtenerTodos();
      res.json({ success: true, message: 'Catálogos obtenidos.', data, timestamp: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message, timestamp: new Date().toISOString() });
    }
  },

  async obtenerColorantes(req: Request, res: Response) {
    try {
      const data = await catalogosService.obtenerColorantes();
      res.json({ success: true, message: 'Colorantes obtenidos.', data, timestamp: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message, timestamp: new Date().toISOString() });
    }
  },

  async obtenerArticulos(req: Request, res: Response) {
    try {
      const data = await catalogosService.obtenerArticulos();
      res.json({ success: true, message: 'Artículos obtenidos.', data, timestamp: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message, timestamp: new Date().toISOString() });
    }
  },
};
