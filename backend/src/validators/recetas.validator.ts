// =============================================================================
// SERVITEX — Validador de Recetas Técnicas (v3.0 — Esquema Normalizado)
// =============================================================================
import type { CrearRecetaInput, ColoranteInput } from '../types/recetas.types';

const COMPOSICIONES_VALIDAS = [
  'ALGODON', 'NYLON', 'POLIESTER',
  'MULTIFIBRA_ALGODON_NYLON', 'MULTIFIBRA_ALGODON_POLIESTER', 'MULTIFIBRA_NYLON_POLIESTER',
];

function esNumeroPositivo(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0;
}

function esCadenaNoVacia(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function validarColorante(c: unknown, idx: number): Record<string, string> {
  const errores: Record<string, string> = {};
  const col = c as Partial<ColoranteInput>;
  const pre = `colorantes[${idx}]`;

  if (!col.coloranteId || typeof col.coloranteId !== 'number' || col.coloranteId <= 0) {
    errores[`${pre}.coloranteId`] = `Colorante ${idx + 1}: debe seleccionar del catálogo.`;
  }
  if (typeof col.porcentaje !== 'number' || !isFinite(col.porcentaje) || col.porcentaje <= 0) {
    errores[`${pre}.porcentaje`] =
      `Colorante ${idx + 1}: el porcentaje debe ser un Float positivo (ej: 0.5).`;
  }
  return errores;
}

export function validarCrearReceta(body: unknown): {
  valido: boolean;
  errores: Record<string, string>;
  datos?: CrearRecetaInput;
} {
  const errores: Record<string, string> = {};

  if (!body || typeof body !== 'object') {
    return { valido: false, errores: { body: 'El cuerpo de la solicitud es inválido.' } };
  }

  const b = body as Partial<CrearRecetaInput>;

  if (!b.detalleOrdenId || typeof b.detalleOrdenId !== 'number' || b.detalleOrdenId <= 0) {
    errores['detalleOrdenId'] = 'El ID del detalle de orden es obligatorio y debe ser positivo.';
  }

  if (!esNumeroPositivo(b.pesoRealKg)) {
    errores['pesoRealKg'] = 'El peso real debe ser un número Float positivo.';
  }

  if (!esCadenaNoVacia(b.articuloNombre)) {
    errores['articuloNombre'] = 'El nombre del artículo es obligatorio.';
  }

  if (!b.composicionFibraCodigo || !COMPOSICIONES_VALIDAS.includes(b.composicionFibraCodigo)) {
    errores['composicionFibraCodigo'] =
      `Composición inválida. Valores: ${COMPOSICIONES_VALIDAS.join(', ')}.`;
  }

  if (!esNumeroPositivo(b.relacionBano)) {
    errores['relacionBano'] = 'La relación de baño debe ser un Float positivo (ej: 40.0).';
  }

  if (!esCadenaNoVacia(b.descripcionColor)) {
    errores['descripcionColor'] = 'La descripción del color es obligatoria.';
  }

  if (!Array.isArray(b.colorantes) || b.colorantes.length === 0) {
    errores['colorantes'] = 'Debe incluirse al menos un colorante en la fórmula.';
  } else {
    b.colorantes.forEach((c, i) => {
      Object.assign(errores, validarColorante(c, i));
    });
  }

  const valido = Object.keys(errores).length === 0;
  return { valido, errores, datos: valido ? (b as CrearRecetaInput) : undefined };
}
