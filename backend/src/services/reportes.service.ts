// =============================================================================
// SERVITEX — Servicio de Reportes e Inteligencia de Negocios
// =============================================================================
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const reportesService = {
  /**
   * Reporte 1: Consumo de Colorantes
   * Top 5 colorantes por volumen acumulado (convertido a gramos en backend).
   */
  async obtenerConsumoColorantes(desde?: string, hasta?: string) {
    const dateFilter: any = {};
    if (desde || hasta) {
      dateFilter.createdAt = {};
      if (desde) dateFilter.createdAt.gte = new Date(desde);
      if (hasta) dateFilter.createdAt.lte = new Date(hasta);
    }

    
    const recetas = await prisma.recetaTecnica.findMany({
      where: {
        detalleOrden: {
          ordenCompra: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
      },
      include: {
        colorantes: {
          include: {
            colorante: true,
          },
        },
      },
    });

    
    const agrupados: Record<string, number> = {};
    for (const receta of recetas) {
      for (const c of receta.colorantes) {
        const nombre = c.colorante.nombre;
        const gramos = Math.round(receta.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100;
        agrupados[nombre] = (agrupados[nombre] || 0) + gramos;
      }
    }

    
    return Object.entries(agrupados)
      .map(([nombre, totalGramos]) => ({
        nombre,
        totalGramos: Math.round(totalGramos * 100) / 100,
      }))
      .sort((a, b) => b.totalGramos - a.totalGramos)
      .slice(0, 5);
  },

  /**
   * Reporte 2: Fidelidad de Clientes
   * Ranking de clientes por cantidad de lotes (teñidos individuales) y metros totales.
   */
  async obtenerFidelidadClientes(desde?: string, hasta?: string) {
    const dateFilter: any = {};
    if (desde || hasta) {
      if (desde) dateFilter.gte = new Date(desde);
      if (hasta) dateFilter.lte = new Date(hasta);
    }

    const ordenes = await prisma.ordenCompra.findMany({
      where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
      include: {
        cliente: true,
        detalles: {
          include: {
            articulo: true,
          },
        },
      },
    });

    const agrupadosClientes: Record<
      string,
      {
        totalTeñidos: number;
        totalMetros: number;
        detalles: Array<{
          numeroOC: string;
          articuloNombre: string;
          metros: number;
          costo: number;
          colorSolicitado: string;
          fecha: string;
        }>;
      }
    > = {};

    for (const oc of ordenes) {
      const clienteNombre = oc.cliente.nombre;
      if (!agrupadosClientes[clienteNombre]) {
        agrupadosClientes[clienteNombre] = { totalTeñidos: 0, totalMetros: 0, detalles: [] };
      }
      
      agrupadosClientes[clienteNombre].totalTeñidos += oc.detalles.length;
      agrupadosClientes[clienteNombre].totalMetros += oc.detalles.reduce((acc, d) => acc + d.cantidad, 0);

      for (const d of oc.detalles) {
        agrupadosClientes[clienteNombre].detalles.push({
          numeroOC: oc.numeroOC,
          articuloNombre: d.articulo.nombre,
          metros: d.cantidad,
          costo: d.total,
          colorSolicitado: d.colorSolicitado,
          fecha: oc.createdAt.toISOString(),
        });
      }
    }

    return Object.entries(agrupadosClientes)
      .map(([clienteNombre, info]) => ({
        clienteNombre,
        totalTeñidos: info.totalTeñidos,
        totalMetros: Math.round(info.totalMetros * 100) / 100,
        detalles: info.detalles,
      }))
      .sort((a, b) => b.totalTeñidos - a.totalTeñidos)
      .slice(0, 5);
  },

  async obtenerProduccionTemporal(desde?: string, hasta?: string, agrupacion: 'dia' | 'mes' | 'año' = 'mes') {
    const dateFilter: any = {};
    if (desde || hasta) {
      dateFilter.createdAt = {};
      if (desde) dateFilter.createdAt.gte = new Date(desde);
      if (hasta) dateFilter.createdAt.lte = new Date(hasta);
    }

    // Obtener detalles de órdenes que tienen recetas técnicas calculadas
    const detalles = await prisma.detalleOrden.findMany({
      where: {
        ordenCompra: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        recetaTecnica: {
          costoTotal: { not: null }
        }
      },
      include: {
        ordenCompra: true,
        recetaTecnica: true,
      }
    });

    // Agrupar por periodo y calcular el promedio de margen neto
    const agrupados: Record<string, { sum: number; count: number }> = {};

    for (const det of detalles) {
      const dateVal = new Date(det.ordenCompra.createdAt);
      let periodoStr = '';

      if (agrupacion === 'dia') {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        periodoStr = `${y}-${m}-${d}`;
      } else if (agrupacion === 'mes') {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        periodoStr = `${y}-${m}`;
      } else {
        periodoStr = String(dateVal.getFullYear());
      }

      const subtotal = det.total;
      const costo = det.recetaTecnica?.costoTotal ?? 0;

      if (subtotal > 0) {
        // Margen Neto % = ((Venta - Costo) / Venta) * 100
        const margen = ((subtotal - costo) / subtotal) * 100;
        
        if (!agrupados[periodoStr]) {
          agrupados[periodoStr] = { sum: 0, count: 0 };
        }
        agrupados[periodoStr].sum += margen;
        agrupados[periodoStr].count += 1;
      }
    }

    // Formatear resultados
    const resRaw = Object.entries(agrupados).map(([periodo, info]) => ({
      periodo,
      totalMetros: Math.round((info.sum / info.count) * 100) / 100, // Reutilizamos totalMetros en el tipo de respuesta para simplificar compatibilidad
    }));

    // Ordenar cronológicamente
    return resRaw.sort((a, b) => a.periodo.localeCompare(b.periodo));
  },

  /**
   * Guardar Snapshot de reporte
   * Registra un histórico de la generación de reportes en la tabla reportes_generados.
   */
  async guardarSnapshot(tipoReporteCodigo: string, fechaDesde: Date, fechaHasta: Date, resumenJson: any) {
    const tipo = await prisma.tipoReporte.findUnique({
      where: { codigo: tipoReporteCodigo },
    });

    if (!tipo) {
      throw new Error(`Tipo de reporte "${tipoReporteCodigo}" no existe.`);
    }

    return prisma.reporteGenerado.create({
      data: {
        tipoReporteId: tipo.id,
        fechaDesde,
        fechaHasta,
        resumenJson,
      },
    });
  }
};
