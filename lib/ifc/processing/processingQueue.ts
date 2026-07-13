import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { isDatabaseConfigured, prisma } from "@/lib/db/prisma";
import {
  createLocalIfcProcessingJob,
  getActiveLocalIfcProcessingJob,
  getLatestLocalIfcProcessingJob,
  getLocalIfcModel,
  getLocalIfcProcessingJob,
  listPendingLocalIfcProcessingJobs,
  updateLocalIfcModelStatus,
  updateLocalIfcProcessingJob,
  upsertLocalIfcDerivative
} from "@/lib/ifc/local/localIfcRepository";
import {
  createFragmentDerivative,
  storeFragmentDerivative
} from "@/lib/ifc/processing/createFragmentDerivative";
import { isPathInsideIfcUploadDir } from "@/lib/ifc/uploadConfig";
import { getObjectStorage } from "@/lib/storage/objectStorage";

export type IfcProcessingJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export type IfcProcessingJob = {
  id: string;
  modelId: string;
  type: string;
  status: IfcProcessingJobStatus;
  attempts: number;
  maxAttempts: number;
  message: string | null;
  error: string | null;
  lockedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredProcessingJob = {
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

type QueueState = {
  queuedJobIds: string[];
  runningJobIds: Set<string>;
  isRunning: boolean;
};

const PROCESSING_JOB_TYPE = "FRAG_DERIVATIVE";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_STALE_MINUTES = 15;

const globalForQueue = globalThis as typeof globalThis & {
  ifcProcessingQueue?: Partial<QueueState> & {
    queue?: string[];
  };
};

const existingQueue = globalForQueue.ifcProcessingQueue;
const queueState: QueueState = {
  queuedJobIds:
    existingQueue?.queuedJobIds ?? existingQueue?.queue?.slice() ?? [],
  runningJobIds: existingQueue?.runningJobIds ?? new Set<string>(),
  isRunning: existingQueue?.isRunning ?? false
};

globalForQueue.ifcProcessingQueue = queueState;

function getMaxProcessingAttempts() {
  const configuredAttempts = Number(process.env.IFC_PROCESSING_MAX_ATTEMPTS);

  return Number.isFinite(configuredAttempts) && configuredAttempts > 0
    ? Math.floor(configuredAttempts)
    : DEFAULT_MAX_ATTEMPTS;
}

function getProcessingStaleMs() {
  const configuredMinutes = Number(process.env.IFC_PROCESSING_STALE_MINUTES);
  const minutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0
      ? configuredMinutes
      : DEFAULT_STALE_MINUTES;

  return minutes * 60 * 1000;
}

function shouldRunInlineProcessing() {
  return process.env.VERCEL !== "1";
}

function compactData<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

function serializeJob(job: StoredProcessingJob): IfcProcessingJob {
  return {
    id: job.id,
    modelId: job.modelId,
    type: job.type,
    status: job.status as IfcProcessingJobStatus,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    message: job.message ?? null,
    error: job.error ?? null,
    lockedAt: job.lockedAt?.toISOString() ?? null,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

async function getStoredJob(jobId: string) {
  if (!isDatabaseConfigured() || !prisma) {
    return getLocalIfcProcessingJob(jobId);
  }

  return prisma.ifcProcessingJob.findUnique({
    where: {
      id: jobId
    }
  });
}

async function getActiveStoredJob(modelId: string) {
  if (!isDatabaseConfigured() || !prisma) {
    return getActiveLocalIfcProcessingJob(modelId);
  }

  return prisma.ifcProcessingJob.findFirst({
    where: {
      modelId,
      type: PROCESSING_JOB_TYPE,
      status: {
        in: ["QUEUED", "PROCESSING"]
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function getLatestStoredJob(modelId: string) {
  if (!isDatabaseConfigured() || !prisma) {
    return getLatestLocalIfcProcessingJob(modelId);
  }

  return prisma.ifcProcessingJob.findFirst({
    where: {
      modelId,
      type: PROCESSING_JOB_TYPE
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

async function createStoredJob(modelId: string) {
  const data = {
    modelId,
    type: PROCESSING_JOB_TYPE,
    status: "QUEUED",
    attempts: 0,
    maxAttempts: getMaxProcessingAttempts(),
    message: "경량화 작업 대기열에 추가되었습니다.",
    error: null,
    lockedAt: null,
    startedAt: null,
    completedAt: null
  };

  if (!isDatabaseConfigured() || !prisma) {
    return createLocalIfcProcessingJob({
      ...data,
      id: randomUUID()
    });
  }

  return prisma.ifcProcessingJob.create({
    data
  });
}

async function updateStoredJob(
  jobId: string,
  patch: Partial<
    Pick<
      StoredProcessingJob,
      | "status"
      | "attempts"
      | "message"
      | "error"
      | "lockedAt"
      | "startedAt"
      | "completedAt"
    >
  >
) {
  const data = compactData(patch);

  if (!isDatabaseConfigured() || !prisma) {
    return updateLocalIfcProcessingJob(jobId, data);
  }

  return prisma.ifcProcessingJob.update({
    where: {
      id: jobId
    },
    data
  });
}

async function updateModelStatus(modelId: string, status: IfcProcessingJobStatus) {
  if (!isDatabaseConfigured() || !prisma) {
    return updateLocalIfcModelStatus(modelId, status);
  }

  return prisma.ifcModel.update({
    where: {
      id: modelId
    },
    data: {
      status
    }
  });
}

async function listSchedulableJobs() {
  const staleBefore = new Date(Date.now() - getProcessingStaleMs());

  if (!isDatabaseConfigured() || !prisma) {
    const pendingJobs = await listPendingLocalIfcProcessingJobs();

    return pendingJobs.filter(
      (job) =>
        job.status === "QUEUED" ||
        !job.lockedAt ||
        job.lockedAt.getTime() < staleBefore.getTime()
    );
  }

  return prisma.ifcProcessingJob.findMany({
    where: {
      type: PROCESSING_JOB_TYPE,
      OR: [
        {
          status: "QUEUED"
        },
        {
          status: "PROCESSING",
          OR: [
            {
              lockedAt: null
            },
            {
              lockedAt: {
                lt: staleBefore
              }
            }
          ]
        }
      ]
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

function scheduleJobId(jobId: string) {
  if (
    queueState.runningJobIds.has(jobId) ||
    queueState.queuedJobIds.includes(jobId)
  ) {
    return;
  }

  queueState.queuedJobIds.push(jobId);
}

async function prepareIfcSourceFile({
  modelId,
  filePath,
  originalStorageProvider,
  originalStorageKey
}: {
  modelId: string;
  filePath: string;
  originalStorageProvider?: string | null;
  originalStorageKey?: string | null;
}) {
  if (!originalStorageProvider || originalStorageProvider === "LOCAL") {
    if (!isPathInsideIfcUploadDir(filePath)) {
      throw new Error("Stored IFC file path is invalid.");
    }

    return filePath;
  }

  const storageKey = originalStorageKey ?? filePath;

  if (!storageKey) {
    throw new Error("Stored IFC object key is missing.");
  }

  const tempDir = path.join(os.tmpdir(), "ifc-sources");
  const tempPath = path.join(tempDir, `${modelId}.ifc`);
  const object = await getObjectStorage(originalStorageProvider).readObject(storageKey);

  await mkdir(tempDir, { recursive: true });
  await pipeline(object.body, createWriteStream(tempPath));

  return tempPath;
}

async function processLocalModel(modelId: string) {
  const model = await getLocalIfcModel(modelId);

  if (!model) {
    throw new Error("IFC model not found.");
  }

  const filePath = await prepareIfcSourceFile({
    modelId: model.id,
    filePath: model.filePath,
    originalStorageProvider: model.originalStorageProvider,
    originalStorageKey: model.originalStorageKey
  });

  const derivativeData = await storeFragmentDerivative({
    modelId: model.id,
    filePath,
    originalFileName: model.originalFileName,
    storageProvider: "LOCAL"
  });

  await upsertLocalIfcDerivative(derivativeData);
  await updateLocalIfcModelStatus(modelId, "READY");
}

async function processDatabaseModel(modelId: string) {
  if (!prisma) {
    throw new Error("Prisma client is not configured.");
  }

  const model = await prisma.ifcModel.findUnique({
    where: {
      id: modelId
    }
  });

  if (!model) {
    throw new Error("IFC model not found.");
  }

  const filePath = await prepareIfcSourceFile({
    modelId: model.id,
    filePath: model.filePath,
    originalStorageProvider: model.originalStorageProvider,
    originalStorageKey: model.originalStorageKey
  });

  await createFragmentDerivative({
    modelId: model.id,
    filePath,
    originalFileName: model.originalFileName
  });

  await prisma.ifcModel.update({
    where: {
      id: modelId
    },
    data: {
      status: "READY"
    }
  });
}

async function runJob(jobId: string) {
  const storedJob = await getStoredJob(jobId);

  if (!storedJob || storedJob.status === "READY" || storedJob.status === "FAILED") {
    return;
  }

  queueState.runningJobIds.add(jobId);

  const startedAt = new Date();
  const attempts = storedJob.attempts + 1;

  await updateStoredJob(jobId, {
    status: "PROCESSING",
    attempts,
    message: "IFC를 Fragments 파생 파일로 변환하는 중입니다.",
    error: null,
    lockedAt: startedAt,
    startedAt: storedJob.startedAt ?? startedAt
  });
  await updateModelStatus(storedJob.modelId, "PROCESSING");

  try {
    if (!isDatabaseConfigured() || !prisma) {
      await processLocalModel(storedJob.modelId);
    } else {
      await processDatabaseModel(storedJob.modelId);
    }

    await updateStoredJob(jobId, {
      status: "READY",
      message: "경량 파생 파일 생성이 완료되었습니다.",
      error: null,
      lockedAt: null,
      completedAt: new Date()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "IFC processing failed.";

    if (attempts < storedJob.maxAttempts) {
      await updateStoredJob(jobId, {
        status: "QUEUED",
        message: `경량화 처리 실패 후 재시도 대기 중입니다. (${attempts}/${storedJob.maxAttempts})`,
        error: message,
        lockedAt: null
      });
      await updateModelStatus(storedJob.modelId, "QUEUED").catch(
        () => undefined
      );
      scheduleJobId(jobId);
    } else {
      await updateStoredJob(jobId, {
        status: "FAILED",
        message: "경량 파생 파일 생성에 실패했습니다.",
        error: message,
        lockedAt: null,
        completedAt: new Date()
      });
      await updateModelStatus(storedJob.modelId, "FAILED").catch(
        () => undefined
      );
    }
  } finally {
    queueState.runningJobIds.delete(jobId);
  }
}

async function runQueue() {
  if (queueState.isRunning) {
    return;
  }

  queueState.isRunning = true;

  try {
    while (queueState.queuedJobIds.length > 0) {
      const jobId = queueState.queuedJobIds.shift();

      if (!jobId) {
        continue;
      }

      await runJob(jobId);
    }
  } finally {
    queueState.isRunning = false;
  }
}

export async function ensureIfcProcessingQueueStarted() {
  const jobs = await listSchedulableJobs();

  for (const job of jobs) {
    if (job.status === "PROCESSING") {
      await updateStoredJob(job.id, {
        status: "QUEUED",
        message: "중단된 경량화 작업을 다시 대기열에 추가했습니다.",
        lockedAt: null
      });
      await updateModelStatus(job.modelId, "QUEUED").catch(() => undefined);
    }

    scheduleJobId(job.id);
  }

  if (shouldRunInlineProcessing()) {
    setTimeout(() => {
      void runQueue();
    }, 0);
  }
}

export async function drainIfcProcessingQueue() {
  await runQueue();
}

export async function enqueueIfcProcessingJob(modelId: string) {
  const activeJob = await getActiveStoredJob(modelId);

  if (activeJob) {
    scheduleJobId(activeJob.id);
    void ensureIfcProcessingQueueStarted();

    return serializeJob(activeJob);
  }

  const job = await createStoredJob(modelId);
  scheduleJobId(job.id);
  await updateModelStatus(modelId, "QUEUED");

  if (shouldRunInlineProcessing()) {
    setTimeout(() => {
      void runQueue();
    }, 0);
  }

  return serializeJob(job);
}

export async function getIfcProcessingJobForModel(modelId: string) {
  const job = await getLatestStoredJob(modelId);

  return job ? serializeJob(job) : null;
}
