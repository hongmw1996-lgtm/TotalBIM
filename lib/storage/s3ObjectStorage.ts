import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { ObjectStorage, PutObjectInput, StorageProvider } from "@/lib/storage/types";

type S3StorageOptions = {
  provider: Extract<StorageProvider, "S3" | "R2">;
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export function createS3ObjectStorage(options: S3StorageOptions): ObjectStorage {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey
    }
  });

  return {
    provider: options.provider,
    bucket: options.bucket,
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);

      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: input.key,
          Body: body,
          ContentType: input.contentType,
          Metadata: input.metadata
        })
      );

      return {
        provider: options.provider,
        bucket: options.bucket,
        key: input.key,
        size: body.byteLength
      };
    },
    async readObject(key: string) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: options.bucket,
          Key: key
        })
      );

      if (!(response.Body instanceof Readable)) {
        throw new Error("Object body is not a readable stream.");
      }

      return {
        body: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength
      };
    },
    async deleteObject(key: string) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: options.bucket,
          Key: key
        })
      );
    }
  };
}
