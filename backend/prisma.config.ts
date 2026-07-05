// =============================================================================
// SERVITEX — Prisma Config (Prisma v7+)
// Referencia: https://pris.ly/d/config-datasource
// En Prisma v7, la URL de conexión se configura aquí, no en el schema.prisma
// =============================================================================
import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async adapter() {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
});
