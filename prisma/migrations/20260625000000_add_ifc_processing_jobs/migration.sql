-- CreateTable
CREATE TABLE "IfcProcessingJob" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FRAG_DERIVATIVE',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "message" TEXT,
    "error" TEXT,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfcProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IfcProcessingJob_modelId_idx" ON "IfcProcessingJob"("modelId");

-- CreateIndex
CREATE INDEX "IfcProcessingJob_status_idx" ON "IfcProcessingJob"("status");

-- CreateIndex
CREATE INDEX "IfcProcessingJob_type_idx" ON "IfcProcessingJob"("type");

-- CreateIndex
CREATE INDEX "IfcProcessingJob_createdAt_idx" ON "IfcProcessingJob"("createdAt");

-- CreateIndex
CREATE INDEX "IfcProcessingJob_lockedAt_idx" ON "IfcProcessingJob"("lockedAt");

-- AddForeignKey
ALTER TABLE "IfcProcessingJob" ADD CONSTRAINT "IfcProcessingJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "IfcModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
