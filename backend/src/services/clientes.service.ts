// =============================================================================
// SERVITEX — Servicio de Clientes
// =============================================================================
import { prisma } from '../lib/prisma';
import { getCatalogosCache, resolverCodigo } from '../lib/catalogos.cache';

export const clientesService = {
  /**
   * Obtener todos los clientes ordenados por nombre.
   */
  async obtenerTodos() {
    return prisma.cliente.findMany({
      include: {
        tipoCliente: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  },

  /**
   * Crear un nuevo cliente en el catálogo de clientes.
   */
  async crearCliente(datos: { nombre: string; tipoClienteCodigo: string; ruc?: string; telefono?: string }) {
    const cache = await getCatalogosCache();
    const tipoClienteId = resolverCodigo(cache.tiposCliente, datos.tipoClienteCodigo, 'tipos_cliente');

    // Verificar si ya existe para evitar errores de clave única
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        nombre: {
          equals: datos.nombre.trim(),
          mode: 'insensitive',
        },
        tipoClienteId,
      },
      include: {
        tipoCliente: true,
      },
    });

    if (clienteExistente) {
      return clienteExistente;
    }

    return prisma.cliente.create({
      data: {
        nombre: datos.nombre.trim(),
        tipoClienteId,
        ruc: datos.ruc?.trim() || null,
        telefono: datos.telefono?.trim() || null,
      },
      include: {
        tipoCliente: true,
      },
    });
  },
};
