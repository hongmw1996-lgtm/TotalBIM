import { randomUUID } from "node:crypto";
import path from "node:path";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  createInitialDerivativeManifest,
  storeInitialDerivativeManifest
} from "@/lib/ifc/createDerivativeManifest";
import {
  countLocalIfcDerivatives,
  createLocalIfcModel,
  deleteLocalIfcModel,
  upsertLocalIfcDerivative
} from "@/lib/ifc/local/localIfcRepository";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

type CreateUploadedIfcModelInput = {
  projectId: string;
  modelVersion?: string | null;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  checksum?: string | null;
  originalStorageProvider?: string;
  originalStorageBucket?: string | null;
  originalStorageKey?: string | null;
};

export async function createUploadedIfcModel({
  projectId,
  modelVersion = null,
  fileName,
  originalFileName,
  filePath,
  fileSize,
  checksum,
  originalStorageProvider = "LOCAL",
  originalStorageBucket = null,
  originalStorageKey
}: CreateUploadedIfcModelInput) {
  const resolvedStorageKey =
    originalStorageKey ??
    path.relative(process.cwd(), filePath).replace(/\\/g, "/");

  if (!projectId) {
    throw new Error("3D model files must be uploaded to a project.");
  }

  if (!isDatabaseConfigured() || !prisma) {
    let createdModelId: string | null = null;

    try {
      const model = await createLocalIfcModel({
        id: randomUUID(),
        projectId,
        modelVersion,
        fileName,
        originalFileName,
        filePath,
        fileSize,
        originalStorageProvider,
        originalStorageBucket,
        originalStorageKey: resolvedStorageKey,
        originalChecksum: checksum,
        status: "UPLOADED"
      });
      createdModelId = model.id;

      const manifestDerivative = await storeInitialDerivativeManifest(model, "LOCAL");
      await upsertLocalIfcDerivative(manifestDerivative);
      const derivativeCount = await countLocalIfcDerivatives(model.id);

      return serializeIfcModel({
        ...model,
        _count: {
          objects: 0,
          derivatives: derivativeCount
        }
      });
    } catch (error) {
      if (createdModelId) {
        await deleteLocalIfcModel(createdModelId);
      }

      throw error;
    }
  }

  let createdModelId: string | null = null;

  try {
    const model = await prisma.ifcModel.create({
      data: {
        fileName,
        projectId,
        modelVersion,
        originalFileName,
        filePath,
        fileSize,
        originalStorageProvider,
        originalStorageBucket,
        originalStorageKey: resolvedStorageKey,
        originalChecksum: checksum,
        status: "UPLOADED"
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

    createdModelId = model.id;
    await createInitialDerivativeManifest(model);

    const modelWithDerivatives = await prisma.ifcModel.findUniqueOrThrow({
      where: {
        id: model.id
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

    return serializeIfcModel(modelWithDerivatives);
  } catch (error) {
    if (createdModelId) {
      await prisma.ifcModel
        .delete({
          where: {
            id: createdModelId
          }
        })
        .catch(() => undefined);
    }

    throw error;
  }
}
