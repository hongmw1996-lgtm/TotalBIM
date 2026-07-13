import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "@thatopen",
    "fragments",
    "dist",
    "Worker",
    "worker.mjs"
  );
  const worker = await readFile(workerPath, "utf8");

  return new NextResponse(worker, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "text/javascript; charset=utf-8"
    }
  });
}
