// =============================================================================
// SERVITEX — Servicio de Órdenes de Compra (Versión 3.0 — Esquema Normalizado)
// =============================================================================
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCatalogosCache, resolverCodigo } from '../lib/catalogos.cache';
import {
  CrearOrdenInput,
  LiquidacionOC,
  ActualizarEstadoInput,
} from '../types/ordenes.types';

const IGV_RATE = 0.18;

// Tipo de retorno enriquecido con todos los datos anidados
type OrdenConDetalles = Prisma.OrdenCompraGetPayload<{
  include: {
    cliente: { include: { tipoCliente: true } };
    estado: true;
    detalles: {
      include: {
        articulo: true;
        unidadMedida: true;
      };
    };
  };
}>;

interface OrdenResponse {
  orden: OrdenConDetalles;
  liquidacion: LiquidacionOC;
}

const INCLUDE_ORDEN_COMPLETA = {
  cliente: { include: { tipoCliente: true } },
  estado: true,
  detalles: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      articulo: true,
      unidadMedida: true,
      recetaTecnica: true,
    },
  },
} satisfies Prisma.OrdenCompraInclude;

export const ordenesService = {

  // ---------------------------------------------------------------------------
  // CREAR ORDEN CON DETALLES — Transacción atómica
  // ---------------------------------------------------------------------------
  async crearOrdenConDetalles(datos: CrearOrdenInput): Promise<OrdenResponse> {
    const cache = await getCatalogosCache();

    const tipoClienteId = resolverCodigo(cache.tiposCliente, datos.tipoClienteCodigo, 'tipos_cliente');
    const estadoPendienteId = resolverCodigo(cache.estadosOrden, 'PENDIENTE', 'estados_orden');
    const metrosId = resolverCodigo(cache.unidadesMedida, 'METROS', 'unidades_medida');

    const ordenCreada = await prisma.$transaction(async (tx) => {

      const cliente = await tx.cliente.upsert({
        where: {
          nombre_tipoCliente: {
            nombre: datos.clienteNombre.trim(),
            tipoClienteId,
          },
        },
        update: { updatedAt: new Date() },
        create: {
          nombre: datos.clienteNombre.trim(),
          tipoClienteId,
        },
      });

      const ordenCabecera = await tx.ordenCompra.create({
        data: {
          numeroOC: datos.numeroOC.trim().toUpperCase(),
          clienteId: cliente.id,
          estadoId: estadoPendienteId,
          observaciones: datos.observaciones?.trim() ?? null,
        },
      });

      const detallesData = [];
      for (const detalle of datos.detalles) {
        const cantidad = detalle.cantidad;
        const precioPorMetro = detalle.precioPorMetro;
        const totalCalculado = Math.round(cantidad * precioPorMetro * 100) / 100;
        const unidadId = detalle.unidadMedidaId ?? metrosId;

        const nombreArticulo = detalle.articuloNombre.trim();

        // Buscar artículo existente (insensible a mayúsculas/minúsculas)
        let articulo = await tx.articuloTextil.findFirst({
          where: {
            nombre: {
              equals: nombreArticulo,
              mode: 'insensitive',
            },
          },
        });

        // Crear si no existe
        if (!articulo) {
          articulo = await tx.articuloTextil.create({
            data: {
              nombre: nombreArticulo,
              descripcion: 'Artículo creado dinámicamente desde Órdenes de Compra.',
            },
          });
        }

        detallesData.push({
          ordenCompraId: ordenCabecera.id,
          articuloId: articulo.id,
          unidadMedidaId: unidadId,
          cantidad,
          colorSolicitado: detalle.colorSolicitado.trim(),
          precioPorMetro,
          total: totalCalculado,
        });
      }

      await tx.detalleOrden.createMany({ data: detallesData });

      // Registrar primera entrada en bitácora
      await tx.bitacoraEstado.create({
        data: {
          ordenCompraId: ordenCabecera.id,
          estadoAnteriorId: estadoPendienteId,
          estadoNuevoId: estadoPendienteId,
          observacion: 'Orden registrada en el sistema.',
        },
      });

      return tx.ordenCompra.findUniqueOrThrow({
        where: { id: ordenCabecera.id },
        include: INCLUDE_ORDEN_COMPLETA,
      });
    });

    const liquidacion = calcularLiquidacion(ordenCreada.detalles);
    return { orden: ordenCreada, liquidacion };
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS ÓRDENES (paginación y filtros)
  // ---------------------------------------------------------------------------
  async obtenerOrdenes(opciones: {
    estadoCodigo?: string;
    clienteId?: number;
    pagina: number;
    limite: number;
  }) {
    const { estadoCodigo, clienteId, pagina, limite } = opciones;
    const skip = (pagina - 1) * limite;

    // Resolver el código de estado a ID si se proporcionó
    let estadoId: number | undefined;
    if (estadoCodigo) {
      const cache = await getCatalogosCache();
      estadoId = cache.estadosOrden.get(estadoCodigo);
    }

    const where: Prisma.OrdenCompraWhereInput = {
      ...(estadoId && { estadoId }),
      ...(clienteId && { clienteId }),
    };

    const [total, ordenes] = await Promise.all([
      prisma.ordenCompra.count({ where }),
      prisma.ordenCompra.findMany({
        where,
        skip,
        take: limite,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE_ORDEN_COMPLETA,
      }),
    ]);

    return {
      ordenes,
      paginacion: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // OBTENER ORDEN POR ID
  // ---------------------------------------------------------------------------
  async obtenerOrdenPorId(id: number): Promise<OrdenResponse | null> {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id },
      include: INCLUDE_ORDEN_COMPLETA,
    });
    if (!orden) return null;
    return { orden, liquidacion: calcularLiquidacion(orden.detalles) };
  },

  // ---------------------------------------------------------------------------
  // OBTENER ORDEN POR NÚMERO DE OC
  // ---------------------------------------------------------------------------
  async obtenerOrdenPorNumero(numeroOC: string): Promise<OrdenResponse | null> {
    const orden = await prisma.ordenCompra.findUnique({
      where: { numeroOC: numeroOC.toUpperCase() },
      include: INCLUDE_ORDEN_COMPLETA,
    });
    if (!orden) return null;
    return { orden, liquidacion: calcularLiquidacion(orden.detalles) };
  },

  // ---------------------------------------------------------------------------
  // ACTUALIZAR ESTADO DE UNA OC (con bitácora automática)
  // ---------------------------------------------------------------------------
  async actualizarEstado(id: number, input: ActualizarEstadoInput) {
    const cache = await getCatalogosCache();
    const nuevoEstadoId = resolverCodigo(cache.estadosOrden, input.estadoCodigo, 'estados_orden');

    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) return null;

    return prisma.$transaction(async (tx) => {
      const actualizada = await tx.ordenCompra.update({
        where: { id },
        data: { estadoId: nuevoEstadoId },
        include: INCLUDE_ORDEN_COMPLETA,
      });

      // Registrar el cambio en bitácora
      await tx.bitacoraEstado.create({
        data: {
          ordenCompraId: id,
          estadoAnteriorId: existe.estadoId,
          estadoNuevoId: nuevoEstadoId,
        },
      });

      return actualizada;
    });
  },

  // ---------------------------------------------------------------------------
  // ELIMINAR ORDEN DE COMPRA (con borrado de NotaEntrega y cascade implícito)
  // ---------------------------------------------------------------------------
  async eliminarOrden(id: number): Promise<boolean> {
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) return false;

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar NotaEntrega si existe (ya que no tiene onDelete: Cascade)
      await tx.notaEntrega.deleteMany({
        where: { ordenCompraId: id }
      });

      // 2. Eliminar la Orden de Compra (Prisma cascada se encarga de Detalles, Recetas, Incidencias y Bitácora)
      await tx.ordenCompra.delete({
        where: { id }
      });
    });

    return true;
  },
};

// =============================================================================
// Cálculo de liquidación financiera (sin cambios)
// =============================================================================
function calcularLiquidacion(
  detalles: Array<{ cantidad: number; precioPorMetro: number; total: number }>
): LiquidacionOC {
  const subtotalVenta = detalles.reduce((acc, d) => acc + d.total, 0);
  const igv = Math.round(subtotalVenta * IGV_RATE * 100) / 100;
  const totalReal = Math.round((subtotalVenta + igv) * 100) / 100;
  const metrosTotales = detalles.reduce((acc, d) => acc + d.cantidad, 0);

  return {
    subtotalVenta: Math.round(subtotalVenta * 100) / 100,
    igv,
    totalReal,
    cantidadLotes: detalles.length,
    metrosTotales: Math.round(metrosTotales * 100) / 100,
  };
}
