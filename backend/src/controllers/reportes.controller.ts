// =============================================================================
// SERVITEX — Controlador de Reportes
// =============================================================================
import { Request, Response } from 'express';
import { reportesService } from '../services/reportes.service';

export const reportesController = {
  /**
   * GET /api/reportes/consumo-colorantes
   * Reporte de consumo de colorantes
   */
  async obtenerConsumoColorantes(req: Request, res: Response): Promise<void> {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      const data = await reportesService.obtenerConsumoColorantes(desde, hasta);

      const fechaDesde = desde ? new Date(desde) : new Date('1970-01-01');
      const fechaHasta = hasta ? new Date(hasta) : new Date();

      // Guardar snapshot de forma persistente
      await reportesService.guardarSnapshot('CONSUMO_COLORANTES', fechaDesde, fechaHasta, data);

      res.status(200).json({
        success: true,
        message: 'Reporte de consumo de colorantes generado exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[obtenerConsumoColorantes] Error:', e);
      res.status(500).json({
        success: false,
        message: 'Error al generar el reporte de consumo de colorantes.',
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * GET /api/reportes/fidelidad-clientes
   * Reporte de fidelidad de clientes
   */
  async obtenerFidelidadClientes(req: Request, res: Response): Promise<void> {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      const data = await reportesService.obtenerFidelidadClientes(desde, hasta);

      const fechaDesde = desde ? new Date(desde) : new Date('1970-01-01');
      const fechaHasta = hasta ? new Date(hasta) : new Date();

      // Guardar snapshot de forma persistente
      await reportesService.guardarSnapshot('FIDELIDAD_CLIENTES', fechaDesde, fechaHasta, data);

      res.status(200).json({
        success: true,
        message: 'Reporte de fidelidad de clientes generado exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[obtenerFidelidadClientes] Error:', e);
      res.status(500).json({
        success: false,
        message: 'Error al generar el reporte de fidelidad de clientes.',
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * GET /api/reportes/produccion-temporal
   * Reporte de producción temporal
   */
  async obtenerProduccionTemporal(req: Request, res: Response): Promise<void> {
    try {
      const { desde, hasta, agrupacion } = req.query as Record<string, string>;
      
      const agrValido = (agrupacion === 'mes' || agrupacion === 'trimestre' || agrupacion === 'año') 
        ? agrupacion 
        : 'mes';

      const data = await reportesService.obtenerProduccionTemporal(desde, hasta, agrValido);

      const fechaDesde = desde ? new Date(desde) : new Date('1970-01-01');
      const fechaHasta = hasta ? new Date(hasta) : new Date();

      // Guardar snapshot de forma persistente
      await reportesService.guardarSnapshot('PRODUCCION_TEMPORAL', fechaDesde, fechaHasta, data);

      res.status(200).json({
        success: true,
        message: 'Reporte de producción temporal generado exitosamente.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[obtenerProduccionTemporal] Error:', e);
      res.status(500).json({
        success: false,
        message: 'Error al generar el reporte de producción temporal.',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
