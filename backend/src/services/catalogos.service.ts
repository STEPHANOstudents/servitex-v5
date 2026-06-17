// =============================================================================
// SERVITEX — Servicio de Catálogos
// Expone todos los catálogos del sistema para que el frontend pueda
// poblar sus formularios con valores válidos.
// =============================================================================
import { prisma } from '../lib/prisma';

export const catalogosService = {

  async obtenerTodos() {
    const [
      tiposCliente,
      estadosOrden,
      composicionesFibra,
      articulosTextiles,
      unidadesMedida,
      colorantesCatalogo,
      tiposIncidencia,
      fasesProceso,
      tiposReporte,
    ] = await Promise.all([
      prisma.tipoCliente.findMany({ orderBy: { id: 'asc' } }),
      prisma.estadoOrden.findMany({ orderBy: { id: 'asc' } }),
      prisma.composicionFibra.findMany({ orderBy: { id: 'asc' } }),
      prisma.articuloTextil.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      prisma.unidadMedida.findMany({ orderBy: { id: 'asc' } }),
      prisma.coloranteCatalogo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
      prisma.tipoIncidencia.findMany({ orderBy: { id: 'asc' } }),
      prisma.faseProceso.findMany({ orderBy: { orden: 'asc' } }),
      prisma.tipoReporte.findMany({ orderBy: { id: 'asc' } }),
    ]);

    return {
      tiposCliente,
      estadosOrden,
      composicionesFibra,
      articulosTextiles,
      unidadesMedida,
      colorantesCatalogo,
      tiposIncidencia,
      fasesProceso,
      tiposReporte,
    };
  },

  async obtenerColorantes() {
    return prisma.coloranteCatalogo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  },

  async obtenerArticulos() {
    return prisma.articuloTextil.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  },

  async obtenerComposicionesFibra() {
    return prisma.composicionFibra.findMany({ orderBy: { id: 'asc' } });
  },
};
