import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { sha256 } from "@/lib/ifc/checksum";
import { createUploadedIfcModel } from "@/lib/ifc/createUploadedIfcModel";
import {
  getIfcUploadDir,
  getMaxUploadBytes,
  getMaxUploadMb,
  isSupportedBimFileName,
  sanitizeIfcFileName
} from "@/lib/ifc/uploadConfig";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const configurationError = getProductionUploadConfigurationError();

  if (configurationError) {
    return NextResponse.json({ error: configurationError }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawProjectId = formData.get("projectId");
  const rawModelVersion = formData.get("modelVersion");
  const projectId =
    typeof rawProjectId === "string" && rawProjectId !== "default"
      ? rawProjectId
      : null;
  const modelVersion =
    typeof rawModelVersion === "string" && rawModelVersion.trim()
      ? rawModelVersion.trim()
      : null;

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A supported 3D model file is required." },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "3D model files must be uploaded to a project." },
      { status: 400 }
    );
  }

  const originalFileName = sanitizeIfcFileName(file.name);

  if (!isSupportedBimFileName(originalFileName)) {
    return NextResponse.json(
      { error: "Only .ifc, .nwc, and .nwd files can be uploaded." },
      { status: 400 }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "Empty files cannot be uploaded." },
      { status: 400 }
    );
  }

  if (file.size > getMaxUploadBytes()) {
    return NextResponse.json(
      { error: `File size must be ${getMaxUploadMb()}MB or less.` },
      { status: 413 }
    );
  }

  const uploadDir = getIfcUploadDir();
  const fileName = `${randomUUID()}-${originalFileName}`;
  const filePath = path.join(uploadDir, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const checksum = sha256(fileBuffer);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, fileBuffer);

  try {
    const model = await createUploadedIfcModel({
      projectId,
      modelVersion,
      fileName,
      originalFileName,
      filePath,
      fileSize: file.size,
      checksum
    });

    return NextResponse.json(
      {
        model
      },
      { status: 201 }
    );
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
}
