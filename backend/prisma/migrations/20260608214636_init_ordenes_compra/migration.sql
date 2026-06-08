-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('EMPRESA', 'PERSONA_NATURAL', 'TALLER_EXTERNO', 'DISTRIBUIDOR');

-- CreateEnum
CREATE TYPE "ComposicionFibra" AS ENUM ('ALGODON', 'NYLON', 'POLIESTER', 'MULTIFIBRA_ALGODON_NYLON', 'MULTIFIBRA_ALGODON_POLIESTER', 'MULTIFIBRA_NYLON_POLIESTER');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ANULADA');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipoCliente" "TipoCliente" NOT NULL,
    "ruc" VARCHAR(11),
    "telefono" VARCHAR(15),
    "correo" VARCHAR(150),
    "direccion" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" SERIAL NOT NULL,
    "numeroOC" VARCHAR(50) NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_orden" (
    "id" SERIAL NOT NULL,
    "ordenCompraId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidadMedida" VARCHAR(20) NOT NULL DEFAULT 'Metros',
    "descripcionArticulo" VARCHAR(300) NOT NULL,
    "colorSolicitado" VARCHAR(150) NOT NULL,
    "precioPorMetro" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detalles_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas_tecnicas" (
    "id" SERIAL NOT NULL,
    "detalleOrdenId" INTEGER NOT NULL,
    "pesoRealKg" DOUBLE PRECISION NOT NULL,
    "composicionFibra" "ComposicionFibra" NOT NULL,
    "relacionBano" DOUBLE PRECISION NOT NULL,
    "litrosAgua" DOUBLE PRECISION NOT NULL,
    "formulaColorJson" JSONB NOT NULL DEFAULT '[]',
    "nivelIntensidad" INTEGER,
    "observacionesTecnicas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recetas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_ruc_key" ON "clientes"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nombre_tipoCliente_key" ON "clientes"("nombre", "tipoCliente");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_numeroOC_key" ON "ordenes_compra"("numeroOC");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_tecnicas_detalleOrdenId_key" ON "recetas_tecnicas"("detalleOrdenId");

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden" ADD CONSTRAINT "detalles_orden_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas_tecnicas" ADD CONSTRAINT "recetas_tecnicas_detalleOrdenId_fkey" FOREIGN KEY ("detalleOrdenId") REFERENCES "detalles_orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
