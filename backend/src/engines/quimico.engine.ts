// =============================================================================
// SERVITEX — Motor de Cálculo Químico (Chemical Engine)
// Secciones 3.1, 3.2, 3.3 y 3.4 del documento SERVITEX
//
// Responsabilidades:
//   1. Calcular el Nivel de Intensidad sumando % de colorantes (Sección 3.4)
//   2. Calcular litros exactos por baño: pesoRealKg × relacionBano
//   3. Calcular gramos exactos de cada químico: concentración (g/L) × litros
//   4. Generar la secuencia completa de baños según la fibra:
//      - Algodón:  4 preblanqueo + 5 teñido = 9 baños totales
//      - Nylon/Poliéster: 4 baños (ácido directo en baño 1)
//      - Multifibra Algodón+Sint.: 7 baños (neutralizado intermedio eliminado)
//      - Multifibra Nylon+Poliéster: 7 baños (Poliéster primero)
// =============================================================================
// ComposicionFibra ahora es string (codigo del catálogo): 'ALGODON', 'NYLON', etc.
import type {
  BanoQuimico,
  ColoranteInput,
  ProductoQuimico,
  ResultadoMotorQuimico,
} from '../types/recetas.types';

// =============================================================================
// CONSTANTES DE CONCENTRACIÓN (g/L) — Extraídas del documento SERVITEX
// =============================================================================
const C = {
  // --- Preblanqueo (Algodón) ---
  POTASA_CAUST_PREBLAQ:   3.0,  // g/L — Baño de Preblanqueo
  AGUA_OXIGENADA:         4.0,  // g/L — Baño de Preblanqueo
  HUMECTANTE:             0.5,  // g/L — Baño de Preblanqueo
  DESENGRASANTE:          0.5,  // g/L — Baño de Preblanqueo

  // --- Enjuague / Neutralizado (Sección 3.1 y 3.2) ---
  // "Neutralizado = 1 baño de agua + Ácido Acético Glacial"
  ACIDO_ACETICO_GLACIAL:  0.5,  // g/L — Enjuague neutralizante y baño teñido sintético

  // --- Baño de Teñido Algodón (Sección 3.2) ---
  SECUESTRANTE:          10.0,  // g/L — Baño principal de teñido algodón
  IGUALANTE:              1.0,  // g/L — Baño principal de teñido algodón

  // --- Acabado (todas las fibras) ---
  JABON:                  0.5,  // g/L — Jabonado en caliente
  ULTRASIL_B:             1.0,  // g/L — Siliconado / Suavizado final
} as const;

// =============================================================================
// MATRIZ DE INTENSIDAD DEL COLOR (Sección 3.4)
// Determina dosis de Sal Industrial y Potasa Cáustica en el baño de teñido.
// Solo aplica a procesos con Algodón en la fibra.
// =============================================================================
interface NivelIntensidad {
  nivel:       number; // Float: 1.0, 2.0, 3.0, 4.0
  descripcion: string;
  sal:         number; // g/L de Sal Industrial
  potasa:      number; // g/L de Potasa Cáustica
  rangoDesc:   string; // descripción del rango de concentración
}

const MATRIZ_INTENSIDAD: NivelIntensidad[] = [
  { nivel: 1.0, descripcion: 'Pasteles',     sal: 10.0, potasa: 3.0, rangoDesc: 'hasta 0.01%'            },
  { nivel: 2.0, descripcion: 'Claros',       sal: 20.0, potasa: 3.0, rangoDesc: 'más de 0.01% hasta 0.1%'},
  { nivel: 3.0, descripcion: 'Intermedios',  sal: 40.0, potasa: 4.0, rangoDesc: 'más de 0.1% hasta 1.0%' },
  { nivel: 4.0, descripcion: 'Intensos',     sal: 80.0, potasa: 5.0, rangoDesc: 'más de 1.0%'            },
];

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/** Redondeo a 2 decimales para evitar errores de punto flotante IEEE 754. */
function r2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Crea un ProductoQuimico calculando gramos = concentración × litros. */
function producto(
  nombre: string,
  concentracion: number,
  litrosAgua: number
): ProductoQuimico {
  return {
    nombre,
    concentracion,
    gramos: r2(concentracion * litrosAgua),
  };
}

