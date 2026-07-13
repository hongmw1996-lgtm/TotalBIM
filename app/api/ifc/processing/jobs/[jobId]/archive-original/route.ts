import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
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

  const { jobId } = await context.params;
  const body = (await request.json()) as ArchiveOriginalRequest;

  if (!body.archiveProvider || !body.archiveKey) {
    return NextResponse.json(
      { error: "archiveProvider and archiveKey are required." },
      { status: 400 }
    );
  }

  const job = await prisma.ifcProcessingJob.findUnique({
    where: {
      id: jobId
    },
    include: {
      model: true
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Processing job not found." }, { status: 404 });
  }

  const archivedAt = new Date();
  let originalDeletedAt = job.model.originalDeletedAt;
  let originalDeleteError: string | null = null;

  let model = await prisma.ifcModel.update({
    where: {
      id: job.modelId
    },
    data: {
      originalArchiveProvider: body.archiveProvider,
      originalArchiveBucket: body.archiveBucket,
      originalArchiveKey: body.archiveKey,
      originalArchiveUrl: body.archiveUrl,
      originalArchivedAt: archivedAt
    }
  });

  if (
    body.deleteOriginalBlob !== false &&
    !job.model.originalDeletedAt &&
    job.model.originalStorageProvider === "BLOB" &&
    job.model.originalStorageKey
  ) {
    try {
      await getObjectStorage().deleteObject(job.model.originalStorageKey);
      originalDeletedAt = new Date();
    } catch (error) {
      originalDeleteError =
        error instanceof Error ? error.message : "Failed to delete original Blob.";
    }
  }

  if (originalDeletedAt && !job.model.originalDeletedAt) {
    model = await prisma.ifcModel.update({
      where: {
        id: job.modelId
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
