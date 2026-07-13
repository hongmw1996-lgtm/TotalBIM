import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  getLocalIfcModel,
  listLocalIfcDerivatives
} from "@/lib/ifc/local/localIfcRepository";
import { serializeIfcDerivative } from "@/lib/ifc/serializeIfcDerivative";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured() || !prisma) {
    const { id } = await context.params;
    const model = await getLocalIfcModel(id);

    if (!model) {
      return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
    }

    const derivatives = await listLocalIfcDerivatives(id);

    return NextResponse.json({
      derivatives: derivatives.map(serializeIfcDerivative)
    });
  }

  const { id } = await context.params;
  const model = await prisma.ifcModel.findUnique({
    where: {
      id
    },
    select: {
      id: true
    }
  });

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  const derivatives = await prisma.ifcModelDerivative.findMany({
    where: {
      modelId: id
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return NextResponse.json({
    derivatives: derivatives.map(serializeIfcDerivative)
  });
}
