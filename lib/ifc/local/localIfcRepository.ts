import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalIfcModel = {
  id: string;
  projectId?: string | null;
  modelVersion?: string | null;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  originalStorageProvider: string;
  originalStorageBucket?: string | null;
  originalStorageKey?: string | null;
  originalChecksum?: string | null;
  originalArchiveProvider?: string | null;
  originalArchiveBucket?: string | null;
  originalArchiveKey?: string | null;
  originalArchiveUrl?: string | null;
  originalArchivedAt?: Date | null;
  originalDeletedAt?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LocalIfcDerivative = {
  id: string;
  modelId: string;
  kind: string;
  format: string;
  lod?: string | null;
  storageProvider: string;
  storageBucket?: string | null;
  storageKey: string;
  fileName: string;
  fileSize: number;
  checksum?: string | null;
  status: string;
  manifest?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type LocalIfcProcessingJob = {
  id: string;
  modelId: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  message?: string | null;
  error?: string | null;
  lockedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LocalIfcDatabase = {
  models: LocalIfcModel[];
  derivatives: LocalIfcDerivative[];
  processingJobs: LocalIfcProcessingJob[];
};

const databasePath = path.join(process.cwd(), ".local", "ifc-db.json");

function reviveDatabase(database: LocalIfcDatabase): LocalIfcDatabase {
  return {
    models: database.models.map((model) => ({
      ...model,
      originalArchivedAt: model.originalArchivedAt
        ? new Date(model.originalArchivedAt)
        : null,
      originalDeletedAt: model.originalDeletedAt
        ? new Date(model.originalDeletedAt)
        : null,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt)
    })),
    derivatives: database.derivatives.map((derivative) => ({
      ...derivative,
      createdAt: new Date(derivative.createdAt),
      updatedAt: new Date(derivative.updatedAt)
    })),
    processingJobs: (database.processingJobs ?? []).map((job) => ({
      ...job,
      lockedAt: job.lockedAt ? new Date(job.lockedAt) : null,
      startedAt: job.startedAt ? new Date(job.startedAt) : null,
      completedAt: job.completedAt ? new Date(job.completedAt) : null,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt)
    }))
  };
}

async function readDatabase(): Promise<LocalIfcDatabase> {
  try {
    const data = await readFile(databasePath, "utf8");
    return reviveDatabase(JSON.parse(data) as LocalIfcDatabase);
  } catch {
    return {
      models: [],
      derivatives: [],
      processingJobs: []
    };
  }
}

async function writeDatabase(database: LocalIfcDatabase) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  await writeFile(databasePath, JSON.stringify(database, null, 2));
}

export async function createLocalIfcModel(
  model: Omit<LocalIfcModel, "createdAt" | "updatedAt">
) {
  const database = await readDatabase();
  const now = new Date();
  const localModel: LocalIfcModel = {
    ...model,
    createdAt: now,
    updatedAt: now
  };

  database.models.unshift(localModel);
  await writeDatabase(database);

  return localModel;
}

