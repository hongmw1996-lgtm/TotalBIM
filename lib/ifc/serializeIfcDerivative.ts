type IfcDerivativeRecord = {
  id: string;
  modelId: string;
  kind: string;
  format: string;
  lod?: string | null;
  storageProvider: string;
  storageBucket?: string | null;
  storageKey: string;
  fileName: string;
  fileSize: number;
  checksum?: string | null;
  status: string;
  manifest?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function getIfcDerivativeFileUrl(modelId: string, derivativeId: string) {
  return `/api/ifc/models/${modelId}/derivatives/${derivativeId}/file`;
}

export function serializeIfcDerivative(derivative: IfcDerivativeRecord) {
  return {
    id: derivative.id,
    modelId: derivative.modelId,
    kind: derivative.kind,
    format: derivative.format,
    lod: derivative.lod,
    storageProvider: derivative.storageProvider,
    storageBucket: derivative.storageBucket,
    storageKey: derivative.storageKey,
    fileName: derivative.fileName,
    fileSize: derivative.fileSize,
    checksum: derivative.checksum,
    status: derivative.status,
    manifest: derivative.manifest,
    createdAt: derivative.createdAt.toISOString(),
    updatedAt: derivative.updatedAt.toISOString(),
    fileUrl: getIfcDerivativeFileUrl(derivative.modelId, derivative.id)
  };
}
