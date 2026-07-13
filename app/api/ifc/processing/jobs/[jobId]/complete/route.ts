import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

type CompleteJobRequest = {
  storageProvider: string;
  storageBucket?: string | null;
  storageKey: string;
  fileName: string;
  fileSize: number;
  checksum?: string | null;
  manifest?: unknown;
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
  const body = (await request.json()) as CompleteJobRequest;
  const job = await prisma.ifcProcessingJob.findUnique({
    where: {
      id: jobId
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Processing job not found." }, { status: 404 });
  }

  const manifest = body.manifest as Prisma.InputJsonValue | undefined;
  const derivative = await prisma.ifcModelDerivative.upsert({
    where: {
      modelId_kind_format_lod: {
        modelId: job.modelId,
        kind: "GEOMETRY",
        format: "FRAG",
        lod: "full"
      }
    },
    create: {
      modelId: job.modelId,
      kind: "GEOMETRY",
      format: "FRAG",
      lod: "full",
      storageProvider: body.storageProvider,
      storageBucket: body.storageBucket,
      storageKey: body.storageKey,
      fileName: body.fileName,
      fileSize: body.fileSize,
      checksum: body.checksum,
      status: "READY",
      manifest
    },
    update: {
      storageProvider: body.storageProvider,
      storageBucket: body.storageBucket,
      storageKey: body.storageKey,
      fileName: body.fileName,
      fileSize: body.fileSize,
      checksum: body.checksum,
      status: "READY",
      manifest
    }
  });

  const [updatedJob, model] = await prisma.$transaction([
    prisma.ifcProcessingJob.update({
      where: {
        id: jobId
      },
      data: {
        status: "READY",
        message: "경량 파생 파일 생성이 완료되었습니다.",
        error: null,
        lockedAt: null,
        completedAt: new Date()
      }
    }),
    prisma.ifcModel.update({
      where: {
        id: job.modelId
      },
      data: {
        status: "READY"
      },
      include: {
        _count: {
          select: {
            objects: true,
            derivatives: true
          }
        }
      }
    })
  ]);

  return NextResponse.json({
    job: {
      ...updatedJob,
      createdAt: updatedJob.createdAt.toISOString(),
      updatedAt: updatedJob.updatedAt.toISOString(),
      lockedAt: updatedJob.lockedAt?.toISOString() ?? null,
      startedAt: updatedJob.startedAt?.toISOString() ?? null,
      completedAt: updatedJob.completedAt?.toISOString() ?? null
    },
    model: serializeIfcModel(model),
    derivative
  });
}
