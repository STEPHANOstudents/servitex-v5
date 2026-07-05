// =============================================================================
// SERVITEX — Tipos para el Módulo de Reportes
// =============================================================================

export interface ConsumoColorante {
  nombre: string;
  totalGramos: number; // En gramos en la base de datos (convertir a kg dividiendo por 1000)
}

export interface FidelidadCliente {
  clienteNombre: string;
  totalTeñidos: number;
  totalMetros: number;
}

export interface ProduccionTemporal {
  periodo: string; // Ex: '2026-07' para mes, '2026-Q3' para trimestre, '2026' para año
  totalMetros: number;
}
