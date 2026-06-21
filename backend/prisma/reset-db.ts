// =============================================================================
// SERVITEX — Script de Reseteo Selectivo de Base de Datos
// Limpia únicamente las tablas operativas/transaccionales de prueba.
// No altera catálogos ni clientes.
// Ejecutar: npx ts-node prisma/reset-db.ts
// =============================================================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚨 Iniciando limpieza selectiva de base de datos (tablas operativas)...');

  // Tablas operativas a limpiar
  const tables = [
    'bitacora_estados',
    'colorantes_formula',
    'recetas_tecnicas',
    'notas_entrega',
    'incidencias_proceso',
    'detalles_orden',
    'ordenes_compra'
  ];

  for (const table of tables) {
    try {
      // Usar CASCADE para asegurar que dependencias internas se limpien y reiniciar secuencias
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`  🗑️ Tabla truncada: ${table}`);
    } catch (err: any) {
      console.warn(`  ⚠️ No se pudo truncar la tabla ${table}: ${err.message}`);
    }
  }

  console.log('✨ Limpieza selectiva completada. Catálogos y clientes se mantienen intactos.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el reseteo selectivo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
