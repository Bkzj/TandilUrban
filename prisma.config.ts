import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const toolingDatabaseUrl = new URL('postgresql://127.0.0.1:5432/propea_tooling');
toolingDatabaseUrl.username = 'local';
toolingDatabaseUrl.password = 'local';

export default defineConfig({
  schema: 'database/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `generate` and `validate` need a syntactically valid URL, not a live DB.
    // Migration commands still fail closed unless an explicit reachable URL exists.
    url: process.env.DATABASE_URL ?? toolingDatabaseUrl.toString(),
  },
});
