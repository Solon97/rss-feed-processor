import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Required for migrate deploy. DIRECT_URL bypasses PgBouncer for migrations.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
