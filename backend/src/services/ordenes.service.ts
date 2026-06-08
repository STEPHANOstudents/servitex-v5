// =============================================================================
// SERVITEX — Servicio de Órdenes de Compra (Capa de Negocio)
// Contiene toda la lógica de negocio: transacciones, cálculos y reglas del dominio.
//
// REGLA CRÍTICA: El backend es la única fuente de verdad matemática.
//   total_fila = cantidad (Float) * precioPorMetro (Float)
//   El valor "total" del cliente SIEMPRE se descarta y se recalcula aquí.
// =============================================================================
import { EstadoOrden, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  CrearOrdenInput,
  LiquidacionOC,
  ApiResponse,
} from '../types/ordenes.types';

// ---------------------------------------------------------------------------
// Constante financiera
// ---------------------------------------------------------------------------
const IGV_RATE: number = 0.18; // 18% — Impuesto General a las Ventas (Perú)

// ---------------------------------------------------------------------------
// Tipo de retorno enriquecido para una OC completa
// ---------------------------------------------------------------------------
type OrdenConDetalles = Prisma.OrdenCompraGetPayload<{
  include: {
    cliente: true;
    detalles: true;
  };
}>;

interface OrdenResponse {
  orden: OrdenConDetalles;
  liquidacion: LiquidacionOC;
}

