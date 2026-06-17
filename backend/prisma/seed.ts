// =============================================================================
// SERVITEX — Seed de Datos Iniciales de Catálogos
// Poblar las 9 tablas de catálogo con sus valores válidos.
// Ejecutar: npx ts-node prisma/seed.ts
// =============================================================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed de catálogos SERVITEX...');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 1 — tipos_cliente
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.tipoCliente.createMany({
    data: [
      { codigo: 'EMPRESA',         etiqueta: 'Empresa',          descripcion: 'Persona jurídica registrada' },
      { codigo: 'PERSONA_NATURAL', etiqueta: 'Persona Natural',  descripcion: 'Persona física independiente' },
      { codigo: 'TALLER_EXTERNO',  etiqueta: 'Taller Externo',   descripcion: 'Taller tercerizado que envía prendas' },
      { codigo: 'DISTRIBUIDOR',    etiqueta: 'Distribuidor',     descripcion: 'Empresa distribuidora de textiles' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ tipos_cliente');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 2 — estados_orden
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.estadoOrden.createMany({
    data: [
      { codigo: 'PENDIENTE',  etiqueta: 'Pendiente',   descripcion: 'Registrada, sin iniciar producción',          esEstadoFinal: false },
      { codigo: 'EN_PROCESO', etiqueta: 'En Proceso',  descripcion: 'Al menos un lote está en formulario técnico', esEstadoFinal: false },
      { codigo: 'COMPLETADA', etiqueta: 'Completada',  descripcion: 'Todos los lotes han sido procesados',         esEstadoFinal: true  },
      { codigo: 'ANULADA',    etiqueta: 'Anulada',     descripcion: 'Cancelada por el cliente o el taller',        esEstadoFinal: true  },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ estados_orden');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 3 — composiciones_fibra
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.composicionFibra.createMany({
    data: [
      { codigo: 'ALGODON',                      etiqueta: 'Algodón',                      totalBanos: 9, descripcionRuta: '4 baños Preblanqueo + 5 baños Teñido' },
      { codigo: 'NYLON',                        etiqueta: 'Nylon',                        totalBanos: 4, descripcionRuta: '4 baños — Ácido directo en teñido' },
      { codigo: 'POLIESTER',                    etiqueta: 'Poliéster',                    totalBanos: 4, descripcionRuta: '4 baños — Igual que Nylon' },
      { codigo: 'MULTIFIBRA_ALGODON_NYLON',     etiqueta: 'Multifibra Algodón + Nylon',   totalBanos: 7, descripcionRuta: '7 baños — Neutralizado del algodón eliminado' },
      { codigo: 'MULTIFIBRA_ALGODON_POLIESTER', etiqueta: 'Multifibra Algodón + Poliéster', totalBanos: 7, descripcionRuta: '7 baños — Igual que Algodón+Nylon' },
      { codigo: 'MULTIFIBRA_NYLON_POLIESTER',   etiqueta: 'Multifibra Nylon + Poliéster', totalBanos: 7, descripcionRuta: '7 baños — Poliéster primero, luego Nylon' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ composiciones_fibra');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 4 — articulos_textiles
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.articuloTextil.createMany({
    data: [
      { nombre: 'Avío',            descripcion: 'Ribetes, elásticos y accesorios textiles' },
      { nombre: 'Prenda',          descripcion: 'Prendas de vestir terminadas' },
      { nombre: 'Hilo',            descripcion: 'Hilo para costura o bordado' },
      { nombre: 'Tela cruda',      descripcion: 'Tela sin teñir lista para proceso' },
      { nombre: 'Cierre',          descripcion: 'Cierres y cremalleras' },
      { nombre: 'Tejido Plano',    descripcion: 'Telas de tejido plano (liso, sarga, satén)' },
      { nombre: 'Tejido de Punto', descripcion: 'Telas de tejido de punto (jersey, interlock)' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ articulos_textiles');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 5 — unidades_medida
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.unidadMedida.createMany({
    data: [
      { codigo: 'METROS', simbolo: 'm',  etiqueta: 'Metros' },
      { codigo: 'KILOS',  simbolo: 'kg', etiqueta: 'Kilogramos' },
      { codigo: 'PIEZAS', simbolo: 'pz', etiqueta: 'Piezas' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ unidades_medida');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 6 — colorantes_catalogo
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.coloranteCatalogo.createMany({
    data: [
      // Reactivos para Algodón
      { nombre: 'Ramazol Yellow' },
      { nombre: 'Ramazol Red' },
      { nombre: 'Ramazol Blue' },
      { nombre: 'Ramazol Turquoise' },
      { nombre: 'Ramazol Black B' },
      { nombre: 'Reactivo Rojo 3BS' },
      { nombre: 'Reactivo Amarillo K-3R' },
      { nombre: 'Reactivo Negro B' },
      { nombre: 'Reactivo Azul BRF' },
      { nombre: 'Reactivo Naranja 16' },
      // Ácidos para Nylon
      { nombre: 'Lanasol Yellow 4G' },
      { nombre: 'Lanasol Red 6G' },
      { nombre: 'Lanasol Blue 3R' },
      { nombre: 'Erionyl Amarillo A-3GL' },
      { nombre: 'Erionyl Rojo A-3BN' },
      { nombre: 'Erionyl Azul A-R' },
      { nombre: 'Ácido Amarillo G' },
      { nombre: 'Ácido Rojo B' },
      { nombre: 'Ácido Azul 45' },
      // Dispersos para Poliéster
      { nombre: 'Dianix Blue AC-E' },
      { nombre: 'Dianix Red AC-E' },
      { nombre: 'Dianix Yellow AC-E' },
      { nombre: 'Disperso Rojo 60' },
      { nombre: 'Disperso Azul 56' },
      { nombre: 'Disperso Amarillo 64' },
      { nombre: 'Disperso Negro 1' },
      { nombre: 'Disperso Naranja 25' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ colorantes_catalogo');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 7 — tipos_incidencia
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.tipoIncidencia.createMany({
    data: [
      { codigo: 'COLOR_FUERA_RANGO', etiqueta: 'Color Fuera de Rango',  descripcion: 'El color obtenido no coincide con el solicitado' },
      { codigo: 'REPROCESO',         etiqueta: 'Reproceso de Teñido',   descripcion: 'El artículo debe teñirse nuevamente' },
      { codigo: 'DAÑO_ARTICULO',     etiqueta: 'Daño en el Artículo',   descripcion: 'El artículo sufrió daño físico durante el proceso' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ tipos_incidencia');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 8 — fases_proceso
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.faseProceso.createMany({
    data: [
      { codigo: 'PREBLANQUEO',      etiqueta: 'Preblanqueo',         orden: 1 },
      { codigo: 'TENIDO',           etiqueta: 'Teñido',              orden: 2 },
      { codigo: 'TENIDO_ALGODON',   etiqueta: 'Teñido Algodón',      orden: 2 },
      { codigo: 'TENIDO_SINTETICO', etiqueta: 'Teñido Sintético',    orden: 3 },
      { codigo: 'TENIDO_POLIESTER', etiqueta: 'Teñido Poliéster',    orden: 2 },
      { codigo: 'TENIDO_NYLON',     etiqueta: 'Teñido Nylon',        orden: 3 },
      { codigo: 'ACABADO',          etiqueta: 'Acabado',             orden: 4 },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ fases_proceso');

  // ──────────────────────────────────────────────────────────────────────────
  // CATÁLOGO 9 — tipos_reporte
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.tipoReporte.createMany({
    data: [
      { codigo: 'ORDENES_POR_PERIODO',  etiqueta: 'Órdenes por Período' },
      { codigo: 'INGRESOS_POR_CLIENTE', etiqueta: 'Ingresos por Cliente' },
      { codigo: 'PRODUCCION_POR_FIBRA', etiqueta: 'Producción por Tipo de Fibra' },
      { codigo: 'INCIDENCIAS_CALIDAD',  etiqueta: 'Incidencias de Calidad' },
      { codigo: 'ENTREGAS_POR_PERIODO', etiqueta: 'Entregas por Período' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ tipos_reporte');

  console.log('\n🎉 Seed completado. Base de datos lista con 9 catálogos poblados.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
