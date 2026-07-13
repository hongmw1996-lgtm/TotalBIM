ALTER TABLE "IfcModel"
ADD COLUMN "originalArchiveProvider" TEXT,
ADD COLUMN "originalArchiveBucket" TEXT,
ADD COLUMN "originalArchiveKey" TEXT,
ADD COLUMN "originalArchiveUrl" TEXT,
ADD COLUMN "originalArchivedAt" TIMESTAMP(3),
ADD COLUMN "originalDeletedAt" TIMESTAMP(3);

CREATE INDEX "IfcModel_originalArchiveProvider_idx" ON "IfcModel"("originalArchiveProvider");
CREATE INDEX "IfcModel_originalArchivedAt_idx" ON "IfcModel"("originalArchivedAt");