/** Crea un baño simple de enjuague (solo agua, sin productos químicos). */
function banoEnjuague(
  numero: number,
  nombre: string,
  fase: string,
  litrosAgua: number,
  nota?: string
): BanoQuimico {
  return {
    numeroBano: numero,
    nombre,
    fase,
    esEnjuagueSimple: true,
    litrosAgua,
    productos: [],
    ...(nota ? { nota } : {}),
  };
}

/** Crea un baño con productos químicos (no es un simple enjuague). */
function banoConProductos(
  numero: number,
  nombre: string,
  fase: string,
  litrosAgua: number,
  productos: ProductoQuimico[],
  nota?: string
): BanoQuimico {
  return {
    numeroBano: numero,
    nombre,
    fase,
    esEnjuagueSimple: false,
    litrosAgua,
    productos,
    ...(nota ? { nota } : {}),
  };
}

// =============================================================================
// FUNCIÓN PÚBLICA: Calcular Nivel de Intensidad
// Sección 3.4: suma los porcentajes de todos los colorantes de la fórmula.
// =============================================================================
export function calcularNivelIntensidad(colorantes: ColoranteInput[]): {
  sumaConcentracion: number;
  nivel: number;
  descripcion: string;
} {
  const suma: number = r2(
    colorantes.reduce((acc, c) => acc + c.porcentaje, 0)
  );

  let nivelInfo: NivelIntensidad;

  if (suma <= 0.01) {
    nivelInfo = MATRIZ_INTENSIDAD[0]!;      // Nivel 1 — Pasteles
  } else if (suma <= 0.1) {
    nivelInfo = MATRIZ_INTENSIDAD[1]!;      // Nivel 2 — Claros
  } else if (suma <= 1.0) {
    nivelInfo = MATRIZ_INTENSIDAD[2]!;      // Nivel 3 — Intermedios
  } else {
    nivelInfo = MATRIZ_INTENSIDAD[3]!;      // Nivel 4 — Intensos
  }

  return {
    sumaConcentracion: suma,
    nivel: nivelInfo.nivel,
    descripcion: nivelInfo.descripcion,
  };
}

// =============================================================================
// SECUENCIAS DE BAÑOS POR TIPO DE FIBRA
// =============================================================================

// -----------------------------------------------------------------------------
// ALGODÓN — Preblanqueo (4 baños) — Sección 3.1
// -----------------------------------------------------------------------------
function generarPreblanqueoAlgodon(litros: number): BanoQuimico[] {
  return [
    banoConProductos(1, 'Preblanqueo', 'PREBLANQUEO', litros, [
      producto('Potasa Cáustica',   C.POTASA_CAUST_PREBLAQ, litros),
      producto('Agua Oxigenada',    C.AGUA_OXIGENADA,        litros),
      producto('Humectante',        C.HUMECTANTE,            litros),
      producto('Desengrasante',     C.DESENGRASANTE,         litros),
    ]),

    banoEnjuague(2, 'Enjuague 1 (Agua Limpia)', 'PREBLANQUEO', litros),

    banoConProductos(3, 'Enjuague Neutralizante', 'PREBLANQUEO', litros, [
      producto('Ácido Acético Glacial', C.ACIDO_ACETICO_GLACIAL, litros),
    ],
    'Neutralizado = agua + Ácido Acético Glacial'),

    banoEnjuague(4, 'Enjuague 2 (Agua Limpia)', 'PREBLANQUEO', litros),
  ];
}

