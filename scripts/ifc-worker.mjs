import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, readSync } from "node:fs";
import { appendFile, mkdir, open, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { IfcImporter } from "@thatopen/fragments";
import { put } from "@vercel/blob";
import { google } from "googleapis";

const READ_CHUNK_SIZE = 1024 * 1024;
const POLL_INTERVAL_MS = Number(process.env.IFC_WORKER_POLL_INTERVAL_MS ?? 5000);

function getApiBase() {
  return (
    process.env.IFC_WORKER_API_BASE ?? "https://ifc-upload-bim-viewer.vercel.app"
  ).replace(/\/$/, "");
}

function getWorkerToken() {
  return process.env.IFC_WORKER_TOKEN;
}

function shouldArchiveOriginalToGoogleDrive() {
  return (
    process.env.ORIGINAL_STORAGE_POLICY === "archive-to-drive-delete-blob" ||
    process.env.IFC_ARCHIVE_ORIGINALS_TO_DRIVE === "true"
  );
}

function getGoogleDriveArchiveConfig() {
  if (!shouldArchiveOriginalToGoogleDrive()) {
    return null;
  }

  const config = {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    folderId:
      process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID ??
      process.env.GOOGLE_DRIVE_FOLDER_ID
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Google Drive archive is enabled but missing config: ${missing.join(", ")}`
    );
  }

  return config;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function log(message, data) {
  const line = `${new Date().toISOString()} ${message}${
    data === undefined ? "" : ` ${JSON.stringify(data)}`
  }\n`;
  const logPath = path.join(getProjectRoot(), ".local", "ifc-worker.log");

  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, line);
  process.stdout.write(line);
}

function getWebIfcWasmPath() {
  return `${path.join(getProjectRoot(), "node_modules", "web-ifc")}${path.sep}`;
}

async function apiFetch(pathname, init = {}) {
  const workerToken = getWorkerToken();

  if (!workerToken) {
    throw new Error("IFC_WORKER_TOKEN is required.");
  }

  const response = await fetch(`${getApiBase()}${pathname}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${workerToken}`
    }
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `API request failed: ${response.status}`);
  }

  return payload;
}

async function claimJob() {
  return apiFetch("/api/ifc/processing/jobs/next", {
    method: "POST"
  });
}

async function claimOriginalArchiveCandidate() {
  if (!shouldArchiveOriginalToGoogleDrive()) {
    return null;
  }

  return apiFetch("/api/ifc/processing/original-archives/next", {
    method: "POST"
  });
}

async function downloadModel(model, jobId) {
  await log("Downloading IFC source", {
    modelId: model.id,
    fileUrl: model.fileUrl
  });

  const response = await fetch(`${getApiBase()}${model.fileUrl}`);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download IFC source: ${response.status}`);
  }

  const tempDir = path.join(os.tmpdir(), "ifc-worker", jobId);
  const filePath = path.join(tempDir, model.fileName || `${model.id}.ifc`);

  await mkdir(tempDir, { recursive: true });
  await pipeline(response.body, createWriteStream(filePath));
  await log("Downloaded IFC source", {
    modelId: model.id,
    filePath
  });

  return {
    tempDir,
    filePath
  };
}

