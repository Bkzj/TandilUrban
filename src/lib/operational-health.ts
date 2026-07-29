import { prisma } from '@/lib/prisma';
import { getServerEnvironment } from '@/lib/validation/environment';

export type HealthReport = {
  status: 'ok';
  components: { process: 'ok' };
};

export type ReadinessReport = {
  status: 'ready' | 'not_ready';
  components: { configuration: 'ok' | 'not_ready'; database: 'ok' | 'not_ready' };
};

export function healthReport(): HealthReport {
  return { status: 'ok', components: { process: 'ok' } };
}

type ReadinessDependencies = {
  validateConfiguration: () => void;
  probeDatabase: () => Promise<void>;
};

const defaultReadinessDependencies: ReadinessDependencies = {
  validateConfiguration: () => { getServerEnvironment(); },
  probeDatabase: async () => { await prisma.$queryRawUnsafe('SELECT 1'); },
};

/**
 * Deliberately returns stable, non-sensitive component states. Detailed errors
 * remain only in server logs/observability and never enter the readiness body.
 */
export async function readinessReport(
  dependencies: ReadinessDependencies = defaultReadinessDependencies,
): Promise<ReadinessReport> {
  let configuration: ReadinessReport['components']['configuration'] = 'ok';
  let database: ReadinessReport['components']['database'] = 'ok';

  try {
    dependencies.validateConfiguration();
  } catch {
    configuration = 'not_ready';
  }

  try {
    await dependencies.probeDatabase();
  } catch {
    database = 'not_ready';
  }

  return {
    status: configuration === 'ok' && database === 'ok' ? 'ready' : 'not_ready',
    components: { configuration, database },
  };
}
