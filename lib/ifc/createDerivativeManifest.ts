import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/ifc/checksum";
import { getObjectStorage } from "@/lib/storage/objectStorage";
import type { StorageProvider } from "@/lib/storage/types";
import { viewerLoadModes } from "@/lib/viewer/loadModes";

type IfcModelForDerivative = {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  originalChecksum?: string | null;
};

export function buildInitialDerivativeManifest(model: IfcModelForDerivative) {
  return {
    version: 1,
    modelId: model.id,
    originalFileName: model.originalFileName,
    source: {
      fileName: model.fileName,
      fileSize: model.fileSize,
      checksum: model.originalChecksum ?? null
    },
    loadModes: viewerLoadModes.map((loadMode) => ({
      ...loadMode,
      requiresGeometry:
        loadMode.mode !== "metadata-only" && loadMode.mode !== "original-ifc"
    })),
    chunks: {
      preview: [],
      storeys: [],
      categories: [],
      full: []
    },
    processing: {
      geometryStatus: "PENDING",
      recommendedPipeline: [
        "parse-ifc-metadata",
        "extract-object-index",
        "generate-preview-lod",
        "split-by-storey",
        "split-by-category",
        "publish-viewer-manifest"
      ]
    }
  };
}

export async function createInitialDerivativeManifest(
  model: IfcModelForDerivative,
  storageProvider?: StorageProvider
) {
  if (!prisma) {
    throw new Error("Prisma client is not configured.");
  }

  const derivativeData = await storeInitialDerivativeManifest(
    model,
    storageProvider
  );

  return prisma.ifcModelDerivative.create({
    data: derivativeData
  });
}

export async function storeInitialDerivativeManifest(
  model: IfcModelForDerivative,
  storageProvider?: StorageProvider
) {
  const manifest = buildInitialDerivativeManifest(model);
  const body = Buffer.from(JSON.stringify(manifest, null, 2));
  const checksum = sha256(body);
  const storageKey = `ifc-models/${model.id}/derivatives/metadata/manifest.json`;
  const objectStorage = getObjectStorage(storageProvider);
  const storedObject = await objectStorage.putObject({
    key: storageKey,
    body,
    contentType: "application/json",
    metadata: {
      modelId: model.id,
      derivativeKind: "METADATA",
      derivativeFormat: "JSON"
    }
  });

  return {
    modelId: model.id,
    kind: "METADATA",
    format: "JSON",
    lod: "metadata",
    storageProvider: storedObject.provider,
    storageBucket: storedObject.bucket,
    storageKey: storedObject.key,
    fileName: "manifest.json",
    fileSize: storedObject.size,
    checksum,
    status: "READY",
    manifest
  };
}
