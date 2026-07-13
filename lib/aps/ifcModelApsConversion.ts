import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { Prisma } from "@/generated/prisma/client";
import {
  encodeApsUrn,
  getApsBucketKey,
  getApsDerivativeManifest,
  getApsDerivativeStatus,
  startApsSvf2Translation,
  uploadApsObject
} from "@/lib/aps/apsClient";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import type { LocalIfcModel } from "@/lib/ifc/local/localIfcRepository";
import {
  countLocalIfcDerivatives,
  getLocalIfcModel,
  listLocalIfcDerivatives,
  listLocalIfcModels,
  upsertLocalIfcDerivative,
  updateLocalIfcModelStatus
} from "@/lib/ifc/local/localIfcRepository";
import { serializeIfcDerivative } from "@/lib/ifc/serializeIfcDerivative";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";
import { getBimFileExtension, isPathInsideIfcUploadDir } from "@/lib/ifc/uploadConfig";
import { getObjectStorage } from "@/lib/storage/objectStorage";

const APS_DERIVATIVE_KIND = "GEOMETRY";
const APS_DERIVATIVE_FORMAT = "SVF2";
const APS_DERIVATIVE_LOD = "aps";

type ApsConvertibleModel = {
  id: string;
  projectId?: string | null;
  modelVersion?: string | null;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  originalStorageProvider?: string | null;
  originalStorageBucket?: string | null;
  originalStorageKey?: string | null;
  originalArchiveProvider?: string | null;
  originalArchiveBucket?: string | null;
  originalArchiveKey?: string | null;
  originalArchiveUrl?: string | null;
  originalArchivedAt?: Date | null;
  originalDeletedAt?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isApsConvertibleFile(fileName: string) {
  return [".nwc", ".nwd"].includes(getBimFileExtension(fileName));
}

function sanitizeApsObjectName(model: ApsConvertibleModel) {
  const safeFileName = model.originalFileName.replace(/[\\/\0\r\n]/g, "_");

  return `${model.id}-${safeFileName}`;
}

function toPrismaJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function readModelSource(model: ApsConvertibleModel) {
  if (model.originalDeletedAt) {
    throw new Error("원본 파일이 아카이브되어 APS 변환을 시작할 수 없습니다.");
  }

  if (model.originalStorageProvider && model.originalStorageProvider !== "LOCAL") {
    const object = await getObjectStorage(model.originalStorageProvider).readObject(
      model.originalStorageKey ?? model.filePath
    );
    const buffer = await streamToBuffer(object.body);

    return {
      buffer,
      size: object.contentLength ?? buffer.byteLength
    };
  }

  if (!isPathInsideIfcUploadDir(model.filePath)) {
    throw new Error("저장된 원본 파일 경로가 유효하지 않습니다.");
  }

  const fileStat = await stat(model.filePath);
  const buffer =
    fileStat.size <= 250 * 1024 * 1024
      ? await readFile(model.filePath)
      : await streamToBuffer(createReadStream(model.filePath));

  return {
    buffer,
    size: fileStat.size
  };
}

async function getDatabaseModel(id: string) {
  if (!isDatabaseConfigured() || !prisma) {
    return getLocalIfcModel(id);
  }

  return prisma.ifcModel.findUnique({
    where: {
      id
    }
  });
}

async function getSerializedApsModel(id: string) {
  if (!isDatabaseConfigured() || !prisma) {
    const model = await getLocalIfcModel(id);

    if (!model) {
      return null;
    }

    return serializeIfcModel({
      ...model,
      _count: {
        objects: 0,
        derivatives: await countLocalIfcDerivatives(id)
      }
    });
  }

  const model = await prisma.ifcModel.findUnique({
    where: {
      id
    },
    include: {
      _count: {
        select: {
          objects: true,
          derivatives: true
        }
      }
    }
  });

  return model ? serializeIfcModel(model) : null;
}

export async function startApsConversionForModel(id: string) {
  const model = await getDatabaseModel(id);

  if (!model) {
    throw new Error("모델을 찾을 수 없습니다.");
  }

  if (!isApsConvertibleFile(model.originalFileName)) {
    throw new Error("APS 변환은 NWC/NWD 파일만 처리합니다.");
  }

  const source = await readModelSource(model);
  const objectName = sanitizeApsObjectName(model);
  const object = await uploadApsObject({
    objectName,
    body: source.buffer,
    contentLength: source.size
  });
  const urn = encodeApsUrn(object.objectId);
  const jobManifest = await startApsSvf2Translation(urn, model.originalFileName);
  const manifest = {
    apsObject: object,
    translationJob: jobManifest,
    urn
  };

  if (!isDatabaseConfigured() || !prisma) {
    await updateLocalIfcModelStatus(id, "PROCESSING");
    const derivative = await upsertLocalIfcDerivative({
      modelId: id,
      kind: APS_DERIVATIVE_KIND,
      format: APS_DERIVATIVE_FORMAT,
      lod: APS_DERIVATIVE_LOD,
      storageProvider: "APS",
      storageBucket: getApsBucketKey(),
      storageKey: urn,
      fileName: `${model.originalFileName}.svf2`,
      fileSize: 0,
      checksum: null,
      status: "PROCESSING",
      manifest
    });

    return {
      model: await getSerializedApsModel(id),
      derivative: serializeIfcDerivative(derivative)
    };
  }

  const derivative = await prisma.ifcModelDerivative.upsert({
    where: {
      modelId_kind_format_lod: {
        modelId: id,
        kind: APS_DERIVATIVE_KIND,
        format: APS_DERIVATIVE_FORMAT,
        lod: APS_DERIVATIVE_LOD
      }
    },
    create: {
      modelId: id,
      kind: APS_DERIVATIVE_KIND,
      format: APS_DERIVATIVE_FORMAT,
      lod: APS_DERIVATIVE_LOD,
      storageProvider: "APS",
      storageBucket: getApsBucketKey(),
      storageKey: urn,
      fileName: `${model.originalFileName}.svf2`,
      fileSize: 0,
      checksum: null,
      status: "PROCESSING",
      manifest: toPrismaJson(manifest)
    },
    update: {
      storageProvider: "APS",
      storageBucket: getApsBucketKey(),
      storageKey: urn,
      fileName: `${model.originalFileName}.svf2`,
      fileSize: 0,
      checksum: null,
      status: "PROCESSING",
      manifest: toPrismaJson(manifest)
    }
  });
  await prisma.ifcModel.update({
    where: {
      id
    },
    data: {
      status: "PROCESSING"
    }
  });

  return {
    model: await getSerializedApsModel(id),
    derivative: serializeIfcDerivative(derivative)
  };
}

export async function refreshApsConversionStatus(id: string) {
  if (!isDatabaseConfigured() || !prisma) {
    const derivatives = await listLocalIfcDerivatives(id);
    const derivative = derivatives.find(
      (item) =>
        item.storageProvider === "APS" &&
        item.kind === APS_DERIVATIVE_KIND &&
        item.format === APS_DERIVATIVE_FORMAT
    );

    if (!derivative) {
      return null;
    }

    const manifest = await getApsDerivativeManifest(derivative.storageKey);
    const status = getApsDerivativeStatus(manifest);
    const updatedDerivative = await upsertLocalIfcDerivative({
      ...derivative,
      status,
      manifest
    });
    await updateLocalIfcModelStatus(id, status);

    return {
      model: await getSerializedApsModel(id),
      derivative: serializeIfcDerivative(updatedDerivative)
    };
  }

  const derivative = await prisma.ifcModelDerivative.findFirst({
    where: {
      modelId: id,
      storageProvider: "APS",
      kind: APS_DERIVATIVE_KIND,
      format: APS_DERIVATIVE_FORMAT
    }
  });

  if (!derivative) {
    return null;
  }

  const manifest = await getApsDerivativeManifest(derivative.storageKey);
  const status = getApsDerivativeStatus(manifest);
  const updatedDerivative = await prisma.ifcModelDerivative.update({
    where: {
      id: derivative.id
    },
    data: {
      status,
      manifest: toPrismaJson(manifest)
    }
  });
  await prisma.ifcModel.update({
    where: {
      id
    },
    data: {
      status
    }
  });

  return {
    model: await getSerializedApsModel(id),
    derivative: serializeIfcDerivative(updatedDerivative)
  };
}

async function refreshLocalPendingApsConversions() {
  const models = await listLocalIfcModels();
  const processingNwcModels = models.filter(
    (model) => model.status === "PROCESSING" && isApsConvertibleFile(model.originalFileName)
  );

  await Promise.allSettled(
    processingNwcModels.map((model: LocalIfcModel) =>
      refreshApsConversionStatus(model.id)
    )
  );
}

export async function refreshPendingApsConversions() {
  if (!isDatabaseConfigured() || !prisma) {
    await refreshLocalPendingApsConversions();
    return;
  }

  const derivatives = await prisma.ifcModelDerivative.findMany({
    where: {
      storageProvider: "APS",
      kind: APS_DERIVATIVE_KIND,
      format: APS_DERIVATIVE_FORMAT,
      status: "PROCESSING",
      model: {
        status: "PROCESSING"
      }
    },
    select: {
      modelId: true
    },
    take: 20
  });

  await Promise.allSettled(
    derivatives.map((derivative) => refreshApsConversionStatus(derivative.modelId))
  );
}
