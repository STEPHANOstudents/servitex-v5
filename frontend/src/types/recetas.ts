// =============================================================================
// SERVITEX Frontend — Tipos: Módulo Recetas Técnicas
// Actualizado para FK-based catalog (backend normalizado)
// =============================================================================

// composicionFibra is now a string code (from catalog)
export type ComposicionFibra =
  | 'ALGODON'
  | 'NYLON'
  | 'POLIESTER'
  | 'MULTIFIBRA_ALGODON_NYLON'
  | 'MULTIFIBRA_ALGODON_POLIESTER'
  | 'MULTIFIBRA_NYLON_POLIESTER';

// ---------------------------------------------------------------------------
// Input (request body) — colorantes now use coloranteId (FK)
// ---------------------------------------------------------------------------
export interface ColoranteInput {
  coloranteId: number;
  porcentaje: number;
}

export interface CrearRecetaInput {
  detalleOrdenId: number;
  pesoRealKg: number;
  articuloNombre: string;
  composicionFibraCodigo: string;
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
  composicion: string;
  pesoRealKg: number;
  relacionBano: number;
  litrosAgua: number;
  sumaConcentracion: number;
  nivelIntensidad: number;
  nivelDescripcion: string;
  totalBanos: number;
  secuencia: BanoQuimico[];
}

// ---------------------------------------------------------------------------
// Response from backend — GET /api/recetas
// composicionFibra = code string, composicionFibraLabel = display label
// colorantes response still uses nombreColorante (flattened by backend)
// ---------------------------------------------------------------------------
export interface RecetaDB {
  id: number;
  detalleOrdenId: number | null;
  pesoRealKg: number;
  articuloId: number;            // ID del catálogo articulos_textiles
  articulo: string;              // nombre del artículo (flattened)
  composicionFibra: string;      // código (e.g. 'ALGODON')
  composicionFibraLabel: string; // label (e.g. 'Algodón')
  relacionBano: number;
  litrosAgua: number;
  descripcionColor: string;
  nivelIntensidad: number;
  observacionesTecnicas: string | null;
  estado: string;               // 'FORMULACION' | 'PROCESO' | 'APROBADO'
  secuenciaBanos: any;          // secuencia de baños original
  iteraciones: any;             // historial de iteraciones
  colorHex?: string;
  colorRgb?: { r: number; g: number; b: number };
  colorMiniatura?: string;
  costoAgua?: number | null;
  costoQuimicos?: number | null;
  costoColorantes?: number | null;
  costoManoObra?: number | null;
  costoTotal?: number | null;
  createdAt: string;
  colorantes: Array<{ coloranteId: number; nombreColorante: string; porcentaje: number }>;
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
  articuloId: number;
  composicionFibra: string;
  relacionBano: string;
  descripcionColor: string;
  observacionesTecnicas: string;
  colorantes: Array<{ nombre: string; coloranteId: number; porcentaje: string }>;
}

// ---------------------------------------------------------------------------
// Catálogo estático de colorantes por fibra (fallback local)
// Se mantiene para el modo sin catálogo de API, pero el componente
// preferirá el catálogo de la API cuando esté disponible.
// ---------------------------------------------------------------------------
export interface ColoranteCatalogoItem {
  nombre: string;
  etiqueta?: 'algodon' | 'nylon' | 'poliester';
}

const ALGODON_COLORANTES: ColoranteCatalogoItem[] = [
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

const NYLON_COLORANTES: ColoranteCatalogoItem[] = [
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

const POLIESTER_COLORANTES: ColoranteCatalogoItem[] = [
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

export const CATALOGO_COLORANTES_LOCAL: Record<ComposicionFibra, ColoranteCatalogoItem[]> = {
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

export function getFibraClase(fibra: string): string {
  if (fibra === 'ALGODON')   return 'algodon';
  if (fibra === 'NYLON')     return 'nylon';
  if (fibra === 'POLIESTER') return 'poliester';
  return 'multi';
}

export function getFibraLabel(fibra: string): string {
  const map: Record<string, string> = {
    ALGODON: 'Algodón',
    NYLON: 'Nylon',
    POLIESTER: 'Poliéster',
    MULTIFIBRA_ALGODON_NYLON: 'Nylon/Algodón',
    MULTIFIBRA_ALGODON_POLIESTER: 'Algodón/Poliéster',
    MULTIFIBRA_NYLON_POLIESTER: 'Nylon/Poliéster',
  };
  return map[fibra] ?? fibra;
}

export function formatearGramos(gramos: number): string {
  if (gramos < 0.1) {
    return `${gramos.toFixed(4)} g`;
  }
  if (gramos >= 0.1 && gramos < 10) {
    return `${gramos.toFixed(2)} g`;
  }
  return `${gramos.toFixed(1)} g`;
}
