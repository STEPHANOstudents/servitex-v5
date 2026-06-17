// =============================================================================
// SERVITEX — Caché de IDs de Catálogos
// Carga y cachea los IDs de los catálogos una sola vez al inicio.
// Evita consultar la BD en cada request para resolver códigos a IDs.
// =============================================================================
import { prisma } from './prisma';

interface CatalogosCache {
  tiposCliente:     Map<string, number>;
  estadosOrden:     Map<string, number>;
  composicionesFibra: Map<string, number>;
  articulosTextiles: Map<string, number>;
  unidadesMedida:   Map<string, number>;
  tiposIncidencia:  Map<string, number>;
  tiposReporte:     Map<string, number>;
}

let _cache: CatalogosCache | null = null;

export async function getCatalogosCache(): Promise<CatalogosCache> {
  if (_cache) return _cache;

  const [
    tiposCliente,
    estadosOrden,
    composicionesFibra,
    articulosTextiles,
    unidadesMedida,
    tiposIncidencia,
    tiposReporte,
  ] = await Promise.all([
    prisma.tipoCliente.findMany(),
    prisma.estadoOrden.findMany(),
    prisma.composicionFibra.findMany(),
    prisma.articuloTextil.findMany(),
    prisma.unidadMedida.findMany(),
    prisma.tipoIncidencia.findMany(),
    prisma.tipoReporte.findMany(),
  ]);

  _cache = {
    tiposCliente:      new Map(tiposCliente.map(t      => [t.codigo, t.id])),
    estadosOrden:      new Map(estadosOrden.map(t      => [t.codigo, t.id])),
    composicionesFibra:new Map(composicionesFibra.map(t => [t.codigo, t.id])),
    articulosTextiles: new Map(articulosTextiles.map(t => [t.nombre, t.id])),
    unidadesMedida:    new Map(unidadesMedida.map(t    => [t.codigo, t.id])),
    tiposIncidencia:   new Map(tiposIncidencia.map(t   => [t.codigo, t.id])),
    tiposReporte:      new Map(tiposReporte.map(t      => [t.codigo, t.id])),
  };

  return _cache;
}

/** Invalida el caché para que se recargue en el próximo request. */
export function invalidarCache(): void {
  _cache = null;
}

/** Resuelve un código a su ID. Lanza error si no existe. */
export function resolverCodigo(
  map: Map<string, number>,
  codigo: string,
  nombreCatalogo: string
): number {
  const id = map.get(codigo);
  if (!id) {
    throw new Error(
      `Valor inválido "${codigo}" para el catálogo ${nombreCatalogo}. ` +
      `Valores válidos: ${[...map.keys()].join(', ')}.`
    );
  }
  return id;
}
