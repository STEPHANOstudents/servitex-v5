// =============================================================================
// SERVITEX — Servicio de Recetas Técnicas (Versión 3.0 — Esquema Normalizado)
// =============================================================================
import { prisma } from '../lib/prisma';
import { getCatalogosCache, resolverCodigo } from '../lib/catalogos.cache';
import {
  ejecutarMotorQuimico,
  calcularNivelIntensidad,
} from '../engines/quimico.engine';
import type { CrearRecetaInput, RecetaResponse, ColoranteInput } from '../types/recetas.types';

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

    // Obtener código de fibra para el motor químico
    const fibraRecord = await prisma.composicionFibra.findUniqueOrThrow({
      where: { id: composicionFibraId },
    });

    // Ejecutar Motor Químico inicial
    const motorQuimico = ejecutarMotorQuimico({
      composicion:  fibraRecord.codigo,
      pesoRealKg:   datos.pesoRealKg,
      relacionBano: datos.relacionBano,
      colorantes:   datos.colorantes,
    });

    // Generar primera iteración
    const primeraIteracion = {
      iteracion: 1,
      fecha: new Date().toISOString(),
      colorantes: datos.colorantes.map((c) => {
        const nombre = mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`;
        const gramos = Math.round(datos.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100;
        return {
          coloranteId: c.coloranteId,
          nombreColorante: nombre,
          porcentaje: c.porcentaje,
          gramos,
        };
      }),
      observacion: 'Primera formulación inicial.',
    };

    // Transacción atómica
    const recetaCreada = await prisma.$transaction(async (tx) => {
      // Buscar o crear artículo por su nombre (texto libre)
      const nombreArticulo = datos.articuloNombre.trim();
      let articulo = await tx.articuloTextil.findFirst({
        where: { nombre: { equals: nombreArticulo, mode: 'insensitive' } },
      });
      if (!articulo) {
        articulo = await tx.articuloTextil.create({
          data: {
            nombre: nombreArticulo,
            descripcion: 'Creado dinámicamente desde Lab',
          },
        });
      }

      const receta = await tx.recetaTecnica.create({
        data: {
          detalleOrdenId:        datos.detalleOrdenId,
          articuloId:            articulo.id,
          composicionFibraId,
          pesoRealKg:            datos.pesoRealKg,
          relacionBano:          datos.relacionBano,
          litrosAgua,
          descripcionColor:      datos.descripcionColor.trim(),
          nivelIntensidad,
          estado:                'FORMULACION',
          secuenciaBanos:        motorQuimico.secuencia as any,
          iteraciones:           [primeraIteracion] as any,
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

      // --- AUTOMATIZACIÓN 1 ---
      const det = await tx.detalleOrden.findUnique({
        where: { id: datos.detalleOrdenId },
        select: { ordenCompraId: true }
      });

      console.log(`[crearReceta] datos.detalleOrdenId: ${datos.detalleOrdenId}, det: ${JSON.stringify(det)}`);

      if (det) {
        const OCId = det.ordenCompraId;
        console.log(`[crearReceta] Resolviendo ordenCompraId: ${OCId}`);

        const oc = await tx.ordenCompra.findUnique({
          where: { id: OCId },
          include: { estado: true }
        });

        console.log(`[crearReceta] OC actual: ${JSON.stringify(oc)}`);

        if (oc && oc.estado.codigo === 'PENDIENTE') {
          const estadoEnProceso = await tx.estadoOrden.findUnique({
            where: { codigo: 'EN_PROCESO' }
          });
          const estadoPendiente = await tx.estadoOrden.findUnique({
            where: { codigo: 'PENDIENTE' }
          });

          console.log(`[crearReceta] estadoEnProceso ID: ${estadoEnProceso?.id}, estadoPendiente ID: ${estadoPendiente?.id}`);

          if (estadoEnProceso && estadoPendiente) {
            console.log(`[crearReceta] Transicionando OC ${OCId} de PENDIENTE a EN_PROCESO`);
            await tx.ordenCompra.update({
              where: { id: OCId },
              data: { estadoId: estadoEnProceso.id }
            });

            await tx.bitacoraEstado.create({
              data: {
                ordenCompraId: OCId,
                estadoAnteriorId: estadoPendiente.id,
                estadoNuevoId: estadoEnProceso.id,
                observacion: "Primera receta técnica registrada en el laboratorio"
              }
            });
            console.log(`[crearReceta] Bitácora registrada para OC ${OCId} EN_PROCESO.`);
          }
        }
      } else {
        console.error(`[crearReceta] Error: No se pudo resolver detalleOrdenId: ${datos.detalleOrdenId}`);
      }
      // -------------------------

      return tx.recetaTecnica.findUniqueOrThrow({
        where: { id: receta.id },
        include: {
          colorantes:      { orderBy: { createdAt: 'asc' } },
          composicionFibra: true,
          articulo:         true,
        },
      });
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
        estado:                recetaCreada.estado,
        secuenciaBanos:        recetaCreada.secuenciaBanos,
        iteraciones:           recetaCreada.iteraciones,
        colorHex:              recetaCreada.colorHex,
        colorRgb:              recetaCreada.colorRgb,
        colorMiniatura:        recetaCreada.colorMiniatura,
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
  // REGISTRAR ITERACIÓN (AJUSTE)
  // ---------------------------------------------------------------------------
  async registrarIteracion(id: number, datos: { colorantes: ColoranteInput[]; observaciones: string }): Promise<RecetaResponse> {
    const receta = await prisma.recetaTecnica.findUniqueOrThrow({
      where: { id },
      include: {
        colorantes: true,
        composicionFibra: true,
        articulo: true,
      },
    });

    // Validar existencia de colorantes
    const coloranteIds = datos.colorantes.map(c => c.coloranteId);
    const colorantesCatalogo = await prisma.coloranteCatalogo.findMany({
      where: { id: { in: coloranteIds } },
    });
    if (colorantesCatalogo.length !== coloranteIds.length) {
      throw new Error('Uno o más colorantes no existen en el catálogo.');
    }
    const mapColorantes = new Map(colorantesCatalogo.map(c => [c.id, c.nombre]));

    // Nueva iteración
    const iteracionesExistentes = Array.isArray(receta.iteraciones) ? (receta.iteraciones as any[]) : [];
    const numeroIteracion = iteracionesExistentes.length + 1;

    const nuevaIteracion = {
      iteracion: numeroIteracion,
      fecha: new Date().toISOString(),
      colorantes: datos.colorantes.map((c) => {
        const nombre = mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`;
        const gramos = Math.round(receta.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100;
        return {
          coloranteId: c.coloranteId,
          nombreColorante: nombre,
          porcentaje: c.porcentaje,
          gramos,
        };
      }),
      observacion: datos.observaciones || `Ajuste en iteración ${numeroIteracion}.`,
    };

    const iteracionesActualizadas = [...iteracionesExistentes, nuevaIteracion];

    // Transacción para actualizar
    const recetaActualizada = await prisma.$transaction(async (tx) => {
      // 1. Borrar colorantes viejos
      await tx.coloranteFormula.deleteMany({
        where: { recetaTecnicaId: id },
      });

      // 2. Insertar colorantes nuevos
      await tx.coloranteFormula.createMany({
        data: datos.colorantes.map((c) => ({
          recetaTecnicaId: id,
          coloranteId:     c.coloranteId,
          porcentaje:      c.porcentaje,
        })),
      });

      // 3. Actualizar receta (mueve a PROCESO)
      return tx.recetaTecnica.update({
        where: { id },
        data: {
          estado: 'PROCESO',
          iteraciones: iteracionesActualizadas as any,
        },
        include: {
          colorantes: { orderBy: { createdAt: 'asc' } },
          composicionFibra: true,
          articulo: true,
        },
      });
    });

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  recetaActualizada.composicionFibra.codigo,
      pesoRealKg:   recetaActualizada.pesoRealKg,
      relacionBano: recetaActualizada.relacionBano,
      colorantes:   recetaActualizada.colorantes.map((c) => ({
        coloranteId: c.coloranteId,
        porcentaje:  c.porcentaje,
      })),
    });

    return {
      receta: {
        id:                    recetaActualizada.id,
        detalleOrdenId:        recetaActualizada.detalleOrdenId,
        pesoRealKg:            recetaActualizada.pesoRealKg,
        articuloId:            recetaActualizada.articuloId,
        articulo:              recetaActualizada.articulo.nombre,
        composicionFibra:      recetaActualizada.composicionFibra.codigo,
        composicionFibraLabel: recetaActualizada.composicionFibra.etiqueta,
        relacionBano:          recetaActualizada.relacionBano,
        litrosAgua:            recetaActualizada.litrosAgua,
        descripcionColor:      recetaActualizada.descripcionColor,
        nivelIntensidad:       recetaActualizada.nivelIntensidad,
        observacionesTecnicas: recetaActualizada.observacionesTecnicas,
        estado:                recetaActualizada.estado,
        secuenciaBanos:        recetaActualizada.secuenciaBanos,
        iteraciones:           recetaActualizada.iteraciones,
        colorHex:              recetaActualizada.colorHex,
        colorRgb:              recetaActualizada.colorRgb,
        colorMiniatura:        recetaActualizada.colorMiniatura,
        createdAt:             recetaActualizada.createdAt.toISOString(),
        colorantes:            recetaActualizada.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },

  // ---------------------------------------------------------------------------
  // APROBAR RECETA (COLOR APROBADO)
  // ---------------------------------------------------------------------------
  async aprobarReceta(id: number): Promise<RecetaResponse> {
    const recetaActualizada = await prisma.$transaction(async (tx) => {
      const receta = await tx.recetaTecnica.update({
        where: { id },
        data: {
          estado: 'APROBADO',
        },
        include: {
          colorantes: { orderBy: { createdAt: 'asc' }, include: { colorante: true } },
          composicionFibra: true,
          articulo: true,
        },
      });

      console.log(`[aprobarReceta] Receta ${id} aprobada en DB. detalleOrdenId: ${receta.detalleOrdenId}`);

      // --- AUTOMATIZACIÓN 2 ---
      const det = await tx.detalleOrden.findUnique({
        where: { id: receta.detalleOrdenId },
        select: { ordenCompraId: true }
      });

      if (det) {
        const OCId = det.ordenCompraId;
        console.log(`[aprobarReceta] Resolviendo ordenCompraId: ${OCId}`);

        const totalLotes = await tx.detalleOrden.count({
          where: { ordenCompraId: OCId }
        });
        const lotesAprobados = await tx.detalleOrden.count({
          where: {
            ordenCompraId: OCId,
            recetaTecnica: {
              estado: 'APROBADO'
            }
          }
        });

        console.log(`[aprobarReceta] OCId: ${OCId} - totalLotes: ${totalLotes}, lotesAprobados: ${lotesAprobados}`);

        if (totalLotes > 0 && lotesAprobados === totalLotes) {
          const estadoEnProceso = await tx.estadoOrden.findUnique({
            where: { codigo: 'EN_PROCESO' }
          });
          const estadoCompletada = await tx.estadoOrden.findUnique({
            where: { codigo: 'COMPLETADA' }
          });

          console.log(`[aprobarReceta] estadoEnProceso ID: ${estadoEnProceso?.id}, estadoCompletada ID: ${estadoCompletada?.id}`);

          if (estadoEnProceso && estadoCompletada) {
            const oc = await tx.ordenCompra.findUnique({
              where: { id: OCId },
              select: { estadoId: true }
            });
            if (oc && oc.estadoId !== estadoCompletada.id) {
              console.log(`[aprobarReceta] Transicionando OC ${OCId} a COMPLETADA`);
              await tx.ordenCompra.update({
                where: { id: OCId },
                data: { estadoId: estadoCompletada.id }
              });
              await tx.bitacoraEstado.create({
                data: {
                  ordenCompraId: OCId,
                  estadoAnteriorId: estadoEnProceso.id,
                  estadoNuevoId: estadoCompletada.id,
                  observacion: "Todos los lotes de la OC fueron aprobados en Lab Histórico"
                }
              });
              console.log(`[aprobarReceta] Bitácora registrada para OC ${OCId} COMPLETADA.`);
            }
          }
        }
      } else {
        console.error(`[aprobarReceta] Error: No se pudo resolver detalleOrdenId: ${receta.detalleOrdenId}`);
      }
      // -------------------------

      return receta;
    });

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  recetaActualizada.composicionFibra.codigo,
      pesoRealKg:   recetaActualizada.pesoRealKg,
      relacionBano: recetaActualizada.relacionBano,
      colorantes:   recetaActualizada.colorantes.map((c) => ({
        coloranteId: c.coloranteId,
        porcentaje:  c.porcentaje,
      })),
    });

    const mapColorantes = new Map(recetaActualizada.colorantes.map(c => [c.coloranteId, c.colorante.nombre]));

    return {
      receta: {
        id:                    recetaActualizada.id,
        detalleOrdenId:        recetaActualizada.detalleOrdenId,
        pesoRealKg:            recetaActualizada.pesoRealKg,
        articuloId:            recetaActualizada.articuloId,
        articulo:              recetaActualizada.articulo.nombre,
        composicionFibra:      recetaActualizada.composicionFibra.codigo,
        composicionFibraLabel: recetaActualizada.composicionFibra.etiqueta,
        relacionBano:          recetaActualizada.relacionBano,
        litrosAgua:            recetaActualizada.litrosAgua,
        descripcionColor:      recetaActualizada.descripcionColor,
        nivelIntensidad:       recetaActualizada.nivelIntensidad,
        observacionesTecnicas: recetaActualizada.observacionesTecnicas,
        estado:                recetaActualizada.estado,
        secuenciaBanos:        recetaActualizada.secuenciaBanos,
        iteraciones:           recetaActualizada.iteraciones,
        colorHex:              recetaActualizada.colorHex,
        colorRgb:              recetaActualizada.colorRgb,
        colorMiniatura:        recetaActualizada.colorMiniatura,
        createdAt:             recetaActualizada.createdAt.toISOString(),
        colorantes:            recetaActualizada.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS RECETAS (CON FILTRADO POR ESTADO)
  // ---------------------------------------------------------------------------
  async obtenerRecetas(estado?: string) {
    const whereClause = estado ? { estado } : {};
    const recetas = await prisma.recetaTecnica.findMany({
      where: whereClause,
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
      estado:                r.estado,
      secuenciaBanos:        r.secuenciaBanos,
      iteraciones:           r.iteraciones,
      colorHex:              r.colorHex,
      colorRgb:              r.colorRgb,
      colorMiniatura:        r.colorMiniatura,
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
        estado:                receta.estado,
        secuenciaBanos:        receta.secuenciaBanos,
        iteraciones:           receta.iteraciones,
        colorHex:              receta.colorHex,
        colorRgb:              receta.colorRgb,
        colorMiniatura:        receta.colorMiniatura,
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

  async guardarColor(id: number, datos: { colorHex: string | null; colorRgb: any; colorMiniatura: string | null }): Promise<RecetaResponse> {
    const recetaActualizada = await prisma.recetaTecnica.update({
      where: { id },
      data: {
        colorHex: datos.colorHex,
        colorRgb: datos.colorRgb,
        colorMiniatura: datos.colorMiniatura,
      },
      include: {
        colorantes: { orderBy: { createdAt: 'asc' }, include: { colorante: true } },
        composicionFibra: true,
        articulo: true,
      },
    });

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  recetaActualizada.composicionFibra.codigo,
      pesoRealKg:   recetaActualizada.pesoRealKg,
      relacionBano: recetaActualizada.relacionBano,
      colorantes:   recetaActualizada.colorantes.map((c) => ({
        coloranteId: c.coloranteId,
        porcentaje:  c.porcentaje,
      })),
    });

    const mapColorantes = new Map(recetaActualizada.colorantes.map(c => [c.coloranteId, c.colorante.nombre]));

    return {
      receta: {
        id:                    recetaActualizada.id,
        detalleOrdenId:        recetaActualizada.detalleOrdenId,
        pesoRealKg:            recetaActualizada.pesoRealKg,
        articuloId:            recetaActualizada.articuloId,
        articulo:              recetaActualizada.articulo.nombre,
        composicionFibra:      recetaActualizada.composicionFibra.codigo,
        composicionFibraLabel: recetaActualizada.composicionFibra.etiqueta,
        relacionBano:          recetaActualizada.relacionBano,
        litrosAgua:            recetaActualizada.litrosAgua,
        descripcionColor:      recetaActualizada.descripcionColor,
        nivelIntensidad:       recetaActualizada.nivelIntensidad,
        observacionesTecnicas: recetaActualizada.observacionesTecnicas,
        estado:                recetaActualizada.estado,
        secuenciaBanos:        recetaActualizada.secuenciaBanos,
        iteraciones:           recetaActualizada.iteraciones,
        colorHex:              recetaActualizada.colorHex,
        colorRgb:              recetaActualizada.colorRgb,
        colorMiniatura:        recetaActualizada.colorMiniatura,
        createdAt:             recetaActualizada.createdAt.toISOString(),
        colorantes:            recetaActualizada.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
        })),
      },
      motorQuimico,
    };
  },
};
