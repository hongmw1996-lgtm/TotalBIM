import { NextResponse } from "next/server";
import { refreshPendingApsConversions } from "@/lib/aps/ifcModelApsConversion";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  countLocalIfcDerivatives,
  deleteLocalIfcModelsWithoutProject,
  listLocalIfcModels
} from "@/lib/ifc/local/localIfcRepository";
import { ensureIfcProcessingQueueStarted } from "@/lib/ifc/processing/processingQueue";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

export const runtime = "nodejs";

export async function GET() {
  await ensureIfcProcessingQueueStarted();
  await refreshPendingApsConversions();

  if (!isDatabaseConfigured() || !prisma) {
    await deleteLocalIfcModelsWithoutProject();
    const models = (await listLocalIfcModels()).filter((model) => model.projectId);
    const serializedModels = await Promise.all(
      models.map(async (model) =>
        serializeIfcModel({
          ...model,
          _count: {
            objects: 0,
            derivatives: await countLocalIfcDerivatives(model.id)
          }
        })
      )
    );

    return NextResponse.json({
      models: serializedModels
    });
  }

  const models = await prisma.ifcModel.findMany({
    where: {
      projectId: {
        not: ""
      }
    },
    orderBy: {
      createdAt: "desc"
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
    models: models.map(serializeIfcModel)
  });
}
