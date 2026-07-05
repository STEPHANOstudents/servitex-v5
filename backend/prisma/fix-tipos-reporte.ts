// =============================================================================
// SERVITEX — Script de corrección para tipos de reporte obsoletos
// Ejecutar: npx ts-node prisma/fix-tipos-reporte.ts
// =============================================================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⚡ Iniciando corrección de tipos de reporte en la BD...');

  const codigosObsoletos = [
    'ORDENES_POR_PERIODO',
    'INGRESOS_POR_CLIENTE',
    'PRODUCCION_POR_FIBRA',
    'INCIDENCIAS_CALIDAD',
    'ENTREGAS_POR_PERIODO'
  ];

  // 1. Buscar los IDs de los registros obsoletos
  const tiposObsoletos = await prisma.tipoReporte.findMany({
    where: {
      codigo: { in: codigosObsoletos }
    }
  });

  if (tiposObsoletos.length > 0) {
    const idsObsoletos = tiposObsoletos.map(t => t.id);
    console.log(`  🔍 Encontrados ${tiposObsoletos.length} tipos obsoletos. Eliminando referencias...`);

    // 2. Eliminar reportes generados asociados para no violar FK
    const reportesEliminados = await prisma.reporteGenerado.deleteMany({
      where: {
        tipoReporteId: { in: idsObsoletos }
      }
    });
    console.log(`  ✅ reportes_generados eliminados: ${reportesEliminados.count}`);

    // 3. Eliminar tipos de reporte obsoletos
    const tiposEliminados = await prisma.tipoReporte.deleteMany({
      where: {
        id: { in: idsObsoletos }
      }
    });
    console.log(`  ✅ tipos_reporte obsoletos eliminados: ${tiposEliminados.count}`);
  } else {
    console.log('  ℹ️ No se encontraron tipos de reporte obsoletos.');
  }

  // 4. Crear los nuevos tipos de reporte
  console.log('  🌱 Creando nuevos tipos de reporte...');
  const creados = await prisma.tipoReporte.createMany({
    data: [
      { codigo: 'CONSUMO_COLORANTES', etiqueta: 'Consumo de Colorantes' },
      { codigo: 'FIDELIDAD_CLIENTES', etiqueta: 'Fidelidad de Clientes' },
      { codigo: 'PRODUCCION_TEMPORAL', etiqueta: 'Producción Temporal' },
    ],
    skipDuplicates: true,
  });
  console.log(`  ✅ Nuevos tipos de reporte creados (o ya existentes): ${creados.count}`);
  
  console.log('🎉 Proceso de corrección finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el script de corrección:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
