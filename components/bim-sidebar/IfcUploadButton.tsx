"use client";

import { upload } from "@vercel/blob/client";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { IfcModelSummary, useViewerStore } from "@/store/viewerStore";

type IfcUploadButtonProps = {
  trigger: ReactNode;
  projectId?: string | null;
  modelVersion?: string | null;
  buttonClassName?: string;
  messageClassName?: string;
  onUploaded?: (model: IfcModelSummary) => void;
};

type UploadResponse = {
  model?: IfcModelSummary;
  error?: string;
};

type BlobUploadResponse = {
  url: string;
  pathname: string;
};

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();

  if (!text) {
    return { error: fallbackMessage } as T & { error?: string };
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: fallbackMessage } as T & { error?: string };
  }
}

function getUploadErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "3D 파일 업로드에 실패했습니다.";

  if (
    message.includes("Failed to execute 'json'") ||
    message.includes("Unexpected end of JSON input")
  ) {
    return "업로드 서버 응답이 비어 있습니다. 배포 환경의 Blob 업로드 설정과 파일 크기 제한을 확인해 주세요.";
  }

  return message;
}

function getBlobUploadPath(fileName: string) {
  const safeFileName = fileName.replace(/[\\/]/g, "_");

  return `ifc-uploads/${crypto.randomUUID()}-${safeFileName}`;
}

function getModelFileFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toUpperCase();

  return extension === "NWC" || extension === "NWD" ? extension : "IFC";
}

async function enqueueProcessing(modelId: string) {
  const response = await fetch(`/api/ifc/models/${modelId}/process`, {
    method: "POST"
  });
  const payload = await readJsonResponse<{ error?: string }>(
    response,
    "3D 파일 처리 요청에 실패했습니다."
  );

  if (!response.ok) {
    throw new Error(payload.error ?? "3D 파일 처리 요청에 실패했습니다.");
  }
}

async function completeBlobUpload(
  file: File,
  blob: BlobUploadResponse,
  projectId?: string | null,
  modelVersion?: string | null
) {
  const response = await fetch("/api/ifc/upload/blob/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      originalFileName: file.name,
      projectId,
      modelVersion
    })
  });
  const payload = await readJsonResponse<UploadResponse>(
    response,
    "3D 파일 업로드 등록에 실패했습니다."
  );

  if (!response.ok || !payload.model) {
    throw new Error(payload.error ?? "3D 파일 업로드 등록에 실패했습니다.");
  }

  return payload.model;
}

export function IfcUploadButton({
  trigger,
  projectId,
  modelVersion,
  buttonClassName,
  messageClassName,
  onUploaded
}: IfcUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const setError = useViewerStore((state) => state.setError);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const blob = await upload(getBlobUploadPath(file.name), file, {
        access: "private",
        handleUploadUrl: "/api/ifc/upload/blob",
        multipart: true
      });
      const model = await completeBlobUpload(file, blob, projectId, modelVersion);
      const fileFormat = getModelFileFormat(file.name);

      await enqueueProcessing(model.id);
      onUploaded?.(model);
      setMessage(
        fileFormat === "IFC"
          ? "업로드 완료. IFC 경량화 작업을 시작했습니다."
          : `${fileFormat} 업로드 완료. APS 뷰어 변환을 시작했습니다.`
      );
      window.dispatchEvent(new Event("ifc-models:refresh"));
    } catch (error) {
      const errorMessage = getUploadErrorMessage(error);
      setMessage(errorMessage);
      setError(errorMessage);
      window.dispatchEvent(new Event("ifc-models:refresh"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={
          buttonClassName ??
          "inline-flex h-10 items-center justify-center rounded-md bg-[#203047] px-4 text-sm font-medium text-white transition hover:bg-[#2c405d] disabled:cursor-not-allowed disabled:opacity-60"
        }
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title="3D 파일 업로드"
      >
        {isUploading ? "업로드 중..." : trigger}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".ifc,.nwc,.nwd"
        className="sr-only"
        onChange={handleFileChange}
      />
      {message ? (
        <p
          className={
            messageClassName ??
            "max-w-[320px] truncate text-right text-xs text-[#647083]"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
