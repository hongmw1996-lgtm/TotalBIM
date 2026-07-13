import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { del, get, put } from "@vercel/blob";
import { ObjectStorage, PutObjectInput, ReadObjectResult } from "@/lib/storage/types";

function getBlobTokenOption() {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? {
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    : {};
}

function normalizeBlobKey(key: string) {
  try {
    const url = new URL(key);

    if (url.hostname.endsWith(".blob.vercel-storage.com")) {
      return url.pathname.replace(/^\/+/, "");
    }
  } catch {
    return key;
  }

  return key;
}

export function createVercelBlobObjectStorage(): ObjectStorage {
  return {
    provider: "BLOB",
    bucket: process.env.BLOB_STORE_ID,
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);

      const blob = await put(input.key, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: input.contentType,
        ...getBlobTokenOption()
      });

      return {
        provider: "BLOB",
        bucket: process.env.BLOB_STORE_ID,
        key: blob.url,
        size: body.byteLength
      };
    },
    async readObject(key: string): Promise<ReadObjectResult> {
      const blob = await get(normalizeBlobKey(key), {
        access: "private",
        useCache: false,
        ...getBlobTokenOption()
      });

      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        throw new Error("Blob object could not be read.");
      }

      return {
        body: Readable.fromWeb(blob.stream as unknown as NodeReadableStream),
        contentType: blob.blob.contentType ?? undefined,
        contentLength: blob.blob.size
      };
    },
    async deleteObject(key: string) {
      await del(normalizeBlobKey(key), getBlobTokenOption());
    }
  };
}
