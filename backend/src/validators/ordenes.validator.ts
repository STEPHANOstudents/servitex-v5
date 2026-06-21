// =============================================================================
// SERVITEX — Validadores de Request para Órdenes de Compra (v3.0)
// =============================================================================
import { CrearOrdenInput, DetalleOrdenInput } from '../types/ordenes.types';

const TIPOS_CLIENTE_VALIDOS = ['EMPRESA', 'PERSONA_NATURAL', 'TALLER_EXTERNO', 'DISTRIBUIDOR'];
const MAX_COLOR_LENGTH = 150;
const MAX_NUMERO_OC_LENGTH = 50;

function esNumeroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && isFinite(valor) && valor > 0;
}

function esCadenaNoVacia(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function validarDetalle(detalle: unknown, indice: number): Record<string, string> {
  const errores: Record<string, string> = {};
  const d = detalle as Partial<DetalleOrdenInput>;
  const prefijo = `detalles[${indice}]`;

  if (!esNumeroPositivo(d.cantidad)) {
    errores[`${prefijo}.cantidad`] = 'La cantidad debe ser un número positivo (metros).';
  }

  if (!esCadenaNoVacia(d.articuloNombre)) {
    errores[`${prefijo}.articuloNombre`] = 'El artículo es obligatorio.';
  }

  if (!esCadenaNoVacia(d.colorSolicitado)) {
    errores[`${prefijo}.colorSolicitado`] = 'El color solicitado es obligatorio.';
  } else if (d.colorSolicitado!.length > MAX_COLOR_LENGTH) {
    errores[`${prefijo}.colorSolicitado`] = `Máximo ${MAX_COLOR_LENGTH} caracteres.`;
  }

  if (!esNumeroPositivo(d.precioPorMetro)) {
    errores[`${prefijo}.precioPorMetro`] = 'El precio por metro debe ser un número positivo.';
  }

  return errores;
}

export function validarCrearOrden(body: unknown): {
  valido: boolean;
  errores: Record<string, string>;
  datos?: CrearOrdenInput;
} {
  const errores: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { valido: false, errores: { body: 'El cuerpo de la solicitud es inválido.' } };
  }

  const b = body as Partial<CrearOrdenInput>;

  if (!esCadenaNoVacia(b.numeroOC)) {
    errores['numeroOC'] = 'El Número de Orden de Compra es obligatorio.';
  } else if (b.numeroOC!.length > MAX_NUMERO_OC_LENGTH) {
    errores['numeroOC'] = `Máximo ${MAX_NUMERO_OC_LENGTH} caracteres.`;
  }

  if (!esCadenaNoVacia(b.clienteNombre)) {
    errores['clienteNombre'] = 'El nombre del cliente es obligatorio.';
  }

  if (!b.tipoClienteCodigo || !TIPOS_CLIENTE_VALIDOS.includes(b.tipoClienteCodigo)) {
    errores['tipoClienteCodigo'] =
      `Tipo de cliente inválido. Valores: ${TIPOS_CLIENTE_VALIDOS.join(', ')}.`;
  }

  if (!Array.isArray(b.detalles) || b.detalles.length === 0) {
    errores['detalles'] = 'Debe incluirse al menos una fila de detalle.';
  } else {
    b.detalles.forEach((detalle, idx) => {
      const erroresDetalle = validarDetalle(detalle, idx);
      Object.assign(errores, erroresDetalle);
    });
  }

  const valido = Object.keys(errores).length === 0;
  return { valido, errores, datos: valido ? (b as CrearOrdenInput) : undefined };
}
