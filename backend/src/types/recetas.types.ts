// =============================================================================
// SERVITEX — Tipos TypeScript: Módulo de Recetas Técnicas
// Versión 3.0 — Adaptado al esquema normalizado de 20 tablas.
// =============================================================================

// ---------------------------------------------------------------------------
// REQUEST BODIES
// ---------------------------------------------------------------------------

/** Un colorante individual con su porcentaje en la fórmula del color. */
export interface ColoranteInput {
  coloranteId: number;  // ID del catálogo colorantes_catalogo
  porcentaje:  number;  // % sobre el peso del artículo. Ej: 0.5
}

/** Payload completo para crear una Receta Técnica. */
export interface CrearRecetaInput {
  detalleOrdenId:        number;
  pesoRealKg:            number;
  articuloNombre:        string;  // Nombre del artículo (texto libre)
  composicionFibraCodigo: string; // 'ALGODON' | 'NYLON' | 'POLIESTER' | ...
  relacionBano:          number;
  descripcionColor:      string;
  colorantes:            ColoranteInput[];
  observacionesTecnicas?: string;
}

// ---------------------------------------------------------------------------
// MOTOR QUÍMICO — Estructuras de salida
// ---------------------------------------------------------------------------

/** Un producto químico dentro de un baño de agua. */
export interface ProductoQuimico {
  nombre:        string;
  concentracion: number;
  gramos:        number;
}

/** Un uso de agua (baño) completo con todos sus productos y dosis. */
export interface BanoQuimico {
  numeroBano:       number;
  nombre:           string;
  fase:             string;
  esEnjuagueSimple: boolean;
  litrosAgua:       number;
  productos:        ProductoQuimico[];
  nota?:            string;
}

/** Resultado completo del Motor Químico para una receta. */
export interface ResultadoMotorQuimico {
  composicion:       string;   // codigo de la fibra: 'ALGODON', 'NYLON', etc.
  pesoRealKg:        number;
  relacionBano:      number;
  litrosAgua:        number;
  sumaConcentracion: number;
  nivelIntensidad:   number;
  nivelDescripcion:  string;
  totalBanos:        number;
  secuencia:         BanoQuimico[];
}

/** Respuesta de la API para una receta creada. */
export interface RecetaResponse {
  receta: {
    id:                    number;
    detalleOrdenId:        number;
    pesoRealKg:            number;
    articuloId:            number;   // ID del catálogo articulos_textiles
    articulo:              string;   // nombre del artículo (del catálogo)
    composicionFibra:      string;   // código de la fibra
    composicionFibraLabel: string;   // etiqueta legible
    relacionBano:          number;
    litrosAgua:            number;
    descripcionColor:      string;
    nivelIntensidad:       number;
    observacionesTecnicas: string | null;
    estado:                string;   // 'FORMULACION' | 'PROCESO' | 'APROBADO'
    secuenciaBanos:        any;      // secuencia de baños guardada
    iteraciones:           any;      // historial de iteraciones
    colorHex?:             string | null;
    colorRgb?:             any;
    colorMiniatura?:       string | null;
    createdAt:             string;
    colorantes: Array<{
      coloranteId:     number;   // ID del catálogo colorantes_catalogo
      nombreColorante: string;   // nombre del catálogo
      porcentaje:      number;
    }>;
  };
  motorQuimico: ResultadoMotorQuimico;
}

/** DTO para listar recetas (sin el motor, con datos de contexto del lote). */
export interface RecetaListDTO {
  id:                    number;
  detalleOrdenId:        number;
  pesoRealKg:            number;
  articuloId:            number;
  articulo:              string;
  composicionFibra:      string;
  composicionFibraLabel: string;
  relacionBano:          number;
  litrosAgua:            number;
  descripcionColor:      string;
  nivelIntensidad:       number;
  observacionesTecnicas: string | null;
  estado:                string;
  secuenciaBanos:        any;
  iteraciones:           any;
  colorHex?:             string | null;
  colorRgb?:             any;
  colorMiniatura?:       string | null;
  createdAt:             string;
  colorantes: Array<{
    coloranteId:     number;
    nombreColorante: string;
    porcentaje:      number;
  }>;
  lote?: {
    colorSolicitado:    string;
    descripcionArticulo: string;
    cantidad:           number;
    numeroOC:           string;
    cliente:            string;
  };
}

