import { Storage } from "@google-cloud/storage";
import { ObjectStorage, PutObjectInput } from "@/lib/storage/types";

type GcsStorageOptions = {
  bucket: string;
};

export function createGcsObjectStorage(options: GcsStorageOptions): ObjectStorage {
  const storage = new Storage();
  const bucket = storage.bucket(options.bucket);

  return {
    provider: "GCS",
    bucket: options.bucket,
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      const file = bucket.file(input.key);

      await file.save(body, {
        contentType: input.contentType,
        metadata: {
          metadata: input.metadata
        },
        resumable: body.byteLength > 5 * 1024 * 1024
      });

      return {
        provider: "GCS",
        bucket: options.bucket,
        key: input.key,
        size: body.byteLength
      };
    },
    async readObject(key: string) {
      const file = bucket.file(key);
      const [metadata] = await file.getMetadata();

      return {
        body: file.createReadStream(),
        contentType: metadata.contentType,
        contentLength:
          typeof metadata.size === "number" ? metadata.size : Number(metadata.size)
      };
    },
    async deleteObject(key: string) {
      await bucket.file(key).delete({ ignoreNotFound: true });
    }
  };
}
