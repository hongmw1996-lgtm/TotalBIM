type IfcModelRecord = {
  id: string;
  projectId?: string | null;
  modelVersion?: string | null;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  originalStorageProvider?: string;
  originalStorageBucket?: string | null;
  originalStorageKey?: string | null;
  originalChecksum?: string | null;
  originalArchiveProvider?: string | null;
  originalArchiveBucket?: string | null;
  originalArchiveKey?: string | null;
  originalArchiveUrl?: string | null;
  originalArchivedAt?: Date | null;
  originalDeletedAt?: Date | null;
  _count?: {
    objects: number;
    derivatives?: number;
  };
};

export function getIfcModelFileUrl(modelId: string) {
  return `/api/ifc/models/${modelId}/file`;
}

function getModelFileFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toUpperCase();

  return extension === "NWC" || extension === "NWD" ? extension : "IFC";
}

export function serializeIfcModel(model: IfcModelRecord) {
  return {
    id: model.id,
    projectId: model.projectId ?? null,
    modelVersion: model.modelVersion ?? null,
    fileName: model.fileName,
    originalFileName: model.originalFileName,
    fileFormat: getModelFileFormat(model.originalFileName || model.fileName),
    fileSize: model.fileSize,
    status: model.status,
    originalStorageProvider: model.originalStorageProvider ?? "LOCAL",
    originalStorageBucket: model.originalStorageBucket,
    originalStorageKey: model.originalStorageKey,
    originalChecksum: model.originalChecksum,
    originalArchiveProvider: model.originalArchiveProvider,
    originalArchiveBucket: model.originalArchiveBucket,
    originalArchiveKey: model.originalArchiveKey,
    originalArchiveUrl: model.originalArchiveUrl,
    originalArchivedAt: model.originalArchivedAt?.toISOString() ?? null,
    originalDeletedAt: model.originalDeletedAt?.toISOString() ?? null,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt?.toISOString(),
    objectCount: model._count?.objects ?? 0,
    derivativeCount: model._count?.derivatives ?? 0,
    fileUrl: getIfcModelFileUrl(model.id)
  };
}
