// =============================================================================
// SERVITEX — Servicio de Recetas Técnicas (Versión 3.0 — Esquema Normalizado)
// =============================================================================
import { prisma } from '../lib/prisma';
import { getCatalogosCache, resolverCodigo } from '../lib/catalogos.cache';
import {
  ejecutarMotorQuimico,
  calcularNivelIntensidad,
} from '../engines/quimico.engine';
import type { CrearRecetaInput, RecetaResponse } from '../types/recetas.types';

export const recetasService = {

  // ---------------------------------------------------------------------------
  // CREAR RECETA CON TRANSACCIÓN ATÓMICA
  // ---------------------------------------------------------------------------
  async crearReceta(datos: CrearRecetaInput): Promise<RecetaResponse> {
    const cache = await getCatalogosCache();

    // Resolver IDs de catálogo
    const composicionFibraId = resolverCodigo(
      cache.composicionesFibra,
      datos.composicionFibraCodigo,
      'composiciones_fibra'
    );

    // Verificar existencia del lote y que no tenga receta
    const detalle = await prisma.detalleOrden.findUnique({
      where: { id: datos.detalleOrdenId },
      include: { recetaTecnica: true },
    });

    if (!detalle) {
      throw new Error(`No existe un DetalleOrden con ID ${datos.detalleOrdenId}.`);
    }
    if (detalle.recetaTecnica) {
      throw new Error(
        `El lote con ID ${datos.detalleOrdenId} ya tiene una Receta Técnica registrada.`
      );
    }

    // Verificar que todos los colorantes existen en el catálogo
    const coloranteIds = datos.colorantes.map(c => c.coloranteId);
    const colorantesCatalogo = await prisma.coloranteCatalogo.findMany({
      where: { id: { in: coloranteIds } },
    });
    if (colorantesCatalogo.length !== coloranteIds.length) {
      throw new Error('Uno o más colorantes no existen en el catálogo.');
    }
    const mapColorantes = new Map(colorantesCatalogo.map(c => [c.id, c.nombre]));

    // Calcular valores derivados en el servidor
    const litrosAgua = Math.round(datos.pesoRealKg * datos.relacionBano * 100) / 100;
    const { nivel: nivelIntensidad } = calcularNivelIntensidad(datos.colorantes);

    // Transacción atómica
    const recetaCreada = await prisma.$transaction(async (tx) => {
      const receta = await tx.recetaTecnica.create({
        data: {
          detalleOrdenId:        datos.detalleOrdenId,
          articuloId:            datos.articuloId,
          composicionFibraId,
          pesoRealKg:            datos.pesoRealKg,
          relacionBano:          datos.relacionBano,
          litrosAgua,
          descripcionColor:      datos.descripcionColor.trim(),
          nivelIntensidad,
          observacionesTecnicas: datos.observacionesTecnicas?.trim() ?? null,
        },
      });

      await tx.coloranteFormula.createMany({
        data: datos.colorantes.map((c) => ({
          recetaTecnicaId: receta.id,
          coloranteId:     c.coloranteId,
          porcentaje:      c.porcentaje,
        })),
      });

      return tx.recetaTecnica.findUniqueOrThrow({
        where: { id: receta.id },
        include: {
          colorantes:      { orderBy: { createdAt: 'asc' } },
          composicionFibra: true,
          articulo:         true,
        },
      });
    });

    // Ejecutar Motor Químico
    const motorQuimico = ejecutarMotorQuimico({
      composicion:  recetaCreada.composicionFibra.codigo,
      pesoRealKg:   recetaCreada.pesoRealKg,
      relacionBano: recetaCreada.relacionBano,
      colorantes:   recetaCreada.colorantes.map((c) => ({
        coloranteId: c.coloranteId,
        porcentaje:  c.porcentaje,
      })),
    });

    return {
      receta: {
        id:                    recetaCreada.id,
        detalleOrdenId:        recetaCreada.detalleOrdenId,
        pesoRealKg:            recetaCreada.pesoRealKg,
        articuloId:            recetaCreada.articuloId,
        articulo:              recetaCreada.articulo.nombre,
        composicionFibra:      recetaCreada.composicionFibra.codigo,
        composicionFibraLabel: recetaCreada.composicionFibra.etiqueta,
        relacionBano:          recetaCreada.relacionBano,
        litrosAgua:            recetaCreada.litrosAgua,
        descripcionColor:      recetaCreada.descripcionColor,
        nivelIntensidad:       recetaCreada.nivelIntensidad,
        observacionesTecnicas: recetaCreada.observacionesTecnicas,
        createdAt:             recetaCreada.createdAt.toISOString(),
        colorantes:            recetaCreada.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS RECETAS
  // ---------------------------------------------------------------------------
  async obtenerRecetas() {
    const recetas = await prisma.recetaTecnica.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        colorantes:       { orderBy: { createdAt: 'asc' }, include: { colorante: true } },
        composicionFibra: true,
        articulo:         true,
        detalleOrden: {
          include: {
            ordenCompra: { include: { cliente: true } },
          },
        },
      },
    });

    return recetas.map((r) => ({
      id:                    r.id,
      detalleOrdenId:        r.detalleOrdenId,
      pesoRealKg:            r.pesoRealKg,
      articuloId:            r.articuloId,
      articulo:              r.articulo.nombre,
      composicionFibra:      r.composicionFibra.codigo,
      composicionFibraLabel: r.composicionFibra.etiqueta,
      relacionBano:          r.relacionBano,
      litrosAgua:            r.litrosAgua,
      descripcionColor:      r.descripcionColor,
      nivelIntensidad:       r.nivelIntensidad,
      observacionesTecnicas: r.observacionesTecnicas,
      createdAt:             r.createdAt.toISOString(),
      colorantes: r.colorantes.map((c) => ({
        coloranteId:     c.coloranteId,
        nombreColorante: c.colorante.nombre,
        porcentaje:      c.porcentaje,
      })),
      lote: {
        colorSolicitado:     r.detalleOrden.colorSolicitado,
        descripcionArticulo: r.articulo.nombre,
        cantidad:            r.detalleOrden.cantidad,
        numeroOC:            r.detalleOrden.ordenCompra.numeroOC,
        cliente:             r.detalleOrden.ordenCompra.cliente.nombre,
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // OBTENER RECETA POR ID
  // ---------------------------------------------------------------------------
  async obtenerRecetaPorId(id: number): Promise<RecetaResponse | null> {
    const receta = await prisma.recetaTecnica.findUnique({
      where: { id },
      include: {
        colorantes:       { orderBy: { createdAt: 'asc' }, include: { colorante: true } },
        composicionFibra: true,
        articulo:         true,
      },
    });

    if (!receta) return null;

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  receta.composicionFibra.codigo,
      pesoRealKg:   receta.pesoRealKg,
      relacionBano: receta.relacionBano,
      colorantes:   receta.colorantes.map((c) => ({
        coloranteId: c.coloranteId,
        porcentaje:  c.porcentaje,
      })),
    });

    return {
      receta: {
        id:                    receta.id,
        detalleOrdenId:        receta.detalleOrdenId,
        pesoRealKg:            receta.pesoRealKg,
        articuloId:            receta.articuloId,
        articulo:              receta.articulo.nombre,
        composicionFibra:      receta.composicionFibra.codigo,
        composicionFibraLabel: receta.composicionFibra.etiqueta,
        relacionBano:          receta.relacionBano,
        litrosAgua:            receta.litrosAgua,
        descripcionColor:      receta.descripcionColor,
        nivelIntensidad:       receta.nivelIntensidad,
        observacionesTecnicas: receta.observacionesTecnicas,
        createdAt:             receta.createdAt.toISOString(),
        colorantes:            receta.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: c.colorante.nombre,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },
};
