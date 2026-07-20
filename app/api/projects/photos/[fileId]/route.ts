import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;

  if (!fileId) {
    return NextResponse.json(
      { error: "사진 파일 정보가 필요합니다." },
      { status: 400 }
    );
  }

  let object;

  try {
    object = await getObjectStorage("GOOGLE_DRIVE").readObject(fileId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Google Drive에서 사진을 불러오지 못했습니다."
      },
      { status: 404 }
    );
  }

  const stream = Readable.toWeb(object.body);

  return new Response(stream as ReadableStream, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": object.contentType ?? "application/octet-stream",
      ...(object.contentLength
        ? { "Content-Length": String(object.contentLength) }
        : {})
    }
  });
}
