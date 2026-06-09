// =============================================================================
// SERVITEX — Servicio de Recetas Técnicas (Capa de Negocio)
// Orquesta la transacción Prisma + el Motor Químico
// =============================================================================
import { prisma } from '../lib/prisma';
import {
  ejecutarMotorQuimico,
  calcularNivelIntensidad,
} from '../engines/quimico.engine';
import type { CrearRecetaInput, RecetaResponse } from '../types/recetas.types';

export const recetasService = {

  // ---------------------------------------------------------------------------
  // CREAR RECETA CON TRANSACCIÓN ATÓMICA
  // Pasos:
  //   1. Verificar que el DetalleOrden existe y no tiene receta aún
  //   2. Calcular litrosAgua y nivelIntensidad en el servidor
  //   3. Crear RecetaTecnica + todos los ColoranteFormula en una transacción
  //   4. Ejecutar el Motor Químico para generar el desglose de baños
  //   5. Devolver receta + resultado del motor
  // ---------------------------------------------------------------------------
  async crearReceta(datos: CrearRecetaInput): Promise<RecetaResponse> {

    // Paso 1: Verificar existencia del DetalleOrden y que no tenga receta
    const detalle = await prisma.detalleOrden.findUnique({
      where: { id: datos.detalleOrdenId },
      include: { recetaTecnica: true },
    });

    if (!detalle) {
      throw new Error(
        `No existe un DetalleOrden con ID ${datos.detalleOrdenId}.`
      );
    }

    if (detalle.recetaTecnica) {
      throw new Error(
        `El lote con ID ${datos.detalleOrdenId} ya tiene una Receta Técnica registrada. ` +
        `Use el endpoint de actualización.`
      );
    }

    // Paso 2: Calcular valores derivados en el servidor
    // litrosAgua = pesoRealKg × relacionBano (Float × Float)
    const litrosAgua: number =
      Math.round(datos.pesoRealKg * datos.relacionBano * 100) / 100;

    // nivelIntensidad = determinado por la suma de %% de colorantes (Sec. 3.4)
    const { nivel: nivelIntensidad } = calcularNivelIntensidad(datos.colorantes);

    // Paso 3: Transacción atómica — crear RecetaTecnica + ColoranteFormula[]
    const recetaCreada = await prisma.$transaction(async (tx) => {

      // 3a. Insertar la RecetaTecnica
      const receta = await tx.recetaTecnica.create({
        data: {
          detalleOrdenId:        datos.detalleOrdenId,
          pesoRealKg:            datos.pesoRealKg,
          articulo:              datos.articulo.trim(),
          composicionFibra:      datos.composicionFibra,
          relacionBano:          datos.relacionBano,
          litrosAgua,                          // calculado en servidor
          descripcionColor:      datos.descripcionColor.trim(),
          nivelIntensidad,                     // calculado en servidor (Float)
          observacionesTecnicas: datos.observacionesTecnicas?.trim() ?? null,
        },
      });

      // 3b. Inserción masiva de todos los colorantes
      await tx.coloranteFormula.createMany({
        data: datos.colorantes.map((c) => ({
          recetaTecnicaId: receta.id,
          nombreColorante: c.nombreColorante.trim(),
          porcentaje:      c.porcentaje,      // Float — validado upstream
        })),
      });

      // 3c. Retornar la receta con sus colorantes para la respuesta
      return tx.recetaTecnica.findUniqueOrThrow({
        where: { id: receta.id },
        include: {
          colorantes: { orderBy: { createdAt: 'asc' } },
        },
      });
    }); // COMMIT automático si no hubo errores, ROLLBACK si algo falló

    // Paso 4: Ejecutar el Motor Químico (fuera de la transacción — solo lectura)
    const motorQuimico = ejecutarMotorQuimico({
      composicion:   recetaCreada.composicionFibra,
      pesoRealKg:    recetaCreada.pesoRealKg,
      relacionBano:  recetaCreada.relacionBano,
      colorantes:    recetaCreada.colorantes.map((c) => ({
        nombreColorante: c.nombreColorante,
        porcentaje:      c.porcentaje,
      })),
    });

    // Paso 5: Construir y devolver la respuesta completa
    return {
      receta: {
        id:                    recetaCreada.id,
        detalleOrdenId:        recetaCreada.detalleOrdenId,
        pesoRealKg:            recetaCreada.pesoRealKg,
        articulo:              recetaCreada.articulo,
        composicionFibra:      recetaCreada.composicionFibra,
        relacionBano:          recetaCreada.relacionBano,
        litrosAgua:            recetaCreada.litrosAgua,
        descripcionColor:      recetaCreada.descripcionColor,
        nivelIntensidad:       recetaCreada.nivelIntensidad,
        observacionesTecnicas: recetaCreada.observacionesTecnicas,
        createdAt:             recetaCreada.createdAt.toISOString(),
        colorantes:            recetaCreada.colorantes.map((c) => ({
          nombreColorante: c.nombreColorante,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS RECETAS — Ordenadas cronológicamente (más reciente primero)
  // Incluye colorantes y datos del DetalleOrden vinculado
  // ---------------------------------------------------------------------------
  async obtenerRecetas() {
    const recetas = await prisma.recetaTecnica.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        colorantes: { orderBy: { createdAt: 'asc' } },
        detalleOrden: {
          include: {
            ordenCompra: {
              include: { cliente: true },
            },
          },
        },
      },
    });

    return recetas.map((r) => ({
      id:                    r.id,
      detalleOrdenId:        r.detalleOrdenId,
      pesoRealKg:            r.pesoRealKg,
      articulo:              r.articulo,
      composicionFibra:      r.composicionFibra,
      relacionBano:          r.relacionBano,
      litrosAgua:            r.litrosAgua,
      descripcionColor:      r.descripcionColor,
      nivelIntensidad:       r.nivelIntensidad,
      observacionesTecnicas: r.observacionesTecnicas,
      createdAt:             r.createdAt.toISOString(),
      colorantes: r.colorantes.map((c) => ({
        nombreColorante: c.nombreColorante,
        porcentaje:      c.porcentaje,
      })),
      // Contexto del lote vinculado
      lote: {
        colorSolicitado:     r.detalleOrden.colorSolicitado,
        descripcionArticulo: r.detalleOrden.descripcionArticulo,
        cantidad:            r.detalleOrden.cantidad,
        numeroOC:            r.detalleOrden.ordenCompra.numeroOC,
        cliente:             r.detalleOrden.ordenCompra.cliente.nombre,
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // OBTENER RECETA POR ID — Con desglose del motor químico
  // ---------------------------------------------------------------------------
  async obtenerRecetaPorId(id: number): Promise<RecetaResponse | null> {
    const receta = await prisma.recetaTecnica.findUnique({
      where: { id },
      include: {
        colorantes: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!receta) return null;

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  receta.composicionFibra,
      pesoRealKg:   receta.pesoRealKg,
      relacionBano: receta.relacionBano,
      colorantes:   receta.colorantes.map((c) => ({
        nombreColorante: c.nombreColorante,
        porcentaje:      c.porcentaje,
      })),
    });

    return {
      receta: {
        id:                    receta.id,
        detalleOrdenId:        receta.detalleOrdenId,
        pesoRealKg:            receta.pesoRealKg,
        articulo:              receta.articulo,
        composicionFibra:      receta.composicionFibra,
        relacionBano:          receta.relacionBano,
        litrosAgua:            receta.litrosAgua,
        descripcionColor:      receta.descripcionColor,
        nivelIntensidad:       receta.nivelIntensidad,
        observacionesTecnicas: receta.observacionesTecnicas,
        createdAt:             receta.createdAt.toISOString(),
        colorantes:            receta.colorantes.map((c) => ({
          nombreColorante: c.nombreColorante,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },
};
