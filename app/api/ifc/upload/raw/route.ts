import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { createUploadedIfcModel } from "@/lib/ifc/createUploadedIfcModel";
import {
  getIfcUploadDir,
  getMaxUploadBytes,
  getMaxUploadMb,
  isSupportedBimFileName,
  sanitizeIfcFileName
} from "@/lib/ifc/uploadConfig";

export const runtime = "nodejs";
export const maxDuration = 300;

class UploadLimitError extends Error {}

function getProductionUploadConfigurationError() {
  if (process.env.VERCEL !== "1") {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return "운영 배포에서는 DATABASE_URL 설정이 필요합니다.";
  }

  const storageProvider = process.env.OBJECT_STORAGE_PROVIDER?.toUpperCase();

  if (
    (!storageProvider || storageProvider === "LOCAL") &&
    !process.env.BLOB_STORE_ID
  ) {
    return "운영 배포에서는 Vercel Blob, R2, S3, GCS 중 하나의 오브젝트 스토리지 설정이 필요합니다.";
  }

  return null;
}

async function writeRequestBodyToFile(request: Request, filePath: string) {
  if (!request.body) {
    throw new Error("Upload request body is required.");
  }

  const hash = createHash("sha256");
  const writer = createWriteStream(filePath, { flags: "wx" });
  const reader = request.body.getReader();
  const maxUploadBytes = getMaxUploadBytes();
  let fileSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      fileSize += value.byteLength;

      if (fileSize > maxUploadBytes) {
        throw new UploadLimitError(
          `File size must be ${getMaxUploadMb()}MB or less.`
        );
      }

      hash.update(value);

      if (!writer.write(value)) {
        await once(writer, "drain");
      }
    }

    await new Promise<void>((resolve, reject) => {
      writer.end(resolve);
      writer.once("error", reject);
    });
  } catch (error) {
    writer.destroy();
    await unlink(filePath).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return {
    fileSize,
    checksum: hash.digest("hex")
  };
}

function getOriginalFileName(request: Request) {
  const url = new URL(request.url);
  const rawFileName =
    url.searchParams.get("fileName") ??
    request.headers.get("x-ifc-file-name") ??
    "model.ifc";

  try {
    return sanitizeIfcFileName(decodeURIComponent(rawFileName)).normalize("NFC");
  } catch {
    return sanitizeIfcFileName(rawFileName).normalize("NFC");
  }
}

function getProjectMetadata(request: Request) {
  const url = new URL(request.url);
  const rawProjectId = url.searchParams.get("projectId");
  const rawModelVersion =
    url.searchParams.get("modelVersion") ??
    request.headers.get("x-ifc-model-version");

  return {
    projectId: rawProjectId && rawProjectId !== "default" ? rawProjectId : null,
    modelVersion: rawModelVersion?.trim() || null
  };
}

export async function PUT(request: Request) {
  const configurationError = getProductionUploadConfigurationError();

  if (configurationError) {
    return NextResponse.json({ error: configurationError }, { status: 503 });
  }

  const originalFileName = getOriginalFileName(request);
  const { projectId, modelVersion } = getProjectMetadata(request);

  if (!projectId) {
    return NextResponse.json({ error: "3D 모델 파일은 반드시 프로젝트에 업로드해야 합니다." }, { status: 400 });
  }

  if (!isSupportedBimFileName(originalFileName)) {
    return NextResponse.json({ error: "IFC, NWC, NWD 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > getMaxUploadBytes()) {
    return NextResponse.json({ error: `파일 크기는 ${getMaxUploadMb()}MB 이하여야 합니다.` }, { status: 413 });
  }

  const uploadDir = getIfcUploadDir();
  const fileName = `${randomUUID()}-${originalFileName}`;
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });

  try {
    const { fileSize, checksum } = await writeRequestBodyToFile(
      request,
      filePath
    );

    if (fileSize <= 0) {
      await unlink(filePath).catch(() => undefined);

      return NextResponse.json({ error: "빈 파일은 업로드할 수 없습니다." }, { status: 400 });
    }

    const model = await createUploadedIfcModel({
      projectId,
      modelVersion,
      fileName,
      originalFileName,
      filePath,
      fileSize,
      checksum
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);

    if (error instanceof UploadLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    throw error;
  }
}

