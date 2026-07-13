import { readSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import path from "node:path";
import { IfcImporter } from "@thatopen/fragments";
import { prisma } from "@/lib/db/prisma";
import { sha256 } from "@/lib/ifc/checksum";
import { serializeIfcDerivative } from "@/lib/ifc/serializeIfcDerivative";
import { getObjectStorage } from "@/lib/storage/objectStorage";
import type { StorageProvider } from "@/lib/storage/types";

type CreateFragmentDerivativeInput = {
  modelId: string;
  filePath: string;
  originalFileName: string;
  storageProvider?: StorageProvider;
};

const READ_CHUNK_SIZE = 1024 * 1024;

function getWebIfcWasmPath() {
  return `${path.join(process.cwd(), "node_modules", "web-ifc")}${path.sep}`;
}

export async function createFragmentDerivative({
  modelId,
  filePath,
  originalFileName,
  storageProvider
}: CreateFragmentDerivativeInput) {
  if (!prisma) {
    throw new Error("Prisma client is not configured.");
  }

  const derivativeData = await storeFragmentDerivative({
    modelId,
    filePath,
    originalFileName,
    storageProvider
  });

  const derivative = await prisma.ifcModelDerivative.upsert({
    where: {
      modelId_kind_format_lod: {
        modelId,
        kind: "GEOMETRY",
        format: "FRAG",
        lod: "full"
      }
    },
    create: derivativeData,
    update: derivativeData
  });

  return serializeIfcDerivative(derivative);
}

export async function storeFragmentDerivative({
  modelId,
  filePath,
  originalFileName,
  storageProvider
}: CreateFragmentDerivativeInput) {
  const fileStat = await stat(filePath);
  const handle = await open(filePath, "r");
  const importer = new IfcImporter();

  importer.wasm = {
    path: getWebIfcWasmPath(),
    absolute: true
  };
  importer.includeUniqueAttributes = false;
  importer.includeRelationNames = false;
  importer.replaceStoreyElevation = true;
  importer.replaceSiteElevation = true;
  importer.distanceThreshold = 100000;

  const progressEvents: Array<{
    progress: number;
    phase?: string;
  }> = [];

  try {
    const output = await importer.process({
      id: modelId,
      readFromCallback: true,
      raw: false,
      readCallback: (offset: number) => {
        const buffer = new Uint8Array(READ_CHUNK_SIZE);
        const bytesRead = readSync(handle.fd, buffer, 0, READ_CHUNK_SIZE, offset);

        return buffer.slice(0, bytesRead);
      },
      progressCallback: (progress, data) => {
        progressEvents.push({
          progress,
          phase:
            typeof data === "object" && data && "process" in data
              ? String(data.process)
              : undefined
        });
      }
    });

    const outputBuffer = Buffer.from(output);
    const checksum = sha256(outputBuffer);
    const fileName = `${path.parse(originalFileName).name}.frag`;
    const storageKey = `ifc-models/${modelId}/derivatives/fragments/${fileName}`;
    const storage = getObjectStorage(storageProvider);
    const storedObject = await storage.putObject({
      key: storageKey,
      body: outputBuffer,
      contentType: "application/octet-stream",
      metadata: {
        modelId,
        derivativeKind: "GEOMETRY",
        derivativeFormat: "FRAG",
        derivativeLod: "full"
      }
    });

    return {
      modelId,
      kind: "GEOMETRY",
      format: "FRAG",
      lod: "full",
      storageProvider: storedObject.provider,
      storageBucket: storedObject.bucket,
      storageKey: storedObject.key,
      fileName,
      fileSize: storedObject.size,
      checksum,
      status: "READY",
      manifest: {
        sourceFileSize: fileStat.size,
        outputFileSize: storedObject.size,
        compressionRatio:
          fileStat.size > 0 ? storedObject.size / fileStat.size : null,
        progressEvents: progressEvents.slice(-20)
      }
    };
  } finally {
    await handle.close();
  }
}