async function convertIfcToFragments({ modelId, filePath, originalFileName }) {
  await log("Starting IFC conversion", {
    modelId,
    filePath
  });

  const fileStat = await stat(filePath);
  const handle = await open(filePath, "r");
  const importer = new IfcImporter();

  importer.wasm = {
    path: getWebIfcWasmPath(),
    absolute: true
  };
  importer.includeUniqueAttributes = false;
  importer.includeRelationNames = false;
  importer.replaceStoreyElevation = true;
  importer.replaceSiteElevation = true;
  importer.distanceThreshold = 100000;

  const progressEvents = [];

  try {
    const output = await importer.process({
      id: modelId,
      readFromCallback: true,
      raw: false,
      readCallback: (offset) => {
        const buffer = new Uint8Array(READ_CHUNK_SIZE);
        const bytesRead = readSync(handle.fd, buffer, 0, READ_CHUNK_SIZE, offset);

        return buffer.slice(0, bytesRead);
      },
      progressCallback: (progress, data) => {
        progressEvents.push({
          progress,
          phase:
            typeof data === "object" && data && "process" in data
              ? String(data.process)
              : undefined
        });

        if (progressEvents.length % 10 === 0) {
          void log("IFC conversion progress", {
            modelId,
            progress,
            phase:
              typeof data === "object" && data && "process" in data
                ? String(data.process)
                : undefined
          });
        }
      }
    });

    const outputBuffer = Buffer.from(output);
    const checksum = createHash("sha256").update(outputBuffer).digest("hex");
    const fileName = `${path.parse(originalFileName).name}.frag`;

    await log("Finished IFC conversion", {
      modelId,
      outputBytes: outputBuffer.byteLength
    });

    return {
      fileName,
      outputBuffer,
      checksum,
      manifest: {
        sourceFileSize: fileStat.size,
        outputFileSize: outputBuffer.byteLength,
        compressionRatio:
          fileStat.size > 0 ? outputBuffer.byteLength / fileStat.size : null,
        progressEvents: progressEvents.slice(-20)
      }
    };
  } finally {
    await handle.close();
  }
}

async function uploadDerivative({ modelId, fileName, outputBuffer }) {
  const storageKey = `ifc-models/${modelId}/derivatives/fragments/${fileName}`;

  await log("Uploading fragment derivative", {
    modelId,
    storageKey,
    bytes: outputBuffer.byteLength
  });

  return put(storageKey, outputBuffer, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/octet-stream"
  });
}

async function completeJob(jobId, derivative) {
  return apiFetch(`/api/ifc/processing/jobs/${jobId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(derivative)
  });
}

async function markOriginalArchived(jobId, archive) {
  return apiFetch(`/api/ifc/processing/jobs/${jobId}/archive-original`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(archive)
  });
}

async function markModelOriginalArchived(modelId, archive) {
  return apiFetch(`/api/ifc/processing/original-archives/${modelId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(archive)
  });
}

