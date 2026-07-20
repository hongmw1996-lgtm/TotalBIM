import { Readable } from "node:stream";
import { google } from "googleapis";
import { ObjectStorage, PutObjectInput, ReadObjectResult } from "@/lib/storage/types";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Google Drive object storage.`);
  }

  return value.trim();
}

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    requireEnv("GOOGLE_DRIVE_CLIENT_ID"),
    requireEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: requireEnv("GOOGLE_DRIVE_REFRESH_TOKEN")
  });

  return google.drive({
    version: "v3",
    auth
  });
}

function getDriveFileId(key: string) {
  try {
    const url = new URL(key);

    if (url.searchParams.get("id")) {
      return url.searchParams.get("id") ?? key;
    }

    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);

    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }
  } catch {
    // Plain Drive file ids are expected.
  }

  return key;
}

export function createGoogleDriveObjectStorage(): ObjectStorage {
  return {
    provider: "GOOGLE_DRIVE",
    bucket: process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID,
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      const drive = getDriveClient();
      const response = await drive.files.create({
        requestBody: {
          name: input.key.split("/").pop() || "object",
          parents: process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID
            ? [process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID]
            : undefined
        },
        media: {
          mimeType: input.contentType ?? "application/octet-stream",
          body: Readable.from(body)
        },
        fields: "id,size"
      });
      const fileId = response.data.id;

      if (!fileId) {
        throw new Error("Google Drive did not return a file id.");
      }

      return {
        provider: "GOOGLE_DRIVE",
        bucket: process.env.GOOGLE_DRIVE_ARCHIVE_FOLDER_ID,
        key: fileId,
        size: Number(response.data.size ?? body.byteLength)
      };
    },
    async readObject(key: string): Promise<ReadObjectResult> {
      const drive = getDriveClient();
      const fileId = getDriveFileId(key);
      const metadata = await drive.files.get({
        fileId,
        fields: "mimeType,size"
      });
      const response = await drive.files.get(
        {
          fileId,
          alt: "media"
        },
        {
          responseType: "stream"
        }
      );

      return {
        body: response.data as unknown as Readable,
        contentType: metadata.data.mimeType ?? undefined,
        contentLength: metadata.data.size ? Number(metadata.data.size) : undefined
      };
    },
    async deleteObject(key: string) {
      const drive = getDriveClient();

      await drive.files.delete({
        fileId: getDriveFileId(key)
      });
    }
  };
}
