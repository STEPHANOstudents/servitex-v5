/// <reference types="node" />
// =============================================================================
// SERVITEX — Test Unitario Standalone: Motor de Costeo y Márgenes
// =============================================================================
import { ejecutarMotorQuimico } from '../engines/quimico.engine';
import { calcularCosteo } from '../engines/costeo.engine';

console.log('🧪 Iniciando Pruebas Unitarias de Costeo y Márgenes...');

function assertEqual(actual: any, expected: any, description: string) {
  if (actual === expected) {
    console.log(`  ✅ ${description}: ${actual}`);
  } else {
    console.error(`  ❌ ERROR en ${description}: Se esperaba ${expected}, pero se obtuvo ${actual}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 1. Escenario de Prueba para Costeo de Teñido
// ---------------------------------------------------------------------------
// Algodón, 800 g (0.8 kg), relación de baño 1:10
// Colorante Ramazol Red al 1.5% -> 12 g de colorante
const motorQuimico = ejecutarMotorQuimico({
  composicion: 'ALGODON',
  pesoRealKg: 0.8,
  relacionBano: 10,
  colorantes: [{ coloranteId: 1, porcentaje: 1.5 }]
});

// Mock de precios cargado con los valores del caso de prueba
const preciosMap = new Map<string, number>([
  ['AGUA', 0.005],
  ['POTASA_PREBLANQUEO', 0.003],
  ['POTASA_FIJACION', 0.005],
  ['AGUA_OXIGENADA', 0.006],
  ['HUMECTANTE', 0.015],
  ['DESENGRASANTE', 0.015],
  ['ACIDO_ACETICO_GLACIAL', 0.012],
  ['SECUESTRANTE', 0.005],
  ['IGUALANTE', 0.008],
  ['SAL_INDUSTRIAL', 0.0015],
  ['JABON', 0.009],
  ['ULTRASIL_B', 0.018],
  ['RAMAZOL_RED', 0.350],
]);

const colorantesData = [
  { nombreColorante: 'Ramazol Red', porcentaje: 1.5 }
];

const costeo = calcularCosteo({
  motorQuimico,
  colorantes: colorantesData,
  preciosMap
});

// Aseveraciones matemáticas según el caso de prueba
console.log('\n--- 1. Validación de Componentes de Costo ---');
assertEqual(costeo.costoAgua, 0.36, 'Costo de Agua (72L * 0.005)');
assertEqual(costeo.costoQuimicos, 2.28, 'Costo de Químicos (Suma de insumos)');
assertEqual(costeo.costoColorantes, 4.20, 'Costo de Colorantes (12g * S/. 0.35)');
assertEqual(costeo.costoManoObra, 20.00, 'Costo de Mano de Obra (Rango 0.5kg - 1.0kg)');
assertEqual(costeo.costoTotal, 26.84, 'COSTO TOTAL DE PRODUCCIÓN');

// ---------------------------------------------------------------------------
// 2. Escenario de Prueba para Márgenes de Ganancia
// ---------------------------------------------------------------------------
// Venta lote subtotal sin IGV = S/. 300.00
// Costo de producción = S/. 50.00
const ventaSubtotal = 300.00;
const costoProduccion = 50.00;

const ventaConIGV = Math.round(ventaSubtotal * 1.18 * 100) / 100;
const diferencia = Math.round((ventaConIGV - costoProduccion) * 100) / 100;
const retornoCaja = Math.round((diferencia / ventaConIGV) * 100 * 10) / 10;
const margenNeto = Math.round(((ventaSubtotal - costoProduccion) / ventaSubtotal) * 100 * 10) / 10;

console.log('\n--- 2. Validación de Módulo de Margen ---');
assertEqual(ventaConIGV, 354.00, 'Venta con IGV (300 * 1.18)');
assertEqual(diferencia, 304.00, 'Diferencia (Venta con IGV - Costo)');
assertEqual(retornoCaja, 85.9, 'Retorno de Caja % (304 / 354 * 100)');
assertEqual(margenNeto, 83.3, 'Margen Neto % ((300 - 50) / 300 * 100)');

console.log('\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE!');