async function failJob(jobId, error) {
  return apiFetch(`/api/ifc/processing/jobs/${jobId}/fail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: error instanceof Error ? error.message : String(error)
    })
  });
}

async function uploadOriginalToGoogleDrive({ modelId, filePath, originalFileName }) {
  const config = getGoogleDriveArchiveConfig();

  if (!config) {
    return null;
  }

  await log("Uploading original IFC to Google Drive", {
    modelId,
    folderId: config.folderId,
    originalFileName
  });

  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret);
  auth.setCredentials({
    refresh_token: config.refreshToken
  });

  const drive = google.drive({
    version: "v3",
    auth
  });

  const response = await drive.files.create({
    requestBody: {
      name: originalFileName,
      parents: [config.folderId]
    },
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(filePath)
    },
    fields: "id,name,size,webViewLink,webContentLink",
    supportsAllDrives: true
  });

  const file = response.data;

  if (!file.id) {
    throw new Error("Google Drive did not return an uploaded file id.");
  }

  await log("Uploaded original IFC to Google Drive", {
    modelId,
    driveFileId: file.id,
    size: file.size
  });

  return {
    archiveProvider: "GOOGLE_DRIVE",
    archiveBucket: config.folderId,
    archiveKey: file.id,
    archiveUrl: file.webViewLink ?? file.webContentLink ?? null,
    deleteOriginalBlob: true
  };
}

async function archiveOriginalIfConfigured({ jobId, modelId, filePath, originalFileName }) {
  const archive = await uploadOriginalToGoogleDrive({
    modelId,
    filePath,
    originalFileName
  });

  if (!archive) {
    return null;
  }

  const result = await markOriginalArchived(jobId, archive);

  await log("Archived original IFC", {
    jobId,
    modelId,
    archiveProvider: archive.archiveProvider,
    archiveKey: archive.archiveKey,
    originalDeletedAt: result?.originalDeletedAt ?? null,
    originalDeleteError: result?.originalDeleteError ?? null
  });

  return result;
}

async function archiveExistingOriginalIfAvailable() {
  const payload = await claimOriginalArchiveCandidate();

  if (!payload?.model) {
    return false;
  }

  const model = payload.model;
  let tempDir = null;

  await log("Processing existing original archive", {
    modelId: model.id,
    originalFileName: model.originalFileName
  });

  try {
    const downloaded = await downloadModel(model, `archive-${model.id}`);
    tempDir = downloaded.tempDir;

    const archive = await uploadOriginalToGoogleDrive({
      modelId: model.id,
      filePath: downloaded.filePath,
      originalFileName: model.originalFileName
    });

    if (!archive) {
      return false;
    }

    const result = await markModelOriginalArchived(model.id, archive);

    await log("Archived existing original IFC", {
      modelId: model.id,
      archiveProvider: archive.archiveProvider,
      archiveKey: archive.archiveKey,
      originalDeletedAt: result?.originalDeletedAt ?? null,
      originalDeleteError: result?.originalDeleteError ?? null
    });

    return true;
  } catch (error) {
    await log("Failed existing original archive", {
      modelId: model.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function processJob(payload) {
  const { job, model } = payload;
  let tempDir = null;

  await log("Processing job", {
    jobId: job.id,
    modelId: model.id,
    originalFileName: model.originalFileName
  });

  try {
    const downloaded = await downloadModel(model, job.id);
    tempDir = downloaded.tempDir;

    const converted = await convertIfcToFragments({
      modelId: model.id,
      filePath: downloaded.filePath,
      originalFileName: model.originalFileName
    });
    const blob = await uploadDerivative({
      modelId: model.id,
      fileName: converted.fileName,
      outputBuffer: converted.outputBuffer
    });

    await completeJob(job.id, {
      storageProvider: "BLOB",
      storageBucket: process.env.BLOB_STORE_ID ?? null,
      storageKey: blob.url,
      fileName: converted.fileName,
      fileSize: converted.outputBuffer.byteLength,
      checksum: converted.checksum,
      manifest: converted.manifest
    });

    try {
      await archiveOriginalIfConfigured({
        jobId: job.id,
        modelId: model.id,
        filePath: downloaded.filePath,
        originalFileName: model.originalFileName
      });
    } catch (archiveError) {
      await log("Failed to archive original IFC", {
        jobId: job.id,
        modelId: model.id,
        error:
          archiveError instanceof Error ? archiveError.message : String(archiveError)
      });
    }

    await log("Completed job", {
      jobId: job.id,
      modelId: model.id,
      fileName: converted.fileName
    });
  } catch (error) {
    await log("Failed job", {
      jobId: job.id,
      modelId: model.id,
      error: error instanceof Error ? error.message : String(error)
    });
    await failJob(job.id, error);
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function loadLocalEnv() {
  const envPath = path.join(getProjectRoot(), ".env.worker.local");

  try {
    const content = await readFile(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

      if (!match) {
        continue;
      }

      const name = match[1].trim();
      let value = match[2].trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[name] ??= value;
    }
  } catch {
    // Optional local env file.
  }
}

async function main() {
  await loadLocalEnv();

  const runOnce = process.argv.includes("--once");

  do {
    const payload = await claimJob();

    if (payload) {
      await processJob(payload);
    } else if (await archiveExistingOriginalIfAvailable()) {
      // Keep polling immediately after archive work; there may be more originals to move.
    } else if (!runOnce) {
      await sleep(POLL_INTERVAL_MS);
    } else {
      console.log("No queued IFC processing jobs.");
    }
  } while (!runOnce);

  if (runOnce) {
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
