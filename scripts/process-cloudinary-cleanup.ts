import { processPendingCloudinaryDeletionJobs, scheduleExpiredDraftCleanup } from '../src/lib/cloudinary-cleanup';
import { prisma } from '../src/lib/prisma';

try {
  const drafts = await scheduleExpiredDraftCleanup();
  const processed = await processPendingCloudinaryDeletionJobs();
  console.log(`Cloudinary cleanup: ${drafts} borrador(es) programado(s), ${processed} trabajo(s) procesado(s).`);
} finally {
  await prisma.$disconnect();
}
