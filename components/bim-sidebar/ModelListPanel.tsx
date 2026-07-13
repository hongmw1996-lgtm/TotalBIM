"use client";

import {
  Check,
  Eye,
  EyeOff,
  Move,
  Palette,
  RefreshCw,
  RotateCcw,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelSection } from "@/components/bim-sidebar/PanelSection";
import { IfcModelSummary, useViewerStore } from "@/store/viewerStore";

type ModelsResponse = {
  models: IfcModelSummary[];
  warning?: string;
};

type ContextMenuState = {
  modelId: string;
  x: number;
  y: number;
};

type PositionDraft = {
  x: string;
  y: string;
  z: string;
};

const activeProcessingStatuses = new Set(["QUEUED", "PROCESSING"]);

function isProcessingStatus(status: string) {
  return activeProcessingStatuses.has(status);
}

function getProcessButtonLabel(model: IfcModelSummary, isProcessing: boolean) {
  if (isProcessing || model.status === "PROCESSING") {
    return "처리 중";
  }

  if (model.status === "QUEUED") {
    return "경량화 시작";
  }

  if (model.status === "FAILED") {
    return "다시 경량화";
  }

  return model.derivativeCount > 1 ? "다시 경량화" : "경량화";
}

function normalizeDraftValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ModelListPanel() {
  const [models, setModels] = useState<IfcModelSummary[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [processingModelId, setProcessingModelId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [positionModalModelId, setPositionModalModelId] = useState<string | null>(
    null
  );
  const [colorModalModelId, setColorModalModelId] = useState<string | null>(null);
  const [positionDraft, setPositionDraft] = useState<PositionDraft>({
    x: "0",
    y: "0",
    z: "0"
  });
  const [colorDraft, setColorDraft] = useState("#8b8d95");
  const autoSelectedModelRef = useRef<string | null>(null);
  const activeModelIds = useViewerStore((state) => state.activeModelIds);
  const modelOffsets = useViewerStore((state) => state.modelOffsets);
  const modelVisibility = useViewerStore((state) => state.modelVisibility);
  const modelColorOverrides = useViewerStore(
    (state) => state.modelColorOverrides
  );
  const setActiveModel = useViewerStore((state) => state.setActiveModel);
  const toggleActiveModelId = useViewerStore((state) => state.toggleActiveModelId);
  const setModelOffset = useViewerStore((state) => state.setModelOffset);
  const resetModelOffset = useViewerStore((state) => state.resetModelOffset);
  const setModelVisibility = useViewerStore((state) => state.setModelVisibility);
  const setModelColorOverride = useViewerStore(
    (state) => state.setModelColorOverride
  );
  const resetModelColorOverride = useViewerStore(
    (state) => state.resetModelColorOverride
  );
  const clearActiveModelIds = useViewerStore((state) => state.clearActiveModelIds);
  const setError = useViewerStore((state) => state.setError);

  const modelsById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models]
  );

  const positionModalModel = positionModalModelId
    ? modelsById.get(positionModalModelId) ?? null
    : null;
  const colorModalModel = colorModalModelId
    ? modelsById.get(colorModalModelId) ?? null
    : null;

  const fetchModels = useCallback(async () => {
    setWarning(null);

    try {
      const response = await fetch("/api/ifc/models", { cache: "no-store" });
      const payload = (await response.json()) as ModelsResponse;

      if (!response.ok) {
        throw new Error("모델 목록을 불러오지 못했습니다.");
      }

      setModels(payload.models ?? []);
      setWarning(payload.warning ?? null);

      const availableModelIds = new Set((payload.models ?? []).map((model) => model.id));
      const staleSelections = activeModelIds.filter(
        (modelId) => !availableModelIds.has(modelId)
      );

      if (staleSelections.length > 0) {
        clearActiveModelIds();
      }

      const requestedModelId = new URLSearchParams(window.location.search).get(
        "modelId"
      );

      if (requestedModelId && requestedModelId !== autoSelectedModelRef.current) {
        const requestedModel = (payload.models ?? []).find(
          (model) => model.id === requestedModelId
        );

        if (requestedModel) {
          setActiveModel(requestedModel);
          autoSelectedModelRef.current = requestedModelId;
        }
      }

      return payload.models ?? [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "모델 목록을 불러오지 못했습니다.";
      setError(errorMessage);
      return [];
    }
  }, [activeModelIds, clearActiveModelIds, setActiveModel, setError]);

  const pollProcessingStatus = useCallback(
    async (modelId: string) => {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const latestModels = await fetchModels();
        const latestModel = latestModels.find((model) => model.id === modelId);

        if (!latestModel || !isProcessingStatus(latestModel.status)) {
          return;
        }
      }
    },
    [fetchModels]
  );

  const processModel = useCallback(
    async (modelId: string) => {
      setProcessingModelId(modelId);
      setError(null);

      try {
        const response = await fetch(`/api/ifc/models/${modelId}/process`, {
          method: "POST"
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "IFC 경량화 처리에 실패했습니다.");
        }

        await fetchModels();
        await pollProcessingStatus(modelId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "IFC 경량화 처리에 실패했습니다.";
        setError(errorMessage);
      } finally {
        setProcessingModelId(null);
      }
    },
    [fetchModels, pollProcessingStatus, setError]
  );

  const openPositionModal = useCallback(
    (modelId: string) => {
      const offset = modelOffsets[modelId] ?? { x: 0, y: 0, z: 0 };

      setPositionDraft({
        x: String(offset.x),
        y: String(offset.y),
        z: String(offset.z)
      });
      setPositionModalModelId(modelId);
    },
    [modelOffsets]
  );

  const openColorModal = useCallback(
    (modelId: string) => {
      setColorDraft(modelColorOverrides[modelId] ?? "#8b8d95");
      setColorModalModelId(modelId);
    },
    [modelColorOverrides]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchModels();
    }, 0);
    window.addEventListener("ifc-models:refresh", fetchModels);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("ifc-models:refresh", fetchModels);
    };
  }, [fetchModels]);

  useEffect(() => {
    if (!models.some((model) => isProcessingStatus(model.status))) {
      return;
    }

    const timer = window.setInterval(() => {
      void fetchModels();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [fetchModels, models]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handlePointerDown = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  const handleContextAction = useCallback(
    (
      action:
        | "visibility"
        | "color"
        | "resetColor"
        | "move"
        | "resetMove"
        | "reprocess"
    ) => {
      if (!contextMenu) {
        return;
      }

      const modelId = contextMenu.modelId;
      const isVisible = modelVisibility[modelId] ?? true;
      setContextMenu(null);

      if (action === "visibility") {
        setModelVisibility(modelId, !isVisible);
        return;
      }

      if (action === "color") {
        openColorModal(modelId);
        return;
      }

      if (action === "resetColor") {
        resetModelColorOverride(modelId);
        return;
      }

      if (action === "move") {
        openPositionModal(modelId);
        return;
      }

      if (action === "resetMove") {
        resetModelOffset(modelId);
        return;
      }

      void processModel(modelId);
    },
    [
      contextMenu,
      modelVisibility,
      openColorModal,
      openPositionModal,
      processModel,
      resetModelColorOverride,
      resetModelOffset,
      setModelVisibility
    ]
  );

  return (
    <PanelSection title="IFC 모델">
      {warning ? (
        <p className="mb-3 rounded-md bg-[#fff7df] px-3 py-2 text-xs leading-5 text-[#765000]">
          {warning}
        </p>
      ) : null}

      {models.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#cfd6e1] px-3 py-4 text-center text-xs leading-5 text-[#647083]">
          아직 업로드된 IFC 모델이 없습니다.
        </p>
      ) : (
        <div className="max-h-[540px] overflow-y-auto">
          {models.map((model) => {
            const isActive = activeModelIds.includes(model.id);
            const isVisible = modelVisibility[model.id] ?? true;

            return (
              <div
                key={model.id}
                className={`mb-2 rounded-lg border transition ${
                  isActive
                    ? "border-[#2f6fed] bg-[#eef4ff]"
                    : "border-[#d6dde8] bg-white"
                }`}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({
                    modelId: model.id,
                    x: event.clientX,
                    y: event.clientY
                  });
                }}
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <button
                    type="button"
                    className={`flex size-3 shrink-0 items-center justify-center rounded-[3px] border transition ${
                      isActive
                        ? "border-[#2f6fed] bg-[#2f6fed] text-white"
                        : "border-[#c9d3e0] bg-white text-transparent hover:border-[#2f6fed]"
                    }`}
                    aria-pressed={isActive}
                    aria-label={isActive ? "모델 선택 해제" : "모델 선택"}
                    onClick={() => toggleActiveModelId(model.id)}
                  >
                    <Check size={8} strokeWidth={3} aria-hidden />
                  </button>

                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center rounded-md px-1 py-1 text-left transition hover:bg-[#f5f8fc]"
                    onClick={() => toggleActiveModelId(model.id)}
                    title={model.originalFileName}
                  >
                    <div className="min-w-0 overflow-x-auto">
                      <div
                        className={`min-w-max whitespace-nowrap text-sm font-medium ${
                          isVisible ? "text-[#203047]" : "text-[#8190a5]"
                        }`}
                      >
                        {model.originalFileName}
                      </div>
                      <div className="mt-0.5 text-xs text-[#647083]">
                        버전 {model.modelVersion || "미지정"}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[210px] overflow-hidden rounded-lg border border-[#d6dde8] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("visibility")}
          >
            {(modelVisibility[contextMenu.modelId] ?? true) ? (
              <EyeOff size={14} aria-hidden />
            ) : (
              <Eye size={14} aria-hidden />
            )}
            {(modelVisibility[contextMenu.modelId] ?? true)
              ? "파일 숨기기"
              : "파일 보이기"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("color")}
          >
            <Palette size={14} aria-hidden />
            색상 바꾸기
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("resetColor")}
          >
            <RotateCcw size={14} aria-hidden />
            색상 초기화
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("move")}
          >
            <Move size={14} aria-hidden />
            위치 바꾸기
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("resetMove")}
          >
            <RotateCcw size={14} aria-hidden />
            위치 초기화
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-[#e7edf5] px-3 py-2 text-left text-sm text-[#203047] transition hover:bg-[#f5f8fc]"
            onClick={() => handleContextAction("reprocess")}
          >
            <RefreshCw size={14} aria-hidden />
            {modelsById.get(contextMenu.modelId)
              ? getProcessButtonLabel(
                  modelsById.get(contextMenu.modelId)!,
                  processingModelId === contextMenu.modelId
                )
              : "다시 경량화"}
          </button>
        </div>
      ) : null}

      {positionModalModel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-[#d7deea] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-[#e7edf5] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#203047]">
                  위치 바꾸기
                </h3>
                <p className="mt-1 truncate text-sm text-[#647083]">
                  {positionModalModel.originalFileName}
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-[#647083] transition hover:bg-[#f3f6fa]"
                aria-label="위치 팝업 닫기"
                onClick={() => setPositionModalModelId(null)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="grid grid-cols-3 gap-3">
                {(["x", "y", "z"] as const).map((axis) => (
                  <label key={axis} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase text-[#647083]">
                      {axis}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={positionDraft[axis]}
                      onChange={(event) =>
                        setPositionDraft((previous) => ({
                          ...previous,
                          [axis]: event.target.value
                        }))
                      }
                      className="h-10 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm text-[#203047] outline-none transition focus:border-[#2f6fed]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#e7edf5] px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[#d3dbe7] bg-white px-3 py-2 text-sm text-[#4a5a6d] transition hover:bg-[#f6f8fb]"
                onClick={() => {
                  resetModelOffset(positionModalModel.id);
                  setPositionDraft({ x: "0", y: "0", z: "0" });
                }}
              >
                <RotateCcw size={14} aria-hidden />
                위치 초기화
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[#d3dbe7] bg-white px-3 py-2 text-sm text-[#4a5a6d] transition hover:bg-[#f6f8fb]"
                  onClick={() => setPositionModalModelId(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#2f6fed] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#255de0]"
                  onClick={() => {
                    setModelOffset(positionModalModel.id, {
                      x: normalizeDraftValue(positionDraft.x),
                      y: normalizeDraftValue(positionDraft.y),
                      z: normalizeDraftValue(positionDraft.z)
                    });
                    setPositionModalModelId(null);
                  }}
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {colorModalModel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-[#d7deea] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-[#e7edf5] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#203047]">
                  색상 바꾸기
                </h3>
                <p className="mt-1 truncate text-sm text-[#647083]">
                  {colorModalModel.originalFileName}
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-[#647083] transition hover:bg-[#f3f6fa]"
                aria-label="색상 팝업 닫기"
                onClick={() => setColorModalModelId(null)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="flex items-center gap-4">
                <input
                  type="color"
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  className="h-14 w-16 rounded border border-[#cfd7e3] bg-white p-1"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#203047]">
                    파일 색상
                  </div>
                  <div className="mt-1 text-xs text-[#647083]">
                    현재 선택한 IFC 파일 전체에 적용됩니다.
                  </div>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase text-[#647083]">
                  Hex
                </span>
                <input
                  type="text"
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  className="h-10 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm text-[#203047] outline-none transition focus:border-[#2f6fed]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-[#e7edf5] px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[#d3dbe7] bg-white px-3 py-2 text-sm text-[#4a5a6d] transition hover:bg-[#f6f8fb]"
                onClick={() => {
                  resetModelColorOverride(colorModalModel.id);
                  setColorDraft("#8b8d95");
                }}
              >
                <RotateCcw size={14} aria-hidden />
                색상 초기화
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[#d3dbe7] bg-white px-3 py-2 text-sm text-[#4a5a6d] transition hover:bg-[#f6f8fb]"
                  onClick={() => setColorModalModelId(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#2f6fed] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#255de0]"
                  onClick={() => {
                    const nextColor =
                      /^#[0-9a-fA-F]{6}$/.test(colorDraft) ? colorDraft : "#8b8d95";
                    setModelColorOverride(colorModalModel.id, nextColor);
                    setColorModalModelId(null);
                  }}
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PanelSection>
  );
}
