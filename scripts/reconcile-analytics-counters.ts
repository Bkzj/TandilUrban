import 'dotenv/config';

import { reconcileAnalyticsCounters } from '../src/lib/analytics-reconciliation';
import { prisma } from '../src/lib/prisma';

const unexpected = process.argv.slice(2).filter((arg) => arg !== '--apply');
if (unexpected.length > 0) {
  throw new Error(`Argumentos no reconocidos: ${unexpected.join(', ')}`);
}

const apply = process.argv.includes('--apply');
try {
  const report = await reconcileAnalyticsCounters(apply);
  console.log(JSON.stringify(report, null, 2));
  if (!apply) {
    console.log('Dry-run: no se modificaron contadores. Usá --apply para corregirlos.');
  }
} finally {
  await prisma.$disconnect();
}