// -----------------------------------------------------------------------------
// ALGODÓN PURO — Teñido (5 baños) — Sección 3.2
// El baño de teñido usa Sal y Potasa según la matriz de intensidad.
// -----------------------------------------------------------------------------
function generarRutaAlgodon(
  litros: number,
  sumaConcentracion: number
): BanoQuimico[] {
  // Obtener dosis de Sal y Potasa según nivel de intensidad
  let matrizNivel: NivelIntensidad;
  if (sumaConcentracion <= 0.01)      matrizNivel = MATRIZ_INTENSIDAD[0]!;
  else if (sumaConcentracion <= 0.1)  matrizNivel = MATRIZ_INTENSIDAD[1]!;
  else if (sumaConcentracion <= 1.0)  matrizNivel = MATRIZ_INTENSIDAD[2]!;
  else                                 matrizNivel = MATRIZ_INTENSIDAD[3]!;

  const banosPreblanqueo = generarPreblanqueoAlgodon(litros);

  const banosTeñido: BanoQuimico[] = [
    banoConProductos(5, 'Baño de Teñido Principal', 'TENIDO', litros, [
      producto('Fórmula de Colorantes (ver detalle)', 0, 0), // referencial
      producto('Secuestrante',     C.SECUESTRANTE,      litros),
      producto('Igualante',        C.IGUALANTE,         litros),
      producto(`Sal Industrial (Nivel ${matrizNivel.nivel} — ${matrizNivel.descripcion})`,
               matrizNivel.sal,  litros),
      producto(`Potasa Cáustica (Nivel ${matrizNivel.nivel} — ${matrizNivel.rangoDesc})`,
               matrizNivel.potasa, litros),
    ],
    `Nivel de intensidad ${matrizNivel.nivel} (${matrizNivel.descripcion}): ${matrizNivel.rangoDesc}`),

    banoConProductos(6, 'Neutralizado', 'TENIDO', litros, [
      producto('Ácido Acético Glacial', C.ACIDO_ACETICO_GLACIAL, litros),
    ],
    'Neutralizado = agua + Ácido Acético Glacial (0.5 g/L)'),

    banoConProductos(7, 'Jabonado en Caliente', 'ACABADO', litros, [
      producto('Jabón', C.JABON, litros),
    ]),

    banoEnjuague(8, 'Enjuague Normal (Agua Limpia)', 'ACABADO', litros),

    banoConProductos(9, 'Siliconado / Suavizado', 'ACABADO', litros, [
      producto('Ultrasil-B', C.ULTRASIL_B, litros),
    ]),
  ];

  return [...banosPreblanqueo, ...banosTeñido];
}

// -----------------------------------------------------------------------------
// NYLON PURO — 4 baños — Sección 3.2
// El Ácido Acético va directo en el primer volumen (baño de teñido).
// NO hay baño de Neutralizado separado.
// -----------------------------------------------------------------------------
function generarRutaNylon(litros: number): BanoQuimico[] {
  return [
    banoConProductos(1, 'Baño de Teñido (Nylon)', 'TENIDO', litros, [
      producto('Fórmula de Colorantes Nylon (ver detalle)', 0, 0),
      producto('Ácido Acético Glacial (directo al primer volumen)',
               C.ACIDO_ACETICO_GLACIAL, litros),
    ],
    'Ácido Acético Glacial ingresado directamente. NO hay neutralizado separado.'),

    banoEnjuague(2, 'Enjuague Normal (Agua Limpia)', 'TENIDO', litros,
    'Se omite el neutralizado — el ácido se incorporó en el baño de teñido'),

    banoConProductos(3, 'Jabonado', 'ACABADO', litros, [
      producto('Jabón', C.JABON, litros),
    ]),

    banoConProductos(4, 'Enjuague Final con Suavizado', 'ACABADO', litros, [
      producto('Ultrasil-B', C.ULTRASIL_B, litros),
    ]),
  ];
}

