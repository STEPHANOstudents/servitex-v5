// =============================================================================
// SERVITEX — Tipos TypeScript: Módulo de Recetas Técnicas
// Secciones 2 y 3 del documento SERVITEX
// =============================================================================
import { ComposicionFibra } from '@prisma/client';

// ---------------------------------------------------------------------------
// REQUEST BODIES
// ---------------------------------------------------------------------------

/** Un colorante individual con su porcentaje en la fórmula del color. */
export interface ColoranteInput {
  nombreColorante: string; // Ej: "Dianix Blue AC-E"
  porcentaje: number;      // Float: % sobre el peso del artículo. Ej: 0.5
}

/** Payload completo para crear una Receta Técnica. */
export interface CrearRecetaInput {
  detalleOrdenId: number;         // ID del lote de teñido al que pertenece
  pesoRealKg: number;             // Float: kg en balanza de planta
  articulo: string;               // Ej: "Avío", "Prenda", "Cierre"
  composicionFibra: ComposicionFibra;
  relacionBano: number;           // Float: parte numérica de 1:X. Ej: 40.0
  descripcionColor: string;       // Ej: "Keeneland Khaki"
  colorantes: ColoranteInput[];   // Mínimo 1 colorante
  observacionesTecnicas?: string; // Texto libre, opcional
}

// ---------------------------------------------------------------------------
// MOTOR QUÍMICO — Estructuras de salida
// ---------------------------------------------------------------------------

/** Un producto químico dentro de un baño de agua. */
export interface ProductoQuimico {
  nombre: string;          // Ej: "Potasa Cáustica"
  concentracion: number;   // Float: g/L (dosis por litro de agua)
  gramos: number;          // Float: concentracion × litrosAgua (calculado)
}

/** Un uso de agua (baño) completo con todos sus productos y dosis. */
export interface BanoQuimico {
  numeroBano: number;          // Número secuencial del baño (1, 2, 3...)
  nombre: string;              // Ej: "Preblanqueo", "Baño de Teñido", "Neutralizado"
  fase: string;                // Ej: "PREBLANQUEO", "TENIDO", "ACABADO"
  esEnjuagueSimple: boolean;   // true = solo agua limpia, sin productos
  litrosAgua: number;          // Float: mismo volumen para todos los baños
  productos: ProductoQuimico[]; // Lista de químicos con sus gramos exactos
  nota?: string;               // Observación especial del baño (ej: regla eliminada)
}

/** Resultado completo del Motor Químico para una receta. */
export interface ResultadoMotorQuimico {
  composicion: ComposicionFibra;
  pesoRealKg: number;        // Float
  relacionBano: number;      // Float
  litrosAgua: number;        // Float: pesoRealKg × relacionBano
  sumaConcentracion: number; // Float: suma total de %% de colorantes
  nivelIntensidad: number;   // Float: 1.0 | 2.0 | 3.0 | 4.0
  nivelDescripcion: string;  // "Pasteles" | "Claros" | "Intermedios" | "Intensos"
  totalBanos: number;        // Total de usos de agua del proceso
  secuencia: BanoQuimico[];  // Lista ordenada de baños con dosis
}

/** Respuesta de la API para una receta creada. */
export interface RecetaResponse {
  receta: {
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
  };
  motorQuimico: ResultadoMotorQuimico;
}