export async function listLocalIfcModels() {
  const database = await readDatabase();

  return database.models.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function getLocalIfcModel(id: string) {
  const database = await readDatabase();

  return database.models.find((model) => model.id === id) ?? null;
}

export async function updateLocalIfcModelStatus(id: string, status: string) {
  const database = await readDatabase();
  const model = database.models.find((item) => item.id === id);

  if (!model) {
    return null;
  }

  model.status = status;
  model.updatedAt = new Date();
  await writeDatabase(database);

  return model;
}

export async function updateLocalIfcModelVersion(
  id: string,
  modelVersion: string | null
) {
  const database = await readDatabase();
  const model = database.models.find((item) => item.id === id);

  if (!model) {
    return null;
  }

  model.modelVersion = modelVersion;
  model.updatedAt = new Date();
  await writeDatabase(database);

  return model;
}

export async function deleteLocalIfcModel(id: string) {
  const database = await readDatabase();
  database.models = database.models.filter((model) => model.id !== id);
  database.derivatives = database.derivatives.filter(
    (derivative) => derivative.modelId !== id
  );
  database.processingJobs = database.processingJobs.filter(
    (job) => job.modelId !== id
  );
  await writeDatabase(database);
}

export async function deleteLocalIfcModelsWithoutProject() {
  const database = await readDatabase();
  const orphanModelIds = new Set(
    database.models
      .filter((model) => !model.projectId)
      .map((model) => model.id)
  );

  if (orphanModelIds.size === 0) {
    return 0;
  }

  database.models = database.models.filter(
    (model) => !orphanModelIds.has(model.id)
  );
  database.derivatives = database.derivatives.filter(
    (derivative) => !orphanModelIds.has(derivative.modelId)
  );
  database.processingJobs = database.processingJobs.filter(
    (job) => !orphanModelIds.has(job.modelId)
  );
  await writeDatabase(database);

  return orphanModelIds.size;
}

export async function listLocalIfcDerivatives(modelId: string) {
  const database = await readDatabase();

  return database.derivatives
    .filter((derivative) => derivative.modelId === modelId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getLocalIfcDerivative(modelId: string, derivativeId: string) {
  const database = await readDatabase();

  return (
    database.derivatives.find(
      (derivative) =>
        derivative.modelId === modelId && derivative.id === derivativeId
    ) ?? null
  );
}

export async function upsertLocalIfcDerivative(
  derivative: Omit<LocalIfcDerivative, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  }
) {
  const database = await readDatabase();
  const existing = database.derivatives.find(
    (item) =>
      item.modelId === derivative.modelId &&
      item.kind === derivative.kind &&
      item.format === derivative.format &&
      item.lod === derivative.lod
  );
  const now = new Date();

  if (existing) {
    Object.assign(existing, derivative, {
      updatedAt: now
    });
    await writeDatabase(database);
    return existing;
  }

  const localDerivative: LocalIfcDerivative = {
    ...derivative,
    id: derivative.id ?? randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  database.derivatives.push(localDerivative);
  await writeDatabase(database);

  return localDerivative;
}

export async function countLocalIfcDerivatives(modelId: string) {
  const derivatives = await listLocalIfcDerivatives(modelId);

  return derivatives.length;
}

export async function createLocalIfcProcessingJob(
  job: Omit<LocalIfcProcessingJob, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  }
) {
  const database = await readDatabase();
  const now = new Date();
  const localJob: LocalIfcProcessingJob = {
    ...job,
    id: job.id ?? randomUUID(),
    createdAt: now,
    updatedAt: now
  };

  database.processingJobs.push(localJob);
  await writeDatabase(database);

  return localJob;
}

export async function updateLocalIfcProcessingJob(
  id: string,
  patch: Partial<
    Omit<LocalIfcProcessingJob, "id" | "modelId" | "createdAt" | "updatedAt">
  >
) {
  const database = await readDatabase();
  const job = database.processingJobs.find((item) => item.id === id);

  if (!job) {
    return null;
  }

  Object.assign(job, patch, {
    updatedAt: new Date()
  });
  await writeDatabase(database);

  return job;
}

export async function getLocalIfcProcessingJob(id: string) {
  const database = await readDatabase();

  return database.processingJobs.find((job) => job.id === id) ?? null;
}

export async function getLatestLocalIfcProcessingJob(modelId: string) {
  const database = await readDatabase();

  return (
    database.processingJobs
      .filter((job) => job.modelId === modelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}

export async function getActiveLocalIfcProcessingJob(modelId: string) {
  const database = await readDatabase();

  return (
    database.processingJobs
      .filter(
        (job) =>
          job.modelId === modelId &&
          (job.status === "QUEUED" || job.status === "PROCESSING")
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}

export async function listPendingLocalIfcProcessingJobs() {
  const database = await readDatabase();

  return database.processingJobs
    .filter((job) => job.status === "QUEUED" || job.status === "PROCESSING")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
