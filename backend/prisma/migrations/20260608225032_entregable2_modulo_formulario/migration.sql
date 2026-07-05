/*
  Warnings:

  - You are about to drop the column `formulaColorJson` on the `recetas_tecnicas` table. All the data in the column will be lost.
  - Added the required column `articulo` to the `recetas_tecnicas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcionColor` to the `recetas_tecnicas` table without a default value. This is not possible if the table is not empty.
  - Made the column `nivelIntensidad` on table `recetas_tecnicas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "recetas_tecnicas" DROP COLUMN "formulaColorJson",
ADD COLUMN     "articulo" VARCHAR(150) NOT NULL,
ADD COLUMN     "descripcionColor" VARCHAR(200) NOT NULL,
ALTER COLUMN "nivelIntensidad" SET NOT NULL,
ALTER COLUMN "nivelIntensidad" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "colorantes_formula" (
    "id" SERIAL NOT NULL,
    "recetaTecnicaId" INTEGER NOT NULL,
    "nombreColorante" VARCHAR(200) NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colorantes_formula_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "colorantes_formula" ADD CONSTRAINT "colorantes_formula_recetaTecnicaId_fkey" FOREIGN KEY ("recetaTecnicaId") REFERENCES "recetas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
