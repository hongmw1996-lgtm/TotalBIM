import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export const runtime = "nodejs";

const DEFAULT_MAX_PHOTO_UPLOAD_MB = 25;

function getMaxPhotoUploadMb() {
  const configuredSize = Number(process.env.PROJECT_PHOTO_MAX_UPLOAD_MB);

  return Number.isFinite(configuredSize) && configuredSize > 0
    ? configuredSize
    : DEFAULT_MAX_PHOTO_UPLOAD_MB;
}

function getMaxPhotoUploadBytes() {
  return getMaxPhotoUploadMb() * 1024 * 1024;
}

function sanitizePhotoFileName(fileName: string) {
  const safeName = path.basename(fileName).replace(/[\\/\0\r\n]/g, "_");
  return safeName.normalize("NFC") || "site-photo";
}

function isImageContentType(contentType: string) {
  return contentType.toLowerCase().startsWith("image/");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const rawProjectId = formData.get("projectId");
  const projectId =
    typeof rawProjectId === "string" && rawProjectId.trim()
      ? rawProjectId.trim()
      : "";

  if (!projectId) {
    return NextResponse.json(
      { error: "프로젝트 정보가 필요합니다." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "업로드할 사진 파일이 필요합니다." },
      { status: 400 }
    );
  }

  const contentType = file.type || "application/octet-stream";

  if (!isImageContentType(contentType)) {
    return NextResponse.json(
      { error: "이미지 파일만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "빈 파일은 업로드할 수 없습니다." },
      { status: 400 }
    );
  }

  if (file.size > getMaxPhotoUploadBytes()) {
    return NextResponse.json(
      { error: `사진 용량은 ${getMaxPhotoUploadMb()}MB 이하여야 합니다.` },
      { status: 413 }
    );
  }

  const originalFileName = sanitizePhotoFileName(file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const objectKey = `project-photos/${projectId}/${randomUUID()}-${originalFileName}`;
  let storedObject;

  try {
    storedObject = await getObjectStorage("GOOGLE_DRIVE").putObject({
      key: objectKey,
      body: fileBuffer,
      contentType,
      metadata: {
        projectId,
        originalFileName
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Google Drive에 사진을 업로드하지 못했습니다."
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      photo: {
        id: storedObject.key,
        provider: storedObject.provider,
        bucket: storedObject.bucket ?? null,
        fileName: originalFileName,
        size: storedObject.size,
        contentType,
        url: `/api/projects/photos/${encodeURIComponent(storedObject.key)}`
      }
    },
    { status: 201 }
  );
}
