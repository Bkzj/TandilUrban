-- Phase 0 additive migration. Existing legacy image JSON remains untouched and unverified.
CREATE TYPE "CloudinaryAssetStatus" AS ENUM ('DRAFT', 'BOUND', 'PENDING_DELETION', 'DELETED');
CREATE TYPE "CloudinaryCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'COMPLETE', 'REJECTED');

CREATE TABLE "CloudinaryAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "CloudinaryAssetStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "boundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CloudinaryAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CloudinaryDeletionJob" (
    "id" TEXT NOT NULL,
    "inmobiliariaId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "CloudinaryCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CloudinaryDeletionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CloudinaryDeletionResource" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" "CloudinaryCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resultCode" TEXT,
    "lastErrorCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CloudinaryDeletionResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "CloudinaryAsset_publicId_key" ON "CloudinaryAsset"("publicId");
CREATE UNIQUE INDEX "CloudinaryAsset_secureUrl_key" ON "CloudinaryAsset"("secureUrl");
CREATE INDEX "CloudinaryAsset_inmobiliariaId_propertyId_idx" ON "CloudinaryAsset"("inmobiliariaId", "propertyId");
CREATE INDEX "CloudinaryAsset_inmobiliariaId_createdAt_idx" ON "CloudinaryAsset"("inmobiliariaId", "createdAt");
CREATE INDEX "CloudinaryAsset_status_expiresAt_idx" ON "CloudinaryAsset"("status", "expiresAt");
CREATE INDEX "CloudinaryDeletionJob_status_nextAttemptAt_idx" ON "CloudinaryDeletionJob"("status", "nextAttemptAt");
CREATE INDEX "CloudinaryDeletionJob_inmobiliariaId_propertyId_idx" ON "CloudinaryDeletionJob"("inmobiliariaId", "propertyId");
CREATE UNIQUE INDEX "CloudinaryDeletionResource_jobId_publicId_key" ON "CloudinaryDeletionResource"("jobId", "publicId");
CREATE INDEX "CloudinaryDeletionResource_status_idx" ON "CloudinaryDeletionResource"("status");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

ALTER TABLE "CloudinaryAsset" ADD CONSTRAINT "CloudinaryAsset_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CloudinaryDeletionJob" ADD CONSTRAINT "CloudinaryDeletionJob_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CloudinaryDeletionResource" ADD CONSTRAINT "CloudinaryDeletionResource_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CloudinaryDeletionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback (only after exporting cleanup/audit rows and rolling back the application):
-- DROP TABLE "RateLimitBucket";
-- DROP TABLE "CloudinaryDeletionResource";
-- DROP TABLE "CloudinaryDeletionJob";
-- DROP TABLE "CloudinaryAsset";
-- DROP TYPE "CloudinaryCleanupStatus";
-- DROP TYPE "CloudinaryAssetStatus";
