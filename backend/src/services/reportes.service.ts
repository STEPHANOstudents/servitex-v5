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

    // Consultar las recetas técnicas filtrando por fecha de OrdenCompra
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

    // Calcular gramos y agrupar por nombre de colorante
    const agrupados: Record<string, number> = {};
    for (const receta of recetas) {
      for (const c of receta.colorantes) {
        const nombre = c.colorante.nombre;
        const gramos = Math.round(receta.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100;
        agrupados[nombre] = (agrupados[nombre] || 0) + gramos;
      }
    }

    // Mapear, ordenar descendente y obtener top 5
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
        detalles: true,
      },
    });

    const agrupadosClientes: Record<string, { totalTeñidos: number; totalMetros: number }> = {};
    for (const oc of ordenes) {
      const clienteNombre = oc.cliente.nombre;
      if (!agrupadosClientes[clienteNombre]) {
        agrupadosClientes[clienteNombre] = { totalTeñidos: 0, totalMetros: 0 };
      }
      
      agrupadosClientes[clienteNombre].totalTeñidos += oc.detalles.length;
      agrupadosClientes[clienteNombre].totalMetros += oc.detalles.reduce((acc, d) => acc + d.cantidad, 0);
    }

    return Object.entries(agrupadosClientes)
      .map(([clienteNombre, info]) => ({
        clienteNombre,
        totalTeñidos: info.totalTeñidos,
        totalMetros: Math.round(info.totalMetros * 100) / 100,
      }))
      .sort((a, b) => b.totalTeñidos - a.totalTeñidos)
      .slice(0, 5);
  },

  /**
   * Reporte 3: Producción Temporal
   * Sumatoria de metros teñidos agrupados por periodos (mes, trimestre, año).
   */
  async obtenerProduccionTemporal(desde?: string, hasta?: string, agrupacion: 'mes' | 'trimestre' | 'año' = 'mes') {
    const queryConditions: any[] = [];
    if (desde) {
      queryConditions.push(Prisma.sql`oc."createdAt" >= ${new Date(desde)}`);
    }
    if (hasta) {
      queryConditions.push(Prisma.sql`oc."createdAt" <= ${new Date(hasta)}`);
    }

    const where = queryConditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.join(queryConditions, ' AND ')}` 
      : Prisma.empty;

    const bucketMap = {
      mes: 'month',
      trimestre: 'quarter',
      'año': 'year',
    };
    const bucket = bucketMap[agrupacion] || 'month';
    const rawQuery = `date_trunc('${bucket}', oc."createdAt")`;

    // Consulta raw SQL en base a date_trunc
    const resRaw: any[] = await prisma.$queryRaw`
      SELECT 
        ${Prisma.raw(rawQuery)} AS periodo,
        COALESCE(SUM(det.cantidad), 0)::float AS "totalMetros"
      FROM detalles_orden det
      JOIN ordenes_compra oc ON det."ordenCompraId" = oc.id
      ${where}
      GROUP BY periodo
      ORDER BY periodo ASC
    `;

    return resRaw.map(row => {
      const dateVal = row.periodo instanceof Date ? row.periodo : new Date(row.periodo);
      let periodoStr = '';

      if (agrupacion === 'mes') {
        const y = dateVal.getUTCFullYear();
        const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
        periodoStr = `${y}-${m}`;
      } else if (agrupacion === 'trimestre') {
        const y = dateVal.getUTCFullYear();
        const q = Math.ceil((dateVal.getUTCMonth() + 1) / 3);
        periodoStr = `${y}-Q${q}`;
      } else {
        periodoStr = String(dateVal.getUTCFullYear());
      }

      return {
        periodo: periodoStr,
        totalMetros: Math.round(row.totalMetros * 100) / 100,
      };
    });
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
