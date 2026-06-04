import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    // DIRECT_URL bypasses connection poolers (e.g. Supabase PgBouncer) for migrations.
    // Falls back to DATABASE_URL when running without a separate direct connection.
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
