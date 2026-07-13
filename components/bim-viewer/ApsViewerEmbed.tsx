"use client";

import { useEffect, useRef, useState } from "react";

const APS_VIEWER_CSS_URL =
  "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css";
const APS_VIEWER_SCRIPT_URL =
  "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js";

type ApsViewerEmbedProps = {
  urn: string;
  modelName: string;
  onError?: (message: string) => void;
};

type AutodeskViewerToken = {
  access_token: string;
  expires_in: number;
};

type AutodeskViewingApi = {
  Initializer: (
    options: {
      env: string;
      api: string;
      getAccessToken: (
        onTokenReady: (token: string, expiresIn: number) => void
      ) => void;
    },
    callback: () => void
  ) => void;
  Document: {
    load: (
      documentId: string,
      onSuccess: (document: AutodeskViewingDocument) => void,
      onError: (errorCode: unknown, errorMessage?: string) => void
    ) => void;
  };
  GuiViewer3D: new (container: HTMLElement) => AutodeskGuiViewer;
};

type AutodeskViewingDocument = {
  getRoot: () => {
    getDefaultGeometry: () => unknown;
  };
};

type AutodeskGuiViewer = {
  start: () => number;
  finish: () => void;
  resize: () => void;
  loadDocumentNode: (
    document: AutodeskViewingDocument,
    geometry: unknown
  ) => Promise<unknown>;
};

declare global {
  interface Window {
    Autodesk?: {
      Viewing: AutodeskViewingApi;
    };
    __apsViewerScriptPromise?: Promise<void>;
  }
}

async function getViewerToken() {
  const response = await fetch("/api/aps/viewer-token", {
    cache: "no-store"
  });
  const payload = (await response.json()) as AutodeskViewerToken & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "APS viewer token을 발급하지 못했습니다.");
  }

  return payload;
}

function ensureViewerStyles() {
  if (document.querySelector(`link[href="${APS_VIEWER_CSS_URL}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = APS_VIEWER_CSS_URL;
  document.head.appendChild(link);
}

function loadViewerScript() {
  if (window.Autodesk?.Viewing) {
    return Promise.resolve();
  }

  if (window.__apsViewerScriptPromise) {
    return window.__apsViewerScriptPromise;
  }

  window.__apsViewerScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = APS_VIEWER_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Autodesk Viewer SDK 로드에 실패했습니다."));
    document.body.appendChild(script);
  });

  return window.__apsViewerScriptPromise;
}

export function ApsViewerEmbed({ urn, modelName, onError }: ApsViewerEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<AutodeskGuiViewer | null>(null);
  const [message, setMessage] = useState("APS Viewer 준비 중...");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const viewerContainer = container;
    let isMounted = true;

    async function initialize() {
      setMessage("APS Viewer 준비 중...");
      ensureViewerStyles();

      try {
        await loadViewerScript();

        if (!isMounted || !window.Autodesk?.Viewing) {
          return;
        }

        window.Autodesk.Viewing.Initializer(
          {
            env: "AutodeskProduction2",
            api: "streamingV2",
            getAccessToken: (onTokenReady) => {
              void getViewerToken()
                .then((token) =>
                  onTokenReady(token.access_token, token.expires_in)
                )
                .catch((error) => {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "APS viewer token을 발급하지 못했습니다.";
                  setMessage(errorMessage);
                  onError?.(errorMessage);
                });
            }
          },
          () => {
            if (!isMounted || !window.Autodesk?.Viewing) {
              return;
            }

            viewerRef.current?.finish();
            viewerRef.current = new window.Autodesk.Viewing.GuiViewer3D(
              viewerContainer
            );
            const startResult = viewerRef.current.start();

            if (startResult > 0) {
              const errorMessage = "APS Viewer 시작에 실패했습니다.";
              setMessage(errorMessage);
              onError?.(errorMessage);
              return;
            }

            setMessage("APS 변환 모델을 불러오는 중...");
            window.Autodesk.Viewing.Document.load(
              `urn:${urn}`,
              (document) => {
                if (!isMounted || !viewerRef.current) {
                  return;
                }

                const geometry = document.getRoot().getDefaultGeometry();
                void viewerRef.current
                  .loadDocumentNode(document, geometry)
                  .then(() => setMessage(""))
                  .catch((error) => {
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : "APS 변환 모델 로드에 실패했습니다.";
                    setMessage(errorMessage);
                    onError?.(errorMessage);
                  });
              },
              (_errorCode, errorMessage) => {
                const message =
                  errorMessage ?? "APS 문서 manifest 로드에 실패했습니다.";
                setMessage(message);
                onError?.(message);
              }
            );
          }
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "APS Viewer 초기화에 실패했습니다.";
        setMessage(errorMessage);
        onError?.(errorMessage);
      }
    }

    void initialize();

    const resizeObserver = new ResizeObserver(() => viewerRef.current?.resize());
    resizeObserver.observe(container);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      viewerRef.current?.finish();
      viewerRef.current = null;
    };
  }, [modelName, onError, urn]);

  return (
    <div className="absolute inset-0 bg-[#dfe5ec]">
      <div ref={containerRef} className="absolute inset-0" />
      {message ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(223,229,236,0.72)]">
          <div className="rounded-[12px] border border-[#c8d0da] bg-white px-4 py-3 text-sm font-medium text-[#203047] shadow-sm">
            {message}
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute left-4 top-4 rounded-[999px] border border-[#c8d0da] bg-white/90 px-3 py-1 text-xs font-semibold text-[#203047] shadow-sm">
        APS Viewer · {modelName}
      </div>
    </div>
  );
}
