import { publicIdBelongsToProperty } from '@/lib/cloudinary-ownership';
import { configureCloudinary, cloudinary, isCloudinaryServerConfigured } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

type CleanupAsset = { id: string; publicId: string };

export function assertCleanupOwnership(tenantId: string, propertyId: string, assets: CleanupAsset[]): void {
  if (assets.some(({ publicId }) => !publicIdBelongsToProperty(publicId, tenantId, propertyId))) {
    throw new Error('CLOUDINARY_OWNERSHIP_MISMATCH');
  }
}

type DeletionTransaction = {
  findAssets(): Promise<CleanupAsset[]>;
  createJob(assets: CleanupAsset[]): Promise<{ id: string }>;
  markPending(assetIds: string[]): Promise<void>;
  deleteProperty(): Promise<void>;
};

export async function schedulePropertyDeletionInTransaction(
  input: { tenantId: string; propertyId: string },
  tx: DeletionTransaction,
): Promise<string | null> {
    const assets = await tx.findAssets();
    assertCleanupOwnership(input.tenantId, input.propertyId, assets);
    const job = assets.length > 0 ? await tx.createJob(assets) : null;
    if (assets.length > 0) {
      await tx.markPending(assets.map(({ id }) => id));
    }
    await tx.deleteProperty();
    return job?.id ?? null;
}

export async function schedulePropertyDeletion(input: { tenantId: string; propertyId: string }): Promise<string | null> {
  return prisma.$transaction((tx) => schedulePropertyDeletionInTransaction(input, {
    findAssets: () => tx.cloudinaryAsset.findMany({
      where: { inmobiliariaId: input.tenantId, propertyId: input.propertyId, status: { in: ['DRAFT', 'BOUND'] } },
      select: { id: true, publicId: true },
    }),
    createJob: (assets) => tx.cloudinaryDeletionJob.create({
      data: {
        inmobiliariaId: input.tenantId,
        propertyId: input.propertyId,
        resources: { create: assets.map((asset) => ({ assetId: asset.id, publicId: asset.publicId })) },
      },
      select: { id: true },
    }),
    markPending: async (assetIds) => {
      await tx.cloudinaryAsset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'PENDING_DELETION', expiresAt: null },
      });
    },
    deleteProperty: async () => {
      await tx.propiedad.delete({ where: { id: input.propertyId } });
    },
  }));
}

export async function scheduleAssetCleanup(input: {
  tenantId: string;
  propertyId: string;
  assetIds: string[];
}): Promise<string | null> {
  if (input.assetIds.length === 0) return null;
  return prisma.$transaction(async (tx) => {
    const assets = await tx.cloudinaryAsset.findMany({
      where: {
        id: { in: input.assetIds },
        inmobiliariaId: input.tenantId,
        propertyId: input.propertyId,
        status: { in: ['DRAFT', 'BOUND'] },
      },
      select: { id: true, publicId: true },
    });
    if (assets.length !== new Set(input.assetIds).size) throw new Error('CLOUDINARY_ASSET_SET_MISMATCH');
    assertCleanupOwnership(input.tenantId, input.propertyId, assets);
    const job = await tx.cloudinaryDeletionJob.create({
      data: {
        inmobiliariaId: input.tenantId,
        propertyId: input.propertyId,
        resources: { create: assets.map((asset) => ({ assetId: asset.id, publicId: asset.publicId })) },
      },
      select: { id: true },
    });
    await tx.cloudinaryAsset.updateMany({
      where: { id: { in: assets.map(({ id }) => id) } },
      data: { status: 'PENDING_DELETION', expiresAt: null },
    });
    return job.id;
  });
}

