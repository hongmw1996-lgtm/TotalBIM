-- AlterTable
ALTER TABLE "IfcModel"
ADD COLUMN "originalStorageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "originalStorageBucket" TEXT,
ADD COLUMN "originalStorageKey" TEXT,
ADD COLUMN "originalChecksum" TEXT;

-- CreateTable
CREATE TABLE "IfcModelDerivative" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "lod" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageBucket" TEXT,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "manifest" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfcModelDerivative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IfcModel_originalStorageProvider_idx" ON "IfcModel"("originalStorageProvider");

-- CreateIndex
CREATE UNIQUE INDEX "IfcModelDerivative_modelId_kind_format_lod_key" ON "IfcModelDerivative"("modelId", "kind", "format", "lod");

-- CreateIndex
CREATE INDEX "IfcModelDerivative_modelId_idx" ON "IfcModelDerivative"("modelId");

-- CreateIndex
CREATE INDEX "IfcModelDerivative_kind_idx" ON "IfcModelDerivative"("kind");

-- CreateIndex
CREATE INDEX "IfcModelDerivative_format_idx" ON "IfcModelDerivative"("format");

-- CreateIndex
CREATE INDEX "IfcModelDerivative_storageProvider_idx" ON "IfcModelDerivative"("storageProvider");

-- CreateIndex
CREATE INDEX "IfcModelDerivative_status_idx" ON "IfcModelDerivative"("status");

-- AddForeignKey
ALTER TABLE "IfcModelDerivative" ADD CONSTRAINT "IfcModelDerivative_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "IfcModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
