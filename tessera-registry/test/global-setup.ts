import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

// Runs once before all e2e test files. The function it returns runs once after they finish.
export default async function setup() {
  // same image as docker-compose.yml, so tests and dev run the same Postgres
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();

  // point everything at the test database; a variable set here beats the value in .env
  process.env.DATABASE_URL = container.getConnectionUri();

  // build the tables from the migration files, the same way a production deploy does
  execSync('pnpm prisma migrate deploy', { stdio: 'inherit' });

  return async () => {
    await container.stop();
  };
}
