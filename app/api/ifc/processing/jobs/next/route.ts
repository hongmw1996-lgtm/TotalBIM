import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

export const runtime = "nodejs";

const DEFAULT_STALE_MINUTES = 15;

function getProcessingStaleDate() {
  const configuredMinutes = Number(process.env.IFC_PROCESSING_STALE_MINUTES);
  const minutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_STALE_MINUTES;

  return new Date(Date.now() - minutes * 60 * 1000);
}

export async function POST(request: Request) {
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

  const staleBefore = getProcessingStaleDate();
  const job = await prisma.ifcProcessingJob.findFirst({
    where: {
      type: "FRAG_DERIVATIVE",
      OR: [
        {
          status: "QUEUED"
        },
        {
          status: "PROCESSING",
          OR: [
            {
              lockedAt: null
            },
            {
              lockedAt: {
                lt: staleBefore
              }
            }
          ]
        }
      ]
    },
    orderBy: {
      createdAt: "asc"
    },
    include: {
      model: {
        include: {
          _count: {
            select: {
              objects: true,
              derivatives: true
            }
          }
        }
      }
    }
  });

  if (!job) {
    return new Response(null, { status: 204 });
  }

  const now = new Date();
  const claimedJob = await prisma.ifcProcessingJob.update({
    where: {
      id: job.id
    },
    data: {
      status: "PROCESSING",
      attempts: {
        increment: 1
      },
      message: "Worker가 IFC 경량화 작업을 처리하는 중입니다.",
      error: null,
      lockedAt: now,
      startedAt: job.startedAt ?? now
    }
  });
  const model = await prisma.ifcModel.update({
    where: {
      id: job.modelId
    },
    data: {
      status: "PROCESSING"
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

  return NextResponse.json({
    job: {
      ...claimedJob,
      createdAt: claimedJob.createdAt.toISOString(),
      updatedAt: claimedJob.updatedAt.toISOString(),
      lockedAt: claimedJob.lockedAt?.toISOString() ?? null,
      startedAt: claimedJob.startedAt?.toISOString() ?? null,
      completedAt: claimedJob.completedAt?.toISOString() ?? null
    },
    model: serializeIfcModel(model)
  });
}
