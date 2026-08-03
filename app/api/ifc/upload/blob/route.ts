import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  getMaxUploadBytes,
  isSupportedBimFileName,
  sanitizeIfcFileName
} from "@/lib/ifc/uploadConfig";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const originalFileName = sanitizeIfcFileName(pathname);

        if (!isSupportedBimFileName(originalFileName)) {
          throw new Error("Only .ifc, .nwc, and .nwd files can be uploaded.");
        }

        return {
          maximumSizeInBytes: getMaxUploadBytes(),
          tokenPayload: JSON.stringify({
            originalFileName
          })
        };
      },
      onUploadCompleted: async () => undefined
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Blob upload token failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
