import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import { getLocalIfcModel } from "@/lib/ifc/local/localIfcRepository";
import { isPathInsideIfcUploadDir } from "@/lib/ifc/uploadConfig";
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

    if (!model) {
      return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
    }

    if (model.originalDeletedAt) {
      return NextResponse.json(
        {
          error: "Original IFC has been archived and removed from primary storage.",
          archiveProvider: model.originalArchiveProvider,
          archiveKey: model.originalArchiveKey,
          archiveUrl: model.originalArchiveUrl
        },
        { status: 410 }
      );
    }

    if (model.originalStorageProvider !== "LOCAL") {
      const object = await getObjectStorage(model.originalStorageProvider).readObject(
        model.originalStorageKey ?? model.filePath
      );
      const stream = Readable.toWeb(object.body);

      return new Response(stream as ReadableStream, {
        headers: {
          "Content-Type": object.contentType ?? "application/octet-stream",
          ...(object.contentLength
            ? { "Content-Length": String(object.contentLength) }
            : {}),
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            model.originalFileName
          )}"`
        }
      });
    }

    if (!isPathInsideIfcUploadDir(model.filePath)) {
      return NextResponse.json(
        { error: "Stored IFC file path is invalid." },
        { status: 409 }
      );
    }

    const fileStat = await stat(model.filePath);
    const stream = Readable.toWeb(createReadStream(model.filePath));

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          model.originalFileName
        )}"`
      }
    });
  }

  const { id } = await context.params;
  const model = await prisma.ifcModel.findUnique({
    where: {
      id
    },
    select: {
      filePath: true,
      originalFileName: true,
      originalStorageProvider: true,
      originalStorageKey: true,
      originalArchiveProvider: true,
      originalArchiveKey: true,
      originalArchiveUrl: true,
      originalDeletedAt: true
    }
  });

  if (!model) {
    return NextResponse.json({ error: "IFC model not found." }, { status: 404 });
  }

  if (model.originalDeletedAt) {
    return NextResponse.json(
      {
        error: "Original IFC has been archived and removed from primary storage.",
        archiveProvider: model.originalArchiveProvider,
        archiveKey: model.originalArchiveKey,
        archiveUrl: model.originalArchiveUrl
      },
      { status: 410 }
    );
  }

  if (model.originalStorageProvider !== "LOCAL") {
    const object = await getObjectStorage(model.originalStorageProvider).readObject(
      model.originalStorageKey ?? model.filePath
    );
    const stream = Readable.toWeb(object.body);

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": object.contentType ?? "application/octet-stream",
        ...(object.contentLength
          ? { "Content-Length": String(object.contentLength) }
          : {}),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          model.originalFileName
        )}"`
      }
    });
  }

  if (!isPathInsideIfcUploadDir(model.filePath)) {
    return NextResponse.json(
      { error: "Stored IFC file path is invalid." },
      { status: 409 }
    );
  }

  let fileStat;

  try {
    fileStat = await stat(model.filePath);
  } catch {
    return NextResponse.json(
      { error: "Stored IFC file is missing." },
      { status: 404 }
    );
  }

  const stream = Readable.toWeb(createReadStream(model.filePath));

  return new Response(stream as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(fileStat.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        model.originalFileName
      )}"`
    }
  });
}
