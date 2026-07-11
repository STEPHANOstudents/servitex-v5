// =============================================================================
// SERVITEX — Servicio de Recetas Técnicas
// Versión 3.0 — Esquema Normalizado con Motor Químico integrado.
//
// Responsabilidades:
//   - CRUD de RecetasTécnicas con transacciones atómicas en Prisma
//   - Automatización de estados de OC (PENDIENTE → EN_PROCESO → COMPLETADA)
//   - Historial de iteraciones (ajustes de colorantes)
//   - Integración con el Motor Químico para calcular baños y dosis
// =============================================================================
import { prisma } from '../lib/prisma';
import { getCatalogosCache, resolverCodigo } from '../lib/catalogos.cache';
import {
  ejecutarMotorQuimico,
  calcularNivelIntensidad,
} from '../engines/quimico.engine';
import { calcularCosteo } from '../engines/costeo.engine';
import type { CrearRecetaInput, RecetaResponse, RecetaListDTO, ColoranteInput } from '../types/recetas.types';

// ---------------------------------------------------------------------------
// Tipo Prisma enriquecido — resultado de findUnique/update con includes
// Se usa internamente para que TypeScript conozca la forma del objeto.
// ---------------------------------------------------------------------------
type RecetaConRelaciones = {
  id: number;
  detalleOrdenId: number | null;
  pesoRealKg: number;
  articuloId: number;
  relacionBano: number;
  litrosAgua: number;
  descripcionColor: string;
  nivelIntensidad: number;
  observacionesTecnicas: string | null;
  estado: string;
  secuenciaBanos: any;
  iteraciones: any;
  colorHex: string | null;
  colorRgb: any;
  colorMiniatura: string | null;
  costoAgua: number | null;
  costoQuimicos: number | null;
  costoColorantes: number | null;
  costoManoObra: number | null;
  costoTotal: number | null;
  createdAt: Date;
  articulo: { nombre: string };
  composicionFibra: { codigo: string; etiqueta: string };
  colorantes: Array<{ coloranteId: number; porcentaje: number; colorante?: { nombre: string } }>;
};

// ---------------------------------------------------------------------------
// Includes Prisma reutilizables — centraliza la proyección de relaciones
// ---------------------------------------------------------------------------

/** Include para operaciones que NO necesitan el nombre del colorante anidado. */
const INCLUDE_SIN_COLORANTE_NOMBRE = {
  colorantes:       { orderBy: { createdAt: 'asc' as const } },
  composicionFibra: true,
  articulo:         true,
} as const;

/** Include para operaciones que SÍ necesitan el nombre del colorante anidado. */
const INCLUDE_CON_COLORANTE_NOMBRE = {
  colorantes:       { orderBy: { createdAt: 'asc' as const }, include: { colorante: true } },
  composicionFibra: true,
  articulo:         true,
} as const;

