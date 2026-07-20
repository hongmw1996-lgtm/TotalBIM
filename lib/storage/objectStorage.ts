import { createGcsObjectStorage } from "@/lib/storage/gcsObjectStorage";
import { createGoogleDriveObjectStorage } from "@/lib/storage/googleDriveObjectStorage";
import { createLocalObjectStorage } from "@/lib/storage/localObjectStorage";
import { createS3ObjectStorage } from "@/lib/storage/s3ObjectStorage";
import { ObjectStorage, StorageProvider } from "@/lib/storage/types";
import { createVercelBlobObjectStorage } from "@/lib/storage/vercelBlobObjectStorage";

function normalizeStorageProvider(provider?: string | null) {
  const normalizedProvider = provider?.toUpperCase();

  if (
    normalizedProvider === "LOCAL" ||
    normalizedProvider === "BLOB" ||
    normalizedProvider === "S3" ||
    normalizedProvider === "R2" ||
    normalizedProvider === "GCS" ||
    normalizedProvider === "GOOGLE_DRIVE"
  ) {
    return normalizedProvider;
  }

  return null;
}

function getStorageProvider(providerOverride?: string | null): StorageProvider {
  const explicitProvider = normalizeStorageProvider(providerOverride);

  if (explicitProvider) {
    return explicitProvider;
  }

  const provider = normalizeStorageProvider(process.env.OBJECT_STORAGE_PROVIDER);

  if (provider === "BLOB" || (!provider && process.env.BLOB_STORE_ID)) {
    return "BLOB";
  }

  if (provider === "S3" || provider === "R2" || provider === "GCS") {
    return provider;
  }

  if (provider === "GOOGLE_DRIVE") {
    return provider;
  }

  return "LOCAL";
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for object storage.`);
  }

  return value;
}

export function createObjectStorage(providerOverride?: string | null): ObjectStorage {
  const provider = getStorageProvider(providerOverride);

  if (provider === "LOCAL") {
    return createLocalObjectStorage();
  }

  if (provider === "BLOB") {
    return createVercelBlobObjectStorage();
  }

  if (provider === "S3" || provider === "R2") {
    return createS3ObjectStorage({
      provider,
      bucket: requireEnv("OBJECT_STORAGE_BUCKET"),
      region: process.env.OBJECT_STORAGE_REGION ?? "auto",
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
      accessKeyId: requireEnv("OBJECT_STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
      forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true"
    });
  }

  if (provider === "GOOGLE_DRIVE") {
    return createGoogleDriveObjectStorage();
  }

  return createGcsObjectStorage({
    bucket: requireEnv("OBJECT_STORAGE_BUCKET")
  });
}

const cachedObjectStorage = new Map<StorageProvider, ObjectStorage>();

export function getObjectStorage(providerOverride?: string | null) {
  const provider = getStorageProvider(providerOverride);
  const cachedStorage = cachedObjectStorage.get(provider);

  if (cachedStorage) {
    return cachedStorage;
  }

  const storage = createObjectStorage(provider);
  cachedObjectStorage.set(provider, storage);

  return storage;
}