// -----------------------------------------------------------------------------
// POLIÉSTER PURO — 4 baños — Sección 3.2 (idéntica ruta al Nylon)
// -----------------------------------------------------------------------------
function generarRutaPoliester(litros: number): BanoQuimico[] {
  return generarRutaNylon(litros).map((bano) => ({
    ...bano,
    nombre: bano.nombre.replace('(Nylon)', '(Poliéster)'),
    productos: bano.productos.map((p) => ({
      ...p,
      nombre: p.nombre.replace('Nylon', 'Poliéster'),
    })),
  }));
}

// -----------------------------------------------------------------------------
// MULTIFIBRA Algodón + Nylon — 7 baños — Sección 3.3
// Regla crítica: el Neutralizado del algodón SE ELIMINA porque el teñido
// del sintético ya incorpora Ácido Acético de forma nativa.
// -----------------------------------------------------------------------------
function generarRutaAlgodonNylon(
  litros: number,
  sumaConcentracion: number
): BanoQuimico[] {
  let matrizNivel: NivelIntensidad;
  if (sumaConcentracion <= 0.01)      matrizNivel = MATRIZ_INTENSIDAD[0]!;
  else if (sumaConcentracion <= 0.1)  matrizNivel = MATRIZ_INTENSIDAD[1]!;
  else if (sumaConcentracion <= 1.0)  matrizNivel = MATRIZ_INTENSIDAD[2]!;
  else                                 matrizNivel = MATRIZ_INTENSIDAD[3]!;

  return [
    banoConProductos(1, 'Baño de Teñido Algodón', 'TENIDO_ALGODON', litros, [
      producto('Fórmula de Colorantes Algodón (ver detalle)', 0, 0),
      producto('Secuestrante',     C.SECUESTRANTE,     litros),
      producto('Igualante',        C.IGUALANTE,        litros),
      producto(`Sal Industrial (Nivel ${matrizNivel.nivel})`,
               matrizNivel.sal,   litros),
      producto(`Potasa Cáustica (Nivel ${matrizNivel.nivel})`,
               matrizNivel.potasa, litros),
    ]),

    banoEnjuague(2, 'Enjuague Post-Algodón (Agua Limpia)', 'TENIDO_ALGODON', litros,
    'El Neutralizado del algodón es ELIMINADO — el ácido viene nativo en el baño de Nylon'),

    banoConProductos(3, 'Baño de Teñido Nylon', 'TENIDO_SINTETICO', litros, [
      producto('Fórmula de Colorantes Nylon (ver detalle)', 0, 0),
      producto('Ácido Acético Glacial (nativo — reemplaza el neutralizado del algodón)',
               C.ACIDO_ACETICO_GLACIAL, litros),
    ],
    'Regla crítica: el ácido acético de este baño sustituye el neutralizado eliminado'),

    banoEnjuague(4, 'Enjuague Post-Nylon (Agua Limpia)', 'TENIDO_SINTETICO', litros),

    banoConProductos(5, 'Jabonado en Caliente', 'ACABADO', litros, [
      producto('Jabón', C.JABON, litros),
    ]),

    banoEnjuague(6, 'Enjuague Normal (Agua Limpia)', 'ACABADO', litros),

    banoConProductos(7, 'Suavizado Final', 'ACABADO', litros, [
      producto('Ultrasil-B', C.ULTRASIL_B, litros),
    ]),
  ];
}

// -----------------------------------------------------------------------------
// MULTIFIBRA Algodón + Poliéster — 7 baños — Sección 3.3
// Misma lógica que Algodón + Nylon, cambia el nombre del sintético.
// -----------------------------------------------------------------------------
function generarRutaAlgodonPoliester(
  litros: number,
  sumaConcentracion: number
): BanoQuimico[] {
  return generarRutaAlgodonNylon(litros, sumaConcentracion).map((bano) => ({
    ...bano,
    nombre: bano.nombre.replace('Nylon', 'Poliéster'),
    fase: bano.fase.replace('NYLON', 'POLIESTER'),
    nota: bano.nota?.replace('Nylon', 'Poliéster'),
    productos: bano.productos.map((p) => ({
      ...p,
      nombre: p.nombre.replace('Nylon', 'Poliéster'),
    })),
  }));
}

