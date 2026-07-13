import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  deleteLocalIfcModel,
  getLocalIfcModel,
  listLocalIfcDerivatives,
  updateLocalIfcModelVersion
} from "@/lib/ifc/local/localIfcRepository";
import { serializeIfcDerivative } from "@/lib/ifc/serializeIfcDerivative";
import { serializeIfcModel } from "@/lib/ifc/serializeIfcModel";
import { getObjectStorage } from "@/lib/storage/objectStorage";

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

    if (!model?.projectId) {
      return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
    }

    const derivatives = await listLocalIfcDerivatives(id);

    return NextResponse.json({
      model: serializeIfcModel({
        ...model,
        _count: {
          objects: 0,
          derivatives: derivatives.length
        }
      }),
      derivatives: derivatives.map(serializeIfcDerivative),
      objects: []
    });
  }

  const { id } = await context.params;
  const model = await prisma.ifcModel.findFirst({
    where: {
      id,
      projectId: {
        not: ""
      }
    },
    include: {
      _count: {
        select: {
          objects: true,
          derivatives: true
        }
      },
      derivatives: {
        orderBy: {
          createdAt: "asc"
        }
      },
      objects: {
        take: 50,
        orderBy: {
          createdAt: "asc"
        },
        select: {
          id: true,
          expressId: true,
          globalId: true,
          ifcType: true,
          name: true,
          objectType: true,
          storeyName: true,
          category: true,
          properties: true,
          createdAt: true
        }
      }
    }
  });

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  return NextResponse.json({
    model: serializeIfcModel(model),
    derivatives: model.derivatives.map(serializeIfcDerivative),
    objects: model.objects.map((object) => ({
      ...object,
      createdAt: object.createdAt.toISOString()
    }))
  });
}

async function deleteStoredObject(key?: string | null, provider?: string | null) {
  if (!key) {
    return null;
  }

  try {
    await getObjectStorage(provider).deleteObject(key);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Stored object deletion failed.";
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isDatabaseConfigured() || !prisma) {
    const model = await getLocalIfcModel(id);

    if (!model) {
      return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
    }

    const derivatives = await listLocalIfcDerivatives(id);
    const cleanupErrors = (
      await Promise.all(
        derivatives.map((derivative) =>
          deleteStoredObject(derivative.storageKey, derivative.storageProvider)
        )
      )
    ).filter(Boolean);

    if (model.originalStorageProvider !== "LOCAL" && !model.originalDeletedAt) {
      const error = await deleteStoredObject(
        model.originalStorageKey,
        model.originalStorageProvider
      );

      if (error) {
        cleanupErrors.push(error);
      }
    }

    await deleteLocalIfcModel(id);

    return NextResponse.json({
      ok: true,
      cleanupErrors
    });
  }

  const model = await prisma.ifcModel.findUnique({
    where: {
      id
    },
    include: {
      derivatives: true
    }
  });

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  const cleanupErrors = (
    await Promise.all(
      model.derivatives.map((derivative) =>
        deleteStoredObject(derivative.storageKey, derivative.storageProvider)
      )
    )
  ).filter(Boolean);

  if (model.originalStorageProvider !== "LOCAL" && !model.originalDeletedAt) {
    const error = await deleteStoredObject(
      model.originalStorageKey,
      model.originalStorageProvider
    );

    if (error) {
      cleanupErrors.push(error);
    }
  }

  await prisma.ifcModel.delete({
    where: {
      id
    }
  });

  return NextResponse.json({
    ok: true,
    cleanupErrors
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    modelVersion?: string | null;
  } | null;
  const modelVersion =
    typeof body?.modelVersion === "string" ? body.modelVersion.trim() : "";
  const normalizedModelVersion = modelVersion || null;

  if (!isDatabaseConfigured() || !prisma) {
    const model = await updateLocalIfcModelVersion(id, normalizedModelVersion);

    if (!model) {
      return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
    }

    const derivatives = await listLocalIfcDerivatives(id);

    return NextResponse.json({
      model: serializeIfcModel({
        ...model,
        _count: {
          objects: 0,
          derivatives: derivatives.length
        }
      })
    });
  }

  const existingModel = await prisma.ifcModel.findUnique({
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

  if (!existingModel) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  const model = await prisma.ifcModel.update({
    where: {
      id
    },
    data: {
      modelVersion: normalizedModelVersion
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
    model: serializeIfcModel(model)
  });
}
