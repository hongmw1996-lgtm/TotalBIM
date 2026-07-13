import { after, NextResponse } from "next/server";
import { ApsConfigurationError } from "@/lib/aps/apsClient";
import { startApsConversionForModel } from "@/lib/aps/ifcModelApsConversion";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  countLocalIfcDerivatives,
  getLocalIfcModel
} from "@/lib/ifc/local/localIfcRepository";
import { getBimFileExtension, isIfcFileName } from "@/lib/ifc/uploadConfig";
import {
  drainIfcProcessingQueue,
  enqueueIfcProcessingJob,
  ensureIfcProcessingQueueStarted,
  getIfcProcessingJobForModel
} from "@/lib/ifc/processing/processingQueue";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getSerializedModel(id: string) {
  if (!isDatabaseConfigured() || !prisma) {
    const model = await getLocalIfcModel(id);

    if (!model) {
      return null;
    }

    return serializeIfcModel({
      ...model,
      _count: {
        objects: 0,
        derivatives: await countLocalIfcDerivatives(model.id)
      }
    });
  }

  const model = await prisma.ifcModel.findUnique({
    where: {
      id
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

  return model ? serializeIfcModel(model) : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await ensureIfcProcessingQueueStarted();
  const model = await getSerializedModel(id);

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  return NextResponse.json({
    model,
    job: await getIfcProcessingJobForModel(id)
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const model = await getSerializedModel(id);

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  if (!isIfcFileName(model.originalFileName)) {
    const extension = getBimFileExtension(model.originalFileName);

    if (extension !== ".nwc" && extension !== ".nwd") {
      return NextResponse.json(
        { error: "지원하지 않는 3D 파일 형식입니다." },
        { status: 400 }
      );
    }

    try {
      const result = await startApsConversionForModel(id);

      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      if (error instanceof ApsConfigurationError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "NWC/NWD APS 변환 요청에 실패했습니다."
        },
        { status: 500 }
      );
    }
  }

  const job = await enqueueIfcProcessingJob(id);
  const updatedModel = (await getSerializedModel(id)) ?? model;

  after(async () => {
    await drainIfcProcessingQueue();
  });

  return NextResponse.json(
    {
      model: updatedModel,
      job
    },
    { status: 202 }
  );
}