// -----------------------------------------------------------------------------
// MULTIFIBRA Nylon + Poliéster — 7 baños — Sección 3.3
// Poliéster primero, luego Nylon.
// -----------------------------------------------------------------------------
function generarRutaNylonPoliester(litros: number): BanoQuimico[] {
  return [
    banoConProductos(1, 'Baño de Teñido Poliéster', 'TENIDO_POLIESTER', litros, [
      producto('Fórmula de Colorantes Poliéster (ver detalle)', 0, 0),
      producto('Ácido Acético Glacial', C.ACIDO_ACETICO_GLACIAL, litros),
    ]),

    banoEnjuague(2, 'Enjuague Post-Poliéster (Agua Limpia)', 'TENIDO_POLIESTER', litros),

    banoConProductos(3, 'Baño de Teñido Nylon', 'TENIDO_NYLON', litros, [
      producto('Fórmula de Colorantes Nylon (ver detalle)', 0, 0),
      producto('Ácido Acético Glacial', C.ACIDO_ACETICO_GLACIAL, litros),
    ]),

    banoEnjuague(4, 'Enjuague Post-Nylon (Agua Limpia)', 'TENIDO_NYLON', litros),

    banoConProductos(5, 'Jabonado en Caliente', 'ACABADO', litros, [
      producto('Jabón', C.JABON, litros),
    ]),

    banoEnjuague(6, 'Enjuague Normal (Agua Limpia)', 'ACABADO', litros),

    banoConProductos(7, 'Suavizado Final', 'ACABADO', litros, [
      producto('Ultrasil-B', C.ULTRASIL_B, litros),
    ]),
  ];
}

// =============================================================================
// FUNCIÓN PRINCIPAL DEL MOTOR QUÍMICO
// Entrada: parámetros físicos + colorantes → Salida: secuencia completa
// =============================================================================
export function ejecutarMotorQuimico(params: {
  composicion: string;  // codigo: 'ALGODON' | 'NYLON' | 'POLIESTER' | ...
  pesoRealKg: number;
  relacionBano: number;
  colorantes: ColoranteInput[];
}): ResultadoMotorQuimico {
  const { composicion, pesoRealKg, relacionBano, colorantes } = params;

  // Paso 1: Calcular litros de agua (iguales para TODOS los baños)
  const litrosAgua: number = r2(pesoRealKg * relacionBano);

  // Paso 2: Calcular nivel de intensidad sumando %% de colorantes (Sec. 3.4)
  const { sumaConcentracion, nivel, descripcion } =
    calcularNivelIntensidad(colorantes);

  // Paso 3: Seleccionar ruta química según composición de fibra
  let secuencia: BanoQuimico[];

  switch (composicion) {
    case 'ALGODON':
      secuencia = generarRutaAlgodon(litrosAgua, sumaConcentracion);
      break;

    case 'NYLON':
      secuencia = generarRutaNylon(litrosAgua);
      break;

    case 'POLIESTER':
      secuencia = generarRutaPoliester(litrosAgua);
      break;

    case 'MULTIFIBRA_ALGODON_NYLON':
      secuencia = generarRutaAlgodonNylon(litrosAgua, sumaConcentracion);
      break;

    case 'MULTIFIBRA_ALGODON_POLIESTER':
      secuencia = generarRutaAlgodonPoliester(litrosAgua, sumaConcentracion);
      break;

    case 'MULTIFIBRA_NYLON_POLIESTER':
      secuencia = generarRutaNylonPoliester(litrosAgua);
      break;

    default:
      throw new Error(`Composición de fibra no reconocida: ${String(composicion)}`);
  }

  return {
    composicion,
    pesoRealKg,
    relacionBano,
    litrosAgua,
    sumaConcentracion,
    nivelIntensidad: nivel,
    nivelDescripcion: descripcion,
    totalBanos: secuencia.length,
    secuencia,
  };
}
