import path from "node:path";
import { NextResponse } from "next/server";
import { createUploadedIfcModel } from "@/lib/ifc/createUploadedIfcModel";
import {
  getMaxUploadBytes,
  getMaxUploadMb,
  isSupportedBimFileName,
  sanitizeIfcFileName
} from "@/lib/ifc/uploadConfig";

export const runtime = "nodejs";

type CompleteBlobUploadRequest = {
  url?: string;
  pathname?: string;
  size?: number;
  originalFileName?: string;
  projectId?: string | null;
  modelVersion?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompleteBlobUploadRequest;
    const blobUrl = body.url;
    const blobPathname = body.pathname;
    const fileSize = Number(body.size ?? 0);
    const projectId =
      body.projectId && body.projectId !== "default" ? body.projectId : null;
    const modelVersion = body.modelVersion?.trim() || null;
    const originalFileName = sanitizeIfcFileName(
      body.originalFileName ?? path.basename(blobPathname ?? "model.ifc")
    );

    if (!blobUrl || !blobPathname) {
      return NextResponse.json(
        { error: "Blob upload result is required." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "3D model files must be uploaded to a project." },
        { status: 400 }
      );
    }

    if (!isSupportedBimFileName(originalFileName)) {
      return NextResponse.json(
        { error: "Only .ifc, .nwc, and .nwd files can be uploaded." },
        { status: 400 }
      );
    }

    if (fileSize <= 0) {
      return NextResponse.json(
        { error: "Empty files cannot be uploaded." },
        { status: 400 }
      );
    }

    if (fileSize > getMaxUploadBytes()) {
      return NextResponse.json(
        { error: `File size must be ${getMaxUploadMb()}MB or less.` },
        { status: 413 }
      );
    }

    const model = await createUploadedIfcModel({
      projectId,
      modelVersion,
      fileName: path.basename(blobPathname),
      originalFileName,
      filePath: blobUrl,
      fileSize,
      checksum: null,
      originalStorageProvider: "BLOB",
      originalStorageBucket: process.env.BLOB_STORE_ID ?? null,
      originalStorageKey: blobUrl
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Blob upload completion failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
