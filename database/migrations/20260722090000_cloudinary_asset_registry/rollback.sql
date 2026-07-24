-- MANUAL ROLLBACK ONLY.
-- First roll back the application, stop cleanup workers, and export all four tables.
DROP TABLE IF EXISTS "RateLimitBucket";
DROP TABLE IF EXISTS "CloudinaryDeletionResource";
DROP TABLE IF EXISTS "CloudinaryDeletionJob";
DROP TABLE IF EXISTS "CloudinaryAsset";
DROP TYPE IF EXISTS "CloudinaryCleanupStatus";
DROP TYPE IF EXISTS "CloudinaryAssetStatus";
