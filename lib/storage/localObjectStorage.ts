import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ObjectStorage, PutObjectInput, ReadObjectResult } from "@/lib/storage/types";

const DEFAULT_LOCAL_OBJECT_ROOT = "object-storage";

function getLocalObjectRoot() {
  return process.env.LOCAL_OBJECT_STORAGE_DIR ?? DEFAULT_LOCAL_OBJECT_ROOT;
}

function resolveObjectPath(key: string) {
  const root = path.normalize(getLocalObjectRoot());
  const objectPath = path.normalize(path.join(root, key));
  const relativePath = path.relative(root, objectPath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid object storage key.");
  }

  return objectPath;
}

export function createLocalObjectStorage(): ObjectStorage {
  return {
    provider: "LOCAL",
    async putObject(input: PutObjectInput) {
      const objectPath = resolveObjectPath(input.key);
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);

      await mkdir(path.dirname(objectPath), { recursive: true });
      await writeFile(objectPath, body);

      return {
        provider: "LOCAL",
        key: input.key,
        size: body.byteLength
      };
    },
    async readObject(key: string): Promise<ReadObjectResult> {
      const objectPath = resolveObjectPath(key);
      const fileStat = await stat(objectPath);

      return {
        body: createReadStream(objectPath),
        contentLength: fileStat.size
      };
    },
    async deleteObject(key: string) {
      await unlink(resolveObjectPath(key)).catch(() => undefined);
    }
  };
}