interface OrdenesPaginadas {
  ordenes: OrdenConDetalles[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

// =============================================================================
// SERVICIO
// =============================================================================
export const ordenesService = {

  // ---------------------------------------------------------------------------
  // CREAR ORDEN CON DETALLES — Transacción atómica
  // ---------------------------------------------------------------------------
  /**
   * Crea una Orden de Compra completa en una transacción Prisma.
   * Pasos dentro de la transacción:
   *   1. Buscar o crear el Cliente en el catálogo maestro (upsert por nombre+tipo).
   *   2. Crear la cabecera OrdenCompra.
   *   3. Calcular matemáticamente el total de cada fila en el servidor.
   *   4. Insertar todos los DetalleOrden vinculados a la cabecera.
   * Si cualquier paso falla, toda la transacción se revierte (ROLLBACK).
   */
  async crearOrdenConDetalles(datos: CrearOrdenInput): Promise<OrdenResponse> {
    const ordenCreada = await prisma.$transaction(async (tx) => {

      // PASO 1: Upsert del cliente en el catálogo maestro.
      // Si el cliente ya existe con el mismo nombre y tipo, lo reutiliza.
      // Si no existe, lo crea. Evita duplicados en el catálogo.
      const cliente = await tx.cliente.upsert({
        where: {
          // Buscar por nombre exacto (case-sensitive en PostgreSQL por defecto)
          // En producción se puede agregar un índice de texto normalizado.
          nombre_tipoCliente: {
            nombre: datos.clienteNombre.trim(),
            tipoCliente: datos.tipoCliente,
          },
        },
        update: {
          // Si ya existe, no actualizamos nada (solo lo referenciamos)
          updatedAt: new Date(),
        },
        create: {
          nombre: datos.clienteNombre.trim(),
          tipoCliente: datos.tipoCliente,
        },
      });

      // PASO 2: Crear la cabecera de la Orden de Compra.
      const ordenCabecera = await tx.ordenCompra.create({
        data: {
          numeroOC: datos.numeroOC.trim().toUpperCase(),
          clienteId: cliente.id,
          estado: EstadoOrden.PENDIENTE,
          observaciones: datos.observaciones?.trim() ?? null,
        },
      });

      // PASO 3 + 4: Calcular totales y crear todas las filas de detalle.
      // REGLA MATEMÁTICA: total = cantidad * precioPorMetro
      // Se usa Math.round(...* 100) / 100 para evitar errores de punto flotante.
      const detallesData: Prisma.DetalleOrdenCreateManyInput[] = datos.detalles.map(
        (detalle) => {
          const cantidad: number = detalle.cantidad;
          const precioPorMetro: number = detalle.precioPorMetro;
          // Cálculo del servidor — el cliente no tiene voz sobre este valor
          const totalCalculado: number =
            Math.round(cantidad * precioPorMetro * 100) / 100;

          return {
            ordenCompraId: ordenCabecera.id,
            cantidad,
            unidadMedida: 'Metros', // Constante de negocio — no negociable
            descripcionArticulo: detalle.descripcionArticulo.trim(),
            colorSolicitado: detalle.colorSolicitado.trim(),
            precioPorMetro,
            total: totalCalculado, // ← Calculado en el servidor, no del cliente
          };
        }
      );

      // Inserción masiva eficiente de todos los detalles en una sola query
      await tx.detalleOrden.createMany({ data: detallesData });

      // Retornar la orden completa con detalles anidados para la respuesta
      return tx.ordenCompra.findUniqueOrThrow({
        where: { id: ordenCabecera.id },
        include: {
          cliente: true,
          detalles: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }); // Fin de la transacción — COMMIT automático si no hubo errores

    // Calcular liquidación financiera fuera de la transacción (solo lectura)
    const liquidacion = calcularLiquidacion(ordenCreada.detalles);

    return { orden: ordenCreada, liquidacion };
  },

  // ---------------------------------------------------------------------------
  // OBTENER TODAS LAS ÓRDENES (con paginación y filtros)
  // ---------------------------------------------------------------------------
  async obtenerOrdenes(opciones: {
    estado?: EstadoOrden;
    clienteId?: number;
    pagina: number;
    limite: number;
  }): Promise<OrdenesPaginadas> {
    const { estado, clienteId, pagina, limite } = opciones;
    const skip = (pagina - 1) * limite;

    // Construir filtro dinámico
    const where: Prisma.OrdenCompraWhereInput = {
      ...(estado && { estado }),
      ...(clienteId && { clienteId }),
    };

    // Ejecutar count y query en paralelo para eficiencia
    const [total, ordenes] = await Promise.all([
      prisma.ordenCompra.count({ where }),
      prisma.ordenCompra.findMany({
        where,
        skip,
        take: limite,
        orderBy: { createdAt: 'desc' }, // Las más recientes primero
        include: {
          cliente: true,
          detalles: {
            orderBy: { createdAt: 'asc' },
          },
        },
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
  // OBTENER ORDEN POR ID (con detalles y liquidación)
  // ---------------------------------------------------------------------------
  async obtenerOrdenPorId(id: number): Promise<OrdenResponse | null> {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!orden) return null;

    const liquidacion = calcularLiquidacion(orden.detalles);
    return { orden, liquidacion };
  },

  // ---------------------------------------------------------------------------
  // OBTENER ORDEN POR NÚMERO DE OC (identificador de negocio)
  // ---------------------------------------------------------------------------
  async obtenerOrdenPorNumero(numeroOC: string): Promise<OrdenResponse | null> {
    const orden = await prisma.ordenCompra.findUnique({
      where: { numeroOC: numeroOC.toUpperCase() },
      include: {
        cliente: true,
        detalles: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!orden) return null;

    const liquidacion = calcularLiquidacion(orden.detalles);
    return { orden, liquidacion };
  },

  // ---------------------------------------------------------------------------
  // ACTUALIZAR ESTADO DE UNA OC
  // ---------------------------------------------------------------------------
  async actualizarEstado(
    id: number,
    nuevoEstado: EstadoOrden
  ): Promise<OrdenConDetalles | null> {
    // Verificar que existe antes de actualizar
    const existe = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existe) return null;

    return prisma.ordenCompra.update({
      where: { id },
      data: { estado: nuevoEstado },
      include: {
        cliente: true,
        detalles: { orderBy: { createdAt: 'asc' } },
      },
    });
  },
};

// =============================================================================
// FUNCIÓN AUXILIAR: Cálculo de Liquidación Financiera
// Sección 1.3: Modal de Liquidación Financiera del documento SERVITEX
// =============================================================================
function calcularLiquidacion(
  detalles: Array<{ cantidad: number; precioPorMetro: number; total: number }>
): LiquidacionOC {
  const subtotalVenta = detalles.reduce(
    (acc, d) => acc + d.total,
    0
  );

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
