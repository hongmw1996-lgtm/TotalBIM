import type { Readable } from "node:stream";

export type StorageProvider = "LOCAL" | "S3" | "R2" | "GCS" | "BLOB";

export type PutObjectInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
};

export type StoredObject = {
  provider: StorageProvider;
  bucket?: string;
  key: string;
  size: number;
};

export type ReadObjectResult = {
  body: Readable;
  contentType?: string;
  contentLength?: number;
};

export type ObjectStorage = {
  provider: StorageProvider;
  bucket?: string;
  putObject: (input: PutObjectInput) => Promise<StoredObject>;
  readObject: (key: string) => Promise<ReadObjectResult>;
  deleteObject: (key: string) => Promise<void>;
};
