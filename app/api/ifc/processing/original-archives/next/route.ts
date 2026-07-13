import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { assertWorkerAuthorized } from "@/lib/ifc/processing/workerAuth";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";

export const runtime = "nodejs";

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

  const model = await prisma.ifcModel.findFirst({
    where: {
      status: "READY",
      originalStorageProvider: "BLOB",
      originalStorageKey: {
        not: null
      },
      originalArchiveProvider: null,
      originalDeletedAt: null,
      derivatives: {
        some: {
          kind: "GEOMETRY",
          format: "FRAG",
          status: "READY"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
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

  if (!model) {
    return new Response(null, { status: 204 });
  }

  return NextResponse.json({
    model: serializeIfcModel(model)
  });
}