export async function scheduleExpiredDraftCleanup(limit = 100): Promise<number> {
  const expired = await prisma.cloudinaryAsset.findMany({
    where: { status: 'DRAFT', expiresAt: { lte: new Date() } },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: { id: true, inmobiliariaId: true, propertyId: true },
  });
  const groups = new Map<string, { tenantId: string; propertyId: string; assetIds: string[] }>();
  for (const asset of expired) {
    const key = `${asset.inmobiliariaId}\0${asset.propertyId}`;
    const group = groups.get(key) ?? { tenantId: asset.inmobiliariaId, propertyId: asset.propertyId, assetIds: [] };
    group.assetIds.push(asset.id);
    groups.set(key, group);
  }
  let scheduled = 0;
  for (const group of groups.values()) {
    const propertyExists = await prisma.propiedad.findUnique({ where: { id: group.propertyId }, select: { id: true } });
    if (propertyExists) continue;
    if (await scheduleAssetCleanup(group)) scheduled += group.assetIds.length;
  }
  return scheduled;
}

type CleanupResource = { id: string; assetId: string; publicId: string; status: string };
type CleanupJob = { id: string; inmobiliariaId: string; propertyId: string; resources: CleanupResource[] };
export type CleanupExecutionResult = { completed: string[]; failed: string[]; rejected: string[] };

export async function executeCleanupResources(
  job: CleanupJob,
  destroy: (publicId: string) => Promise<{ result: string }>,
): Promise<CleanupExecutionResult> {
  const result: CleanupExecutionResult = { completed: [], failed: [], rejected: [] };
  for (const resource of job.resources) {
    if (resource.status === 'COMPLETE') continue;
    if (!publicIdBelongsToProperty(resource.publicId, job.inmobiliariaId, job.propertyId)) {
      result.rejected.push(resource.id);
      continue;
    }
    try {
      const remote = await destroy(resource.publicId);
      (remote.result === 'ok' || remote.result === 'not found' ? result.completed : result.failed).push(resource.id);
    } catch {
      result.failed.push(resource.id);
    }
  }
  return result;
}

export async function processCloudinaryDeletionJob(jobId: string): Promise<void> {
  const job = await prisma.cloudinaryDeletionJob.findUnique({ where: { id: jobId }, include: { resources: true } });
  if (!job || job.status === 'COMPLETE' || job.status === 'REJECTED') return;
  if (!isCloudinaryServerConfigured()) throw new Error('Cloudinary no configurado para cleanup.');
  configureCloudinary();
  const claimed = await prisma.cloudinaryDeletionJob.updateMany({
    where: { id: job.id, status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return;
  const result = await executeCleanupResources(job, async (publicId) => {
    const remote = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    return { result: remote.result };
  });
  const retryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** (job.attempts + 1) * 30_000));
  await prisma.$transaction(async (tx) => {
    if (result.completed.length > 0) {
      const resources = job.resources.filter(({ id }) => result.completed.includes(id));
      await tx.cloudinaryDeletionResource.updateMany({ where: { id: { in: result.completed } }, data: { status: 'COMPLETE', resultCode: 'deleted', lastErrorCode: null, attempts: { increment: 1 } } });
      await tx.cloudinaryAsset.updateMany({ where: { id: { in: resources.map(({ assetId }) => assetId) } }, data: { status: 'DELETED' } });
    }
    if (result.failed.length > 0) await tx.cloudinaryDeletionResource.updateMany({ where: { id: { in: result.failed } }, data: { status: 'RETRY', lastErrorCode: 'remote_failure', attempts: { increment: 1 } } });
    if (result.rejected.length > 0) await tx.cloudinaryDeletionResource.updateMany({ where: { id: { in: result.rejected } }, data: { status: 'REJECTED', lastErrorCode: 'ownership_mismatch', attempts: { increment: 1 } } });
    const status = result.rejected.length > 0 ? 'REJECTED' : result.failed.length > 0 ? 'RETRY' : 'COMPLETE';
    await tx.cloudinaryDeletionJob.update({
      where: { id: job.id },
      data: { status, nextAttemptAt: status === 'RETRY' ? retryAt : new Date(), lastErrorCode: status === 'RETRY' ? 'remote_failure' : status === 'REJECTED' ? 'ownership_mismatch' : null },
    });
  });
}

export async function processPendingCloudinaryDeletionJobs(limit = 20): Promise<number> {
  const jobs = await prisma.cloudinaryDeletionJob.findMany({
    where: { status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' }, take: limit, select: { id: true },
  });
  for (const { id } of jobs) await processCloudinaryDeletionJob(id);
  return jobs.length;
}
