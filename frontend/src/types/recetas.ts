// =============================================================================
// SERVITEX Frontend — Tipos: Módulo Recetas Técnicas
// =============================================================================

export type ComposicionFibra =
  | 'ALGODON'
  | 'NYLON'
  | 'POLIESTER'
  | 'MULTIFIBRA_ALGODON_NYLON'
  | 'MULTIFIBRA_ALGODON_POLIESTER'
  | 'MULTIFIBRA_NYLON_POLIESTER';

export interface ColoranteInput {
  nombreColorante: string;
  porcentaje: number;
}

export interface CrearRecetaInput {
  detalleOrdenId: number;
  pesoRealKg: number;
  articulo: string;
  composicionFibra: ComposicionFibra;
  relacionBano: number;
  descripcionColor: string;
  colorantes: ColoranteInput[];
  observacionesTecnicas?: string;
}

// Motor Químico
export interface ProductoQuimico {
  nombre: string;
  concentracion: number;
  gramos: number;
}

export interface BanoQuimico {
  numeroBano: number;
  nombre: string;
  fase: string;
  esEnjuagueSimple: boolean;
  litrosAgua: number;
  productos: ProductoQuimico[];
  nota?: string;
}

export interface MotorQuimicoResultado {
  composicion: ComposicionFibra;
  pesoRealKg: number;
  relacionBano: number;
  litrosAgua: number;
  sumaConcentracion: number;
  nivelIntensidad: number;
  nivelDescripcion: string;
  totalBanos: number;
  secuencia: BanoQuimico[];
}

export interface RecetaDB {
  id: number;
  detalleOrdenId: number;
  pesoRealKg: number;
  articulo: string;
  composicionFibra: ComposicionFibra;
  relacionBano: number;
  litrosAgua: number;
  descripcionColor: string;
  nivelIntensidad: number;
  observacionesTecnicas: string | null;
  createdAt: string;
  colorantes: Array<{ nombreColorante: string; porcentaje: number }>;
}

export interface RecetaConMotor {
  receta: RecetaDB;
  motorQuimico: MotorQuimicoResultado;
}

// Para el tablero: incluye contexto de lote
export interface RecetaListItem extends RecetaDB {
  lote?: {
    colorSolicitado: string;
    descripcionArticulo: string;
    cantidad: number;
    numeroOC: string;
    cliente: string;
  };
}

// Para precargar el formulario (Copiar como base)
export interface RecetaPreload {
  pesoRealKg: string;
  articulo: string;
  composicionFibra: ComposicionFibra;
  relacionBano: string;
  descripcionColor: string;
  observacionesTecnicas: string;
  colorantes: Array<{ nombre: string; porcentaje: string }>;
}

// Catálogo de colorantes por fibra
export interface ColoranteCatalogo {
  nombre: string;
  etiqueta?: 'algodon' | 'nylon' | 'poliester';
}

const ALGODON_COLORANTES: ColoranteCatalogo[] = [
  { nombre: 'Reactivo Rojo 3BS' },
  { nombre: 'Reactivo Rojo H-3B' },
  { nombre: 'Reactivo Amarillo 3RS' },
  { nombre: 'Reactivo Amarillo H-E4R' },
  { nombre: 'Reactivo Azul 19' },
  { nombre: 'Reactivo Azul H-GR' },
  { nombre: 'Reactivo Negro 5' },
  { nombre: 'Reactivo Negro WNN' },
  { nombre: 'Reactivo Naranja 16' },
  { nombre: 'Reactivo Violeta 5R' },
  { nombre: 'Reactivo Verde 19' },
  { nombre: 'Reactivo Turquesa Br 21' },
];

const NYLON_COLORANTES: ColoranteCatalogo[] = [
  { nombre: 'Ácido Rojo 266' },
  { nombre: 'Ácido Rojo 399' },
  { nombre: 'Ácido Amarillo 119' },
  { nombre: 'Ácido Amarillo 246' },
  { nombre: 'Ácido Azul 25' },
  { nombre: 'Ácido Azul 277' },
  { nombre: 'Ácido Negro 172' },
  { nombre: 'Ácido Naranja 156' },
  { nombre: 'Ácido Violeta 17' },
  { nombre: 'Ácido Café 282' },
];

const POLIESTER_COLORANTES: ColoranteCatalogo[] = [
  { nombre: 'Dianix Blue AC-E' },
  { nombre: 'Dianix Blue UN' },
  { nombre: 'Dianix Yellow AC-E' },
  { nombre: 'Dianix Yellow Brown AC-E' },
  { nombre: 'Dianix Red AC-E' },
  { nombre: 'Dianix Ruby Red UN' },
  { nombre: 'Dianix Black CC' },
  { nombre: 'Dianix Turquoise CC' },
  { nombre: 'Dianix Navy CC' },
  { nombre: 'Dianix Rubine CC' },
];

export const CATALOGO_COLORANTES: Record<ComposicionFibra, ColoranteCatalogo[]> = {
  ALGODON: ALGODON_COLORANTES,
  NYLON:   NYLON_COLORANTES,
  POLIESTER: POLIESTER_COLORANTES,
  MULTIFIBRA_ALGODON_NYLON: [
    ...ALGODON_COLORANTES.map(c => ({ ...c, etiqueta: 'algodon' as const })),
    ...NYLON_COLORANTES.map(c   => ({ ...c, etiqueta: 'nylon'   as const })),
  ],
  MULTIFIBRA_ALGODON_POLIESTER: [
    ...ALGODON_COLORANTES.map(c   => ({ ...c, etiqueta: 'algodon'   as const })),
    ...POLIESTER_COLORANTES.map(c => ({ ...c, etiqueta: 'poliester' as const })),
  ],
  MULTIFIBRA_NYLON_POLIESTER: [
    ...NYLON_COLORANTES.map(c     => ({ ...c, etiqueta: 'nylon'     as const })),
    ...POLIESTER_COLORANTES.map(c => ({ ...c, etiqueta: 'poliester' as const })),
  ],
};

export function getNivelClase(nivel: number): string {
  if (nivel <= 1) return 'nivel-1';
  if (nivel <= 2) return 'nivel-2';
  if (nivel <= 3) return 'nivel-3';
  return 'nivel-4';
}

export function getFibraClase(fibra: ComposicionFibra): string {
  if (fibra === 'ALGODON')   return 'algodon';
  if (fibra === 'NYLON')     return 'nylon';
  if (fibra === 'POLIESTER') return 'poliester';
  return 'multi';
}

export function getFibraLabel(fibra: ComposicionFibra): string {
  const map: Record<ComposicionFibra, string> = {
    ALGODON: 'Algodón',
    NYLON: 'Nylon',
    POLIESTER: 'Poliéster',
    MULTIFIBRA_ALGODON_NYLON: 'Alg + Nylon',
    MULTIFIBRA_ALGODON_POLIESTER: 'Alg + Poliéster',
    MULTIFIBRA_NYLON_POLIESTER: 'Nylon + Poliéster',
  };
  return map[fibra];
}