// =============================================================================
// HELPER: Mapear Prisma row → RecetaResponse
// Elimina la duplicación de esta transformación que antes aparecía 4 veces.
// mapColorantes puede ser undefined; en ese caso se usa c.colorante.nombre.
// =============================================================================
function mapRecetaToDTO(
  r: RecetaConRelaciones,
  motorQuimico: ReturnType<typeof ejecutarMotorQuimico>,
  mapColorantes?: Map<number, string>
): RecetaResponse {
  return {
    receta: {
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
      costoAgua:             r.costoAgua,
      costoQuimicos:         r.costoQuimicos,
      costoColorantes:       r.costoColorantes,
      costoManoObra:         r.costoManoObra,
      costoTotal:            r.costoTotal,
      createdAt:             r.createdAt.toISOString(),
      colorantes: r.colorantes.map((c) => {
        // Si viene un mapa explícito lo usamos; si no, usamos el join de Prisma.
        const nombre = mapColorantes
          ? (mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`)
          : (c.colorante?.nombre ?? `ID:${c.coloranteId}`);
        return { coloranteId: c.coloranteId, nombreColorante: nombre, porcentaje: c.porcentaje };
      }),
    },
    motorQuimico,
  };
}

// =============================================================================
// HELPER: Construir Motor Químico a partir de una receta con relaciones
// =============================================================================
function buildMotorQuimico(r: RecetaConRelaciones) {
  return ejecutarMotorQuimico({
    composicion:  r.composicionFibra.codigo,
    pesoRealKg:   r.pesoRealKg,
    relacionBano: r.relacionBano,
    colorantes:   r.colorantes.map((c) => ({
      coloranteId: c.coloranteId,
      porcentaje:  c.porcentaje,
    })),
  });
}

// =============================================================================
// HELPER: Automatizar transición de estado de la OC dentro de una transacción.
// Cuando se crea la PRIMERA receta técnica de una OC, la OC pasa a EN_PROCESO.
// =============================================================================
async function transicionarOCaEnProceso(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  detalleOrdenId: number
): Promise<void> {
  const det = await tx.detalleOrden.findUnique({
    where: { id: detalleOrdenId },
    select: { ordenCompraId: true },
  });
  if (!det) return;

  const oc = await tx.ordenCompra.findUnique({
    where: { id: det.ordenCompraId },
    include: { estado: true },
  });
  if (!oc || oc.estado.codigo !== 'PENDIENTE') return;

  // Buscar los dos estados necesarios para la transición
  const [estadoPendiente, estadoEnProceso] = await Promise.all([
    tx.estadoOrden.findUnique({ where: { codigo: 'PENDIENTE' } }),
    tx.estadoOrden.findUnique({ where: { codigo: 'EN_PROCESO' } }),
  ]);
  if (!estadoPendiente || !estadoEnProceso) return;

  await tx.ordenCompra.update({
    where: { id: oc.id },
    data: { estadoId: estadoEnProceso.id },
  });

  await tx.bitacoraEstado.create({
    data: {
      ordenCompraId:    oc.id,
      estadoAnteriorId: estadoPendiente.id,
      estadoNuevoId:    estadoEnProceso.id,
      observacion:      'Primera receta técnica registrada en el laboratorio.',
    },
  });
}

// =============================================================================
// HELPER: Automatizar transición de estado de la OC a COMPLETADA.
// Ocurre cuando TODOS los lotes de la OC tienen receta en estado APROBADO.
// =============================================================================
async function transicionarOCaCompletada(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  detalleOrdenId: number
): Promise<void> {
  const det = await tx.detalleOrden.findUnique({
    where: { id: detalleOrdenId },
    select: { ordenCompraId: true },
  });
  if (!det) return;

  const OCId = det.ordenCompraId;

  const [totalLotes, lotesAprobados] = await Promise.all([
    tx.detalleOrden.count({ where: { ordenCompraId: OCId } }),
    tx.detalleOrden.count({ where: { ordenCompraId: OCId, recetaTecnica: { estado: 'APROBADO' } } }),
  ]);

  // Solo completar si hay lotes y todos están aprobados
  if (totalLotes === 0 || lotesAprobados !== totalLotes) return;

  const [estadoEnProceso, estadoCompletada] = await Promise.all([
    tx.estadoOrden.findUnique({ where: { codigo: 'EN_PROCESO' } }),
    tx.estadoOrden.findUnique({ where: { codigo: 'COMPLETADA' } }),
  ]);
  if (!estadoEnProceso || !estadoCompletada) return;

  const oc = await tx.ordenCompra.findUnique({
    where: { id: OCId },
    select: { estadoId: true },
  });
  // Evitar actualizar si ya está en COMPLETADA
  if (!oc || oc.estadoId === estadoCompletada.id) return;

  await tx.ordenCompra.update({
    where: { id: OCId },
    data: { estadoId: estadoCompletada.id },
  });

  await tx.bitacoraEstado.create({
    data: {
      ordenCompraId:    OCId,
      estadoAnteriorId: estadoEnProceso.id,
      estadoNuevoId:    estadoCompletada.id,
      observacion:      'Todos los lotes de la OC fueron aprobados en Lab Histórico.',
    },
  });
}

// =============================================================================
// SERVICIO DE RECETAS
// =============================================================================
export const recetasService = {

  // ---------------------------------------------------------------------------
  // CREAR RECETA — Transacción atómica (nueva formulación inicial)
  // 1. Resuelve catálogos e IDs de colorantes
  // 2. Ejecuta el Motor Químico para obtener la secuencia de baños
  // 3. Persiste la receta + colorantes en una sola transacción
  // 4. Automatiza la transición de OC PENDIENTE → EN_PROCESO
  // ---------------------------------------------------------------------------
  async crearReceta(datos: CrearRecetaInput): Promise<RecetaResponse> {
    const cache = await getCatalogosCache();

    const composicionFibraId = resolverCodigo(
      cache.composicionesFibra,
      datos.composicionFibraCodigo,
      'composiciones_fibra'
    );

    // Verificar existencia del lote y que no tenga receta previa
    const detalle = await prisma.detalleOrden.findUnique({
      where: { id: datos.detalleOrdenId },
      include: { recetaTecnica: true },
    });
    if (!detalle) throw new Error(`No existe un DetalleOrden con ID ${datos.detalleOrdenId}.`);
    if (detalle.recetaTecnica) {
      throw new Error(`El lote con ID ${datos.detalleOrdenId} ya tiene una Receta Técnica registrada.`);
    }

    // Verificar que todos los colorantes existen y construir mapa id→nombre
    const coloranteIds = datos.colorantes.map(c => c.coloranteId);
    const colorantesCatalogo = await prisma.coloranteCatalogo.findMany({
      where: { id: { in: coloranteIds } },
    });
    if (colorantesCatalogo.length !== coloranteIds.length) {
      throw new Error('Uno o más colorantes no existen en el catálogo.');
    }
    const mapColorantes = new Map(colorantesCatalogo.map(c => [c.id, c.nombre]));

    // Calcular valores derivados en servidor (evita que el cliente los falsifique)
    const litrosAgua     = Math.round(datos.pesoRealKg * datos.relacionBano * 100) / 100;
    const { nivel: nivelIntensidad } = calcularNivelIntensidad(datos.colorantes);

    // Obtener código de fibra para el Motor Químico
    const fibraRecord = await prisma.composicionFibra.findUniqueOrThrow({
      where: { id: composicionFibraId },
    });

    const motorQuimico = ejecutarMotorQuimico({
      composicion:  fibraRecord.codigo,
      pesoRealKg:   datos.pesoRealKg,
      relacionBano: datos.relacionBano,
      colorantes:   datos.colorantes,
    });

    const recetaCreada = await prisma.$transaction(async (tx) => {
      // Buscar o crear artículo por nombre (texto libre, insensible a mayúsculas)
      const nombreArticulo = datos.articuloNombre.trim();
      let articulo = await tx.articuloTextil.findFirst({
        where: { nombre: { equals: nombreArticulo, mode: 'insensitive' } },
      });
      if (!articulo) {
        articulo = await tx.articuloTextil.create({
          data: { nombre: nombreArticulo, descripcion: 'Creado dinámicamente desde Lab.' },
        });
      }

      // Obtener precios de insumos y calcular costeo
      const precios = await tx.precioInsumo.findMany();
      const preciosMap = new Map<string, number>(precios.map(p => [p.codigoInsumo, p.precioUnitario]));

      const colorantesConNombre = datos.colorantes.map(c => ({
        nombreColorante: mapColorantes.get(c.coloranteId) ?? '',
        porcentaje: c.porcentaje,
      }));
      const costeo = calcularCosteo({
        motorQuimico,
        colorantes: colorantesConNombre,
        preciosMap,
      });

      // Generar primera iteración en el historial con sus costos asociados
      const primeraIteracion = {
        iteracion: 1,
        fecha:     new Date().toISOString(),
        colorantes: datos.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
          gramos:          Math.round(datos.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100,
        })),
        observacion: 'Primera formulación inicial.',
        costoAgua:             costeo.costoAgua,
        costoQuimicos:         costeo.costoQuimicos,
        costoColorantes:       costeo.costoColorantes,
        costoManoObra:         costeo.costoManoObra,
        costoTotal:            costeo.costoTotal,
      };

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
          costoAgua:             costeo.costoAgua,
          costoQuimicos:         costeo.costoQuimicos,
          costoColorantes:       costeo.costoColorantes,
          costoManoObra:         costeo.costoManoObra,
          costoTotal:            costeo.costoTotal,
        },
      });

      await tx.coloranteFormula.createMany({
        data: datos.colorantes.map((c) => ({
          recetaTecnicaId: receta.id,
          coloranteId:     c.coloranteId,
          porcentaje:      c.porcentaje,
        })),
      });

      // Automatización: OC pasa de PENDIENTE a EN_PROCESO al registrar la primera receta
      await transicionarOCaEnProceso(tx, datos.detalleOrdenId);

      return tx.recetaTecnica.findUniqueOrThrow({
        where:   { id: receta.id },
        include: INCLUDE_SIN_COLORANTE_NOMBRE,
      });
    });

    return mapRecetaToDTO(recetaCreada as RecetaConRelaciones, motorQuimico, mapColorantes);
  },

  // ---------------------------------------------------------------------------
  // REGISTRAR ITERACIÓN — Ajuste de colorantes sobre una receta existente
  // Reemplaza los colorantes actuales y agrega una entrada al historial.
  // La receta pasa al estado PROCESO.
  // ---------------------------------------------------------------------------
  async registrarIteracion(
    id: number,
    datos: { colorantes: ColoranteInput[]; observaciones: string }
  ): Promise<RecetaResponse> {
    const receta = await prisma.recetaTecnica.findUniqueOrThrow({
      where:   { id },
      include: INCLUDE_SIN_COLORANTE_NOMBRE,
    });

    // Verificar colorantes y construir mapa id→nombre
    const coloranteIds      = datos.colorantes.map(c => c.coloranteId);
    const colorantesCatalogo = await prisma.coloranteCatalogo.findMany({
      where: { id: { in: coloranteIds } },
    });
    if (colorantesCatalogo.length !== coloranteIds.length) {
      throw new Error('Uno o más colorantes no existen en el catálogo.');
    }
    const mapColorantes = new Map(colorantesCatalogo.map(c => [c.id, c.nombre]));

    const iteracionesExistentes = Array.isArray(receta.iteraciones)
      ? (receta.iteraciones as any[])
      : [];
    const numeroIteracion = iteracionesExistentes.length + 1;

    const recetaActualizada = await prisma.$transaction(async (tx) => {
      // Reemplazar colorantes: borrar → insertar
      await tx.coloranteFormula.deleteMany({ where: { recetaTecnicaId: id } });
      await tx.coloranteFormula.createMany({
        data: datos.colorantes.map((c) => ({
          recetaTecnicaId: id,
          coloranteId:     c.coloranteId,
          porcentaje:      c.porcentaje,
        })),
      });

      // Recalcular motor químico con la nueva secuencia de colorantes
      const motorQuimico = ejecutarMotorQuimico({
        composicion:  receta.composicionFibra.codigo,
        pesoRealKg:   receta.pesoRealKg,
        relacionBano: receta.relacionBano,
        colorantes:   datos.colorantes,
      });

      // Obtener precios y calcular costeo actualizado
      const precios = await tx.precioInsumo.findMany();
      const preciosMap = new Map<string, number>(precios.map(p => [p.codigoInsumo, p.precioUnitario]));

      const colorantesConNombre = datos.colorantes.map(c => ({
        nombreColorante: mapColorantes.get(c.coloranteId) ?? '',
        porcentaje: c.porcentaje,
      }));
      const costeo = calcularCosteo({
        motorQuimico,
        colorantes: colorantesConNombre,
        preciosMap,
      });

      // Construir nueva iteración con sus costos correspondientes
      const nuevaIteracion = {
        iteracion: numeroIteracion,
        fecha:     new Date().toISOString(),
        colorantes: datos.colorantes.map((c) => ({
          coloranteId:     c.coloranteId,
          nombreColorante: mapColorantes.get(c.coloranteId) ?? `ID:${c.coloranteId}`,
          porcentaje:      c.porcentaje,
          gramos:          Math.round(receta.pesoRealKg * 1000 * (c.porcentaje / 100) * 100) / 100,
        })),
        observacion:     datos.observaciones || `Ajuste en iteración ${numeroIteracion}.`,
        costoAgua:       costeo.costoAgua,
        costoQuimicos:   costeo.costoQuimicos,
        costoColorantes: costeo.costoColorantes,
        costoManoObra:   costeo.costoManoObra,
        costoTotal:      costeo.costoTotal,
      };

      // Actualizar receta: agrega iteración al historial, mueve a PROCESO y guarda costos
      return tx.recetaTecnica.update({
        where:   { id },
        data:    {
          estado: 'PROCESO',
          iteraciones: [...iteracionesExistentes, nuevaIteracion] as any,
          costoAgua:             costeo.costoAgua,
          costoQuimicos:         costeo.costoQuimicos,
          costoColorantes:       costeo.costoColorantes,
          costoManoObra:         costeo.costoManoObra,
          costoTotal:            costeo.costoTotal,
        },
        include: INCLUDE_SIN_COLORANTE_NOMBRE,
      });
    });

    const motorQuimico = buildMotorQuimico(recetaActualizada as RecetaConRelaciones);
    return mapRecetaToDTO(recetaActualizada as RecetaConRelaciones, motorQuimico, mapColorantes);
  },

  // ---------------------------------------------------------------------------
  // APROBAR RECETA — Marca el color como aprobado definitivo
  // 1. Cambia estado de la receta a APROBADO
  // 2. Automatiza: si TODOS los lotes de la OC están aprobados → COMPLETADA
  // ---------------------------------------------------------------------------
  async aprobarReceta(id: number): Promise<RecetaResponse> {
    const recetaActualizada = await prisma.$transaction(async (tx) => {
      const receta = await tx.recetaTecnica.update({
        where:   { id },
        data:    { estado: 'APROBADO' },
        include: INCLUDE_CON_COLORANTE_NOMBRE,
      });

      // Automatización: OC pasa a COMPLETADA si todos los lotes están aprobados
      if (receta.detalleOrdenId) {
        await transicionarOCaCompletada(tx, receta.detalleOrdenId);
      }

      return receta;
    });

    const motorQuimico = buildMotorQuimico(recetaActualizada as RecetaConRelaciones);
    return mapRecetaToDTO(recetaActualizada as RecetaConRelaciones, motorQuimico);
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS RECETAS — Con filtro de estado opcional
  // Incluye datos del lote (OC + cliente) para mostrar contexto en el tablero.
  // ---------------------------------------------------------------------------
  async obtenerRecetas(estado?: string): Promise<RecetaListDTO[]> {
    const recetas = await prisma.recetaTecnica.findMany({
      where:   estado ? { estado } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        colorantes:       { orderBy: { createdAt: 'asc' }, include: { colorante: true } },
        composicionFibra: true,
        articulo:         true,
        detalleOrden: {
          include: { ordenCompra: { include: { cliente: true } } },
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
      costoAgua:             r.costoAgua,
      costoQuimicos:         r.costoQuimicos,
      costoColorantes:       r.costoColorantes,
      costoManoObra:         r.costoManoObra,
      costoTotal:            r.costoTotal,
      createdAt:             r.createdAt.toISOString(),
      colorantes: r.colorantes.map((c) => ({
        coloranteId:     c.coloranteId,
        nombreColorante: c.colorante.nombre,
        porcentaje:      c.porcentaje,
      })),
      lote: r.detalleOrden
        ? {
            colorSolicitado:     r.detalleOrden.colorSolicitado,
            descripcionArticulo: r.articulo.nombre,
            cantidad:            r.detalleOrden.cantidad,
            numeroOC:            r.detalleOrden.ordenCompra.numeroOC,
            cliente:             r.detalleOrden.ordenCompra.cliente.nombre,
          }
        : undefined,
    }));
  },

  // ---------------------------------------------------------------------------
  // OBTENER RECETA POR ID — Con re-ejecución del Motor Químico
  // Recalcula la secuencia de baños para asegurar consistencia.
  // ---------------------------------------------------------------------------
  async obtenerRecetaPorId(id: number): Promise<RecetaResponse | null> {
    const receta = await prisma.recetaTecnica.findUnique({
      where:   { id },
      include: INCLUDE_CON_COLORANTE_NOMBRE,
    });
    if (!receta) return null;

    const motorQuimico = buildMotorQuimico(receta as RecetaConRelaciones);
    return mapRecetaToDTO(receta as RecetaConRelaciones, motorQuimico);
  },

  // ---------------------------------------------------------------------------
  // GUARDAR COLOR — Persiste resultado del análisis de color por imagen
  // Guarda colorHex, colorRgb y miniatura en base64 en la receta.
  // ---------------------------------------------------------------------------
  async guardarColor(
    id: number,
    datos: { colorHex: string | null; colorRgb: any; colorMiniatura: string | null }
  ): Promise<RecetaResponse> {
    const recetaActualizada = await prisma.recetaTecnica.update({
      where:   { id },
      data:    { colorHex: datos.colorHex, colorRgb: datos.colorRgb, colorMiniatura: datos.colorMiniatura },
      include: INCLUDE_CON_COLORANTE_NOMBRE,
    });

    const motorQuimico = buildMotorQuimico(recetaActualizada as RecetaConRelaciones);
    return mapRecetaToDTO(recetaActualizada as RecetaConRelaciones, motorQuimico);
  },

  // ---------------------------------------------------------------------------
  // ELIMINAR RECETA TÉCNICA — Elimina la receta y sus colorantes asociados
  // ---------------------------------------------------------------------------
  async eliminarReceta(id: number): Promise<boolean> {
    const existe = await prisma.recetaTecnica.findUnique({ where: { id } });
    if (!existe) return false;

    await prisma.recetaTecnica.delete({ where: { id } });
    return true;
  },
};
