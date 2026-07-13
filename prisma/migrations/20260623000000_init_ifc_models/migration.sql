-- CreateTable
CREATE TABLE "IfcModel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfcModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IfcObject" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "expressId" INTEGER,
    "globalId" TEXT,
    "ifcType" TEXT,
    "name" TEXT,
    "objectType" TEXT,
    "storeyName" TEXT,
    "category" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IfcObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IfcModel_projectId_idx" ON "IfcModel"("projectId");

-- CreateIndex
CREATE INDEX "IfcModel_status_idx" ON "IfcModel"("status");

-- CreateIndex
CREATE INDEX "IfcModel_createdAt_idx" ON "IfcModel"("createdAt");

-- CreateIndex
CREATE INDEX "IfcObject_modelId_idx" ON "IfcObject"("modelId");

-- CreateIndex
CREATE INDEX "IfcObject_expressId_idx" ON "IfcObject"("expressId");

-- CreateIndex
CREATE INDEX "IfcObject_globalId_idx" ON "IfcObject"("globalId");

-- CreateIndex
CREATE INDEX "IfcObject_ifcType_idx" ON "IfcObject"("ifcType");

-- CreateIndex
CREATE INDEX "IfcObject_storeyName_idx" ON "IfcObject"("storeyName");

-- CreateIndex
CREATE INDEX "IfcObject_category_idx" ON "IfcObject"("category");

-- AddForeignKey
ALTER TABLE "IfcObject" ADD CONSTRAINT "IfcObject_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "IfcModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
