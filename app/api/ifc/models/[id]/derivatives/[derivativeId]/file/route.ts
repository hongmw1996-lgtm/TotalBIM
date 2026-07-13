import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { getLocalIfcDerivative } from "@/lib/ifc/local/localIfcRepository";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
    derivativeId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured() || !prisma) {
    const { id, derivativeId } = await context.params;
    const derivative = await getLocalIfcDerivative(id, derivativeId);

    if (!derivative) {
      return NextResponse.json(
        { error: "IFC derivative not found." },
        { status: 404 }
      );
    }

    const object = await getObjectStorage(derivative.storageProvider).readObject(
      derivative.storageKey
    );
    const stream = Readable.toWeb(object.body);

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": object.contentType ?? "application/octet-stream",
        ...(object.contentLength
          ? { "Content-Length": String(object.contentLength) }
          : {}),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          derivative.fileName
        )}"`
      }
    });
  }

  const { id, derivativeId } = await context.params;
  const derivative = await prisma.ifcModelDerivative.findFirst({
    where: {
      id: derivativeId,
      modelId: id
    }
  });

  if (!derivative) {
    return NextResponse.json(
      { error: "IFC derivative not found." },
      { status: 404 }
    );
  }

  if (derivative.status !== "READY") {
    return NextResponse.json(
      { error: "IFC derivative is not ready." },
      { status: 409 }
    );
  }

  const object = await getObjectStorage(derivative.storageProvider).readObject(
    derivative.storageKey
  );
  const stream = Readable.toWeb(object.body);

  return new Response(stream as ReadableStream, {
    headers: {
      "Content-Type": object.contentType ?? "application/octet-stream",
      ...(object.contentLength
        ? { "Content-Length": String(object.contentLength) }
        : {}),
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        derivative.fileName
      )}"`
    }
  });
}
