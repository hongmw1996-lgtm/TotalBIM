import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    modelId: string;
  }>;
};

type ArchiveOriginalRequest = {
  archiveProvider?: string;
  archiveBucket?: string | null;
  archiveKey?: string;
  archiveUrl?: string | null;
  deleteOriginalBlob?: boolean;
};

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = assertWorkerAuthorized(request);

  if (unauthorized) {
    return unauthorized;
  }

  if (!isDatabaseConfigured() || !prisma) {
    return NextResponse.json(
      { error: "DATABASE_URL is required for worker processing." },
      { status: 503 }
    );
  }

  const { modelId } = await context.params;
  const body = (await request.json()) as ArchiveOriginalRequest;

  if (!body.archiveProvider || !body.archiveKey) {
    return NextResponse.json(
      { error: "archiveProvider and archiveKey are required." },
      { status: 400 }
    );
  }

  const existingModel = await prisma.ifcModel.findUnique({
    where: {
      id: modelId
    }
  });

  if (!existingModel) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  let model = await prisma.ifcModel.update({
    where: {
      id: modelId
    },
    data: {
      originalArchiveProvider: body.archiveProvider,
      originalArchiveBucket: body.archiveBucket,
      originalArchiveKey: body.archiveKey,
      originalArchiveUrl: body.archiveUrl,
      originalArchivedAt: new Date()
    }
  });

  let originalDeleteError: string | null = null;
  let originalDeletedAt = existingModel.originalDeletedAt;

  if (
    body.deleteOriginalBlob !== false &&
    !existingModel.originalDeletedAt &&
    existingModel.originalStorageProvider === "BLOB" &&
    existingModel.originalStorageKey
  ) {
    try {
      await getObjectStorage().deleteObject(existingModel.originalStorageKey);
      originalDeletedAt = new Date();
    } catch (error) {
      originalDeleteError =
        error instanceof Error ? error.message : "Failed to delete original Blob.";
    }
  }

  if (originalDeletedAt && !existingModel.originalDeletedAt) {
    model = await prisma.ifcModel.update({
      where: {
        id: modelId
      },
      data: {
        originalDeletedAt
      }
    });
  }

  return NextResponse.json({
    modelId: model.id,
    originalArchivedAt: model.originalArchivedAt?.toISOString() ?? null,
    originalDeletedAt: model.originalDeletedAt?.toISOString() ?? null,
    originalDeleteError
  });
}
