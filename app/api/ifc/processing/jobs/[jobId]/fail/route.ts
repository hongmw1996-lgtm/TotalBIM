import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

type FailJobRequest = {
  error?: string;
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
  const body = (await request.json()) as FailJobRequest;
  const job = await prisma.ifcProcessingJob.findUnique({
    where: {
      id: jobId
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Processing job not found." }, { status: 404 });
  }

  const canRetry = job.attempts < job.maxAttempts;
  const nextStatus = canRetry ? "QUEUED" : "FAILED";

  const [updatedJob] = await prisma.$transaction([
    prisma.ifcProcessingJob.update({
      where: {
        id: jobId
      },
      data: {
        status: nextStatus,
        message: canRetry
          ? `경량화 처리 실패 후 재시도 대기 중입니다. (${job.attempts}/${job.maxAttempts})`
          : "경량 파생 파일 생성에 실패했습니다.",
        error: body.error ?? "IFC processing failed.",
        lockedAt: null,
        completedAt: canRetry ? null : new Date()
      }
    }),
    prisma.ifcModel.update({
      where: {
        id: job.modelId
      },
      data: {
        status: nextStatus
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
    }
  });
}
