// =============================================================================
// SERVITEX — Motor de Costeo de Teñido (Costing Engine)
// =============================================================================
import type { ResultadoMotorQuimico } from '../types/recetas.types';

export interface DetalleCosteo {
  costoAgua: number;
  costoQuimicos: number;
  costoColorantes: number;
  costoManoObra: number;
  costoTotal: number;
}

/**
 * Mapea el nombre comercial del producto y la fase al código de insumo en precios_insumos.
 */
export function getInsumoCodigo(nombreProducto: string, fase: string): string | null {
  const nameNormalized = nombreProducto.toLowerCase().trim();

  if (nameNormalized.startsWith('potasa')) {
    if (fase === 'PREBLANQUEO') {
      return 'POTASA_PREBLANQUEO';
    } else {
      return 'POTASA_FIJACION';
    }
  }
  if (nameNormalized.startsWith('agua oxigenada')) {
    return 'AGUA_OXIGENADA';
  }
  if (nameNormalized.startsWith('humectante')) {
    return 'HUMECTANTE';
  }
  if (nameNormalized.startsWith('desengrasante')) {
    return 'DESENGRASANTE';
  }
  if (nameNormalized.startsWith('ácido acético') || nameNormalized.startsWith('acido acetico')) {
    return 'ACIDO_ACETICO_GLACIAL';
  }
  if (nameNormalized.startsWith('secuestrante')) {
    return 'SECUESTRANTE';
  }
  if (nameNormalized.startsWith('igualante')) {
    return 'IGUALANTE';
  }
  if (nameNormalized.startsWith('sal industrial')) {
    return 'SAL_INDUSTRIAL';
  }
  if (nameNormalized.startsWith('jabón') || nameNormalized.startsWith('jabon')) {
    return 'JABON';
  }
  if (nameNormalized.startsWith('ultrasil')) {
    return 'ULTRASIL_B';
  }

  return null;
}

/**
 * Normaliza el nombre de un colorante para generar su código único.
 * Ejemplo: "Ramazol Red" -> "RAMAZOL_RED"
 */
export function normalizeColoranteCodigo(nombre: string): string {
  return nombre.toUpperCase()
    .replace(/[ÁÀÂÄ]/g, 'A')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[ÓÒÔÖ]/g, 'O')
    .replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/Ñ/g, 'N')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Calcula los costos de teñido individuales.
 */
export function calcularCosteo(params: {
  motorQuimico: ResultadoMotorQuimico;
  colorantes: Array<{ nombreColorante: string; porcentaje: number }>;
  preciosMap: Map<string, number>; // codigoInsumo -> precioUnitario (en g o L)
}): DetalleCosteo {
  const { motorQuimico, colorantes, preciosMap } = params;
  const W = motorQuimico.pesoRealKg;

  // 1. Costo de Agua
  const precioAgua = preciosMap.get('AGUA') ?? 0;
  const litrosTotales = motorQuimico.litrosAgua * motorQuimico.totalBanos;
  const costoAgua = Math.round(litrosTotales * precioAgua * 100) / 100;

  // 2. Costo de Insumos Químicos
  let totalCostoQuimicos = 0;
  for (const bano of motorQuimico.secuencia) {
    if (bano.esEnjuagueSimple || !bano.productos) continue;
    for (const prod of bano.productos) {
      const codigo = getInsumoCodigo(prod.nombre, bano.fase);
      if (!codigo) continue; // Ignorar el placeholder referencial de colorantes
      const precioUnitario = preciosMap.get(codigo) ?? 0;
      totalCostoQuimicos += prod.gramos * precioUnitario;
    }
  }
  const costoQuimicos = Math.round(totalCostoQuimicos * 100) / 100;

  // 3. Costo de Colorantes
  let totalCostoColorantes = 0;
  for (const col of colorantes) {
    const codigoColorante = normalizeColoranteCodigo(col.nombreColorante);
    const precioUnitario = preciosMap.get(codigoColorante) ?? 0;
    const gramos = W * 1000 * (col.porcentaje / 100);
    totalCostoColorantes += gramos * precioUnitario;
  }
  const costoColorantes = Math.round(totalCostoColorantes * 100) / 100;

  // 4. Costo de Mano de Obra (escala fija según peso real W)
  let costoManoObra = 0;
  if (W <= 0.5) {
    costoManoObra = 15.0;
  } else if (W <= 1.0) {
    costoManoObra = 20.0;
  } else {
    costoManoObra = 25.0;
  }

  // 5. Costo Total
  const costoTotal = Math.round((costoAgua + costoQuimicos + costoColorantes + costoManoObra) * 100) / 100;

  return {
    costoAgua,
    costoQuimicos,
    costoColorantes,
    costoManoObra,
    costoTotal,
  };
}

/**
 * Calcula el costo de agua e insumos químicos para un único baño de teñido adicional (ajuste).
 */
export function calcularCostoUnBanoTeñido(params: {
  motorQuimico: ResultadoMotorQuimico;
  preciosMap: Map<string, number>;
}): { agua: number; quimicos: number } {
  const { motorQuimico, preciosMap } = params;

  // 1. Costo de agua para 1 baño
  const precioAgua = preciosMap.get('AGUA') ?? 0;
  const costoAgua = Math.round(motorQuimico.litrosAgua * precioAgua * 100) / 100;

  // 2. Costo de químicos para el baño de teñido principal (máximo costo entre los baños de teñido en multifibra)
  const banosTeñido = motorQuimico.secuencia.filter(b => b.fase.startsWith('TENIDO'));
  let maxCostoQuimicos = 0;
  for (const bano of banosTeñido) {
    if (bano.esEnjuagueSimple || !bano.productos) continue;
    let costoBano = 0;
    for (const prod of bano.productos) {
      const codigo = getInsumoCodigo(prod.nombre, bano.fase);
      if (!codigo) continue;
      const precioUnitario = preciosMap.get(codigo) ?? 0;
      costoBano += prod.gramos * precioUnitario;
    }
    if (costoBano > maxCostoQuimicos) {
      maxCostoQuimicos = costoBano;
    }
  }

  const costoQuimicos = Math.round(maxCostoQuimicos * 100) / 100;

  return {
    agua: costoAgua,
    quimicos: costoQuimicos,
  };
}
