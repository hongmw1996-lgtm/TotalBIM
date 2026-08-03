"use client";

import {
  Bookmark,
  Boxes,
  Check,
  Eye,
  EyeOff,
  MoreHorizontal,
  Move,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IfcUploadButton } from "@/components/bim-sidebar/IfcUploadButton";
import type {
  ViewerFilterPropertyKey
} from "@/lib/viewer/filtering";
import { IfcModelSummary, useViewerStore } from "@/store/viewerStore";

type ViewerSidebarTab = "models" | "filters" | "saved";

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

const filterPropertyLabels: Record<ViewerFilterPropertyKey, string> = {
  type: "Type",
  name: "Name",
  id: "Global ID",
  level: "Level"
};

const filterPropertyDescriptions: Record<ViewerFilterPropertyKey, string> = {
  type: "Object type / IFC category",
  name: "Object name",
  id: "Global ID / object identifier",
  level: "Storey / level"
};

const popularFilterPropertyKeys = new Set<ViewerFilterPropertyKey>([
  "type",
  "level",
  "name",
  "id"
]);

const tabs: Array<{
  id: ViewerSidebarTab;
  label: string;
  icon: typeof Boxes;
}> = [
  { id: "models", label: "Models", icon: Boxes },
  { id: "filters", label: "Filter", icon: SlidersHorizontal },
  { id: "saved", label: "Saved", icon: Bookmark }
];

const activeProcessingStatuses = new Set(["QUEUED", "PROCESSING"]);

function isProcessingStatus(status: string) {
  return activeProcessingStatuses.has(status);
}

function getProcessButtonLabel(model: IfcModelSummary, isProcessing: boolean) {
  const isIfc = isIfcModel(model);

  if (isProcessing || model.status === "PROCESSING") {
    return isIfc ? "Processing" : "Converting";
  }

  if (model.status === "QUEUED") {
    return "Queued";
  }

  if (model.status === "FAILED") {
    return isIfc ? "Retry" : "Retry conversion";
  }

  if (!isIfc) {
    return model.derivativeCount > 0 ? "Reconvert" : "Convert";
  }

  return model.derivativeCount > 1 ? "Reprocess" : "Process";
}

function normalizeDraftValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUploadedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getModelFileFormat(model: IfcModelSummary) {
  return model.fileFormat ?? "IFC";
}

function isIfcModel(model: IfcModelSummary | null | undefined) {
  return (model?.fileFormat ?? "IFC") === "IFC";
}

function getConversionBadgeLabel(model: IfcModelSummary) {
  if (model.status === "READY") {
    return "APS ready";
  }

  if (model.status === "PROCESSING" || model.status === "QUEUED") {
    return "Converting";
  }

  if (model.status === "FAILED") {
    return "Conversion failed";
  }

  return "Conversion pending";
}

function EmptyFiltersState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center text-[#667085]">
      <SlidersHorizontal size={40} strokeWidth={1.8} aria-hidden />
      <div>
        <p className="text-base font-semibold text-[#111827]">
          No filters are available yet.
        </p>
        <p className="mt-2 text-sm text-[#667085]">
          Load a model to use property-based viewer filters.
        </p>
      </div>
    </div>
  );
}

function EmptySavedViewsState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center text-[#667085]">
      <Bookmark size={40} strokeWidth={1.8} aria-hidden />
      <div>
        <p className="text-base font-semibold text-[#111827]">
          No saved views yet.
        </p>
        <p className="mt-2 text-sm text-[#667085]">
          Saved views will be added in a later step.
        </p>
      </div>
    </div>
  );
}

export function ViewerSidebar() {
  const [activeTab, setActiveTab] = useState<ViewerSidebarTab>("models");
  const [savedViewScope, setSavedViewScope] = useState<"all" | "mine">("all");
  const [models, setModels] = useState<IfcModelSummary[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [processingModelId, setProcessingModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isPropertyPickerVisible, setIsPropertyPickerVisible] = useState(false);
  const [propertyPickerQuery, setPropertyPickerQuery] = useState("");
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
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const autoSelectedModelRef = useRef<string | null>(null);

  const activeModelIds = useViewerStore((state) => state.activeModelIds);
  const modelOffsets = useViewerStore((state) => state.modelOffsets);
  const modelVisibility = useViewerStore((state) => state.modelVisibility);
  const modelColorOverrides = useViewerStore(
    (state) => state.modelColorOverrides
  );
  const availableFilterProperties = useViewerStore(
    (state) => state.availableFilterProperties
  );
  const activeFilterKeys = useViewerStore((state) => state.activeFilterKeys);
  const selectedFilterValues = useViewerStore(
    (state) => state.selectedFilterValues
  );
  const showFilterProperty = useViewerStore((state) => state.showFilterProperty);
  const hideFilterProperty = useViewerStore((state) => state.hideFilterProperty);
  const setFilterValueSelected = useViewerStore(
    (state) => state.setFilterValueSelected
  );
  const clearFilterValues = useViewerStore((state) => state.clearFilterValues);
  const clearAllFilters = useViewerStore((state) => state.clearAllFilters);
  const setActiveModel = useViewerStore((state) => state.setActiveModel);
  const setActiveModelIds = useViewerStore((state) => state.setActiveModelIds);
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

  const displayedModels = useMemo(() => {
    if (!activeProjectId) {
      return models;
    }

    return models.filter((model) => model.projectId === activeProjectId);
  }, [activeProjectId, models]);

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
        throw new Error("Failed to load the model list.");
      }

      const nextModels = payload.models ?? [];
      setModels(nextModels);
      setWarning(payload.warning ?? null);

      const availableModelIds = new Set(nextModels.map((model) => model.id));
      const staleSelections = activeModelIds.filter(
        (modelId) => !availableModelIds.has(modelId)
      );

      if (staleSelections.length > 0) {
        clearActiveModelIds();
      }

      const searchParams = new URLSearchParams(window.location.search);
      const requestedModelId = searchParams.get("modelId");
      const requestedProjectId = searchParams.get("projectId");
      let nextProjectId =
        requestedProjectId ??
        nextModels.find((model) => activeModelIds.includes(model.id))?.projectId ??
        null;

      if (requestedModelId) {
        const requestedModel = nextModels.find((model) => model.id === requestedModelId);

        if (requestedModel) {
          nextProjectId = requestedModel.projectId ?? null;

          if (requestedModelId !== autoSelectedModelRef.current) {
            setActiveModel(requestedModel);
            autoSelectedModelRef.current = requestedModelId;
          }
        }
      }

      setActiveProjectId(nextProjectId);
      return nextModels;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load the model list.";
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
          throw new Error(payload.error ?? "Failed to process the 3D model.");
        }

        await fetchModels();
        await pollProcessingStatus(modelId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process the 3D model.";
        setError(errorMessage);
      } finally {
        setProcessingModelId(null);
      }
    },
    [fetchModels, pollProcessingStatus, setError]
  );

  const deleteModel = useCallback(
    async (model: IfcModelSummary) => {
      if (deletingModelId || !window.confirm(`${model.originalFileName} 모델을 삭제하시겠습니까?`)) {
        return;
      }

      setDeletingModelId(model.id);
      setError(null);
      setContextMenu(null);

      try {
        const response = await fetch(`/api/ifc/models/${model.id}`, {
          method: "DELETE"
        });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "모델 삭제에 실패했습니다.");
        }

        setModels((currentModels) =>
          currentModels.filter((currentModel) => currentModel.id !== model.id)
        );

        if (activeModelIds.includes(model.id)) {
          setActiveModelIds(
            activeModelIds.filter((activeModelId) => activeModelId !== model.id)
          );
        }

        window.dispatchEvent(new Event("ifc-models:refresh"));
      } catch (error) {
        setError(error instanceof Error ? error.message : "모델 삭제에 실패했습니다.");
      } finally {
        setDeletingModelId(null);
      }
    },
    [activeModelIds, deletingModelId, setActiveModelIds, setError]
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
        | "delete"
    ) => {
      if (!contextMenu) {
        return;
      }

      const modelId = contextMenu.modelId;
      const model = modelsById.get(modelId);
      const isVisible = modelVisibility[modelId] ?? true;
      setContextMenu(null);

      if (action === "delete") {
        if (model) {
          void deleteModel(model);
        }

        return;
      }

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
      deleteModel,
      modelVisibility,
      modelsById,
      openColorModal,
      openPositionModal,
      processModel,
      resetModelColorOverride,
      resetModelOffset,
      setModelVisibility
    ]
  );

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeTabMeta.icon;
  const availableFilterPropertyMap = useMemo(
    () =>
      new Map(
        availableFilterProperties.map((property) => [property.key, property])
      ),
    [availableFilterProperties]
  );
  const hasAnyActiveFilter = Object.keys(selectedFilterValues).length > 0;
  const propertyQuery = propertyPickerQuery.trim().toLowerCase();
  const filteredPropertyOptions = availableFilterProperties.filter((property) => {
    const label =
      filterPropertyLabels[property.key] ??
      property.label.charAt(0).toUpperCase() + property.label.slice(1);
    const description = filterPropertyDescriptions[property.key] ?? property.label;

    if (!propertyQuery) {
      return true;
    }

    return (
      label.toLowerCase().includes(propertyQuery) ||
      description.toLowerCase().includes(propertyQuery)
    );
  });
  const popularPropertyOptions = filteredPropertyOptions.filter(
    (property) => popularFilterPropertyKeys.has(property.key)
  );
  const displayedFilterKeys = useMemo(() => {
    const nextKeys = new Set<ViewerFilterPropertyKey>(activeFilterKeys);

    for (const rawKey of Object.keys(selectedFilterValues)) {
      nextKeys.add(rawKey as ViewerFilterPropertyKey);
    }

    return [...nextKeys].filter((key) => availableFilterPropertyMap.has(key));
  }, [activeFilterKeys, availableFilterPropertyMap, selectedFilterValues]);

  function handleResetFilters() {
    clearAllFilters();
    setIsPropertyPickerVisible(false);
    setPropertyPickerQuery("");
  }

  function handleSelectFilterProperty(key: ViewerFilterPropertyKey) {
    showFilterProperty(key);
    setIsPropertyPickerVisible(false);
    setPropertyPickerQuery("");
  }

  return (
    <>
      <aside className="flex h-full min-h-0 bg-white text-[#171717]">
        <div className="flex w-[52px] shrink-0 flex-col items-center border-r border-[#ebebeb] bg-[#fcfcfc] py-3">
          <div className="flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  title={tab.label}
                  aria-label={tab.label}
                  className={`flex size-9 items-center justify-center rounded-[6px] transition ${
                    isActive
                      ? "bg-[#171717] text-white"
                      : "text-[#8f8f8f] hover:bg-[#f6f6f6] hover:text-[#171717]"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={17} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-[#ebebeb] px-4">
            <div className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.02em] text-[#171717]">
              <ActiveTabIcon size={16} aria-hidden />
              {activeTabMeta.label}
            </div>

            {activeTab === "models" ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  title="Refresh models"
                  aria-label="Refresh models"
                  onClick={() => void fetchModels()}
                >
                  <RefreshCw size={14} aria-hidden />
                </button>
                {activeProjectId ? (
                  <IfcUploadButton
                    projectId={activeProjectId}
                    buttonClassName="flex size-8 items-center justify-center rounded-[6px] bg-transparent text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                    messageClassName="hidden"
                    trigger={<Plus size={15} aria-hidden />}
                    onUploaded={() => void fetchModels()}
                  />
                ) : null}
              </div>
            ) : activeTab === "saved" ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  title="Search saved views"
                  aria-label="Search saved views"
                >
                  <Search size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                  title="Add saved view"
                  aria-label="Add saved view"
                >
                  <Plus size={14} aria-hidden />
                </button>
              </div>
            ) : activeTab === "filters" ? (
              <div className="flex items-center gap-1">
                {hasAnyActiveFilter ? (
                  <button
                    type="button"
                    className="rounded-[8px] border border-[#d8dde6] px-2.5 py-1 text-xs font-medium text-[#171717] transition hover:border-[#171717] hover:bg-[#fcfcfc]"
                    onClick={handleResetFilters}
                  >
                    Reset
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`flex size-8 items-center justify-center rounded-[6px] transition ${
                    isPropertyPickerVisible
                      ? "bg-[#f3f4f6] text-[#171717]"
                      : "text-[#8f8f8f] hover:bg-[#f6f6f6] hover:text-[#171717]"
                  }`}
                  title={isPropertyPickerVisible ? "Close filter picker" : "Add filter"}
                  aria-label={isPropertyPickerVisible ? "Close filter picker" : "Add filter"}
                  onClick={() => {
                    setIsPropertyPickerVisible((current) => !current);
                    setPropertyPickerQuery("");
                  }}
                >
                  {isPropertyPickerVisible ? (
                    <X size={14} aria-hidden />
                  ) : (
                    <Plus size={14} aria-hidden />
                  )}
                </button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            {activeTab === "models" ? (
              <div className="p-3">
                {warning ? (
                  <p className="mb-3 rounded-[12px] border border-[#ebebeb] bg-[#fcfcfc] px-3 py-2 text-xs leading-5 text-[#4d4d4d]">
                    {warning}
                  </p>
                ) : null}

                {displayedModels.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#ebebeb] px-4 py-8 text-center text-sm text-[#4d4d4d]">
                    No IFC models are available for this project yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedModels.map((model) => {
                      const isActive = activeModelIds.includes(model.id);
                      const isVisible = modelVisibility[model.id] ?? true;
                      const versionLabel = model.modelVersion || "Unknown";
                      const fileFormat = getModelFileFormat(model);

                      return (
                        <div
                          key={model.id}
                          className={`rounded-[16px] border bg-white px-2.5 py-2 transition ${
                            isActive
                              ? "border-[#171717] bg-[#fafafa]"
                              : "border-[#ebebeb] hover:bg-[#fcfcfc]"
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
                          <div className="min-w-0">
                            <div className="flex items-start gap-1.5">
                              <button
                                type="button"
                                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition ${
                                  isActive
                                    ? "border-[#171717] bg-[#171717] text-white"
                                    : "border-[#ebebeb] bg-white text-transparent hover:border-[#171717]"
                                }`}
                                aria-pressed={isActive}
                                aria-label={isActive ? "Deselect model" : "Select model"}
                                onClick={() => toggleActiveModelId(model.id)}
                              >
                                <Check size={9} strokeWidth={3} aria-hidden />
                              </button>

                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                title={model.originalFileName}
                                onClick={() => toggleActiveModelId(model.id)}
                              >
                                <div
                                  className={`truncate text-[13px] font-semibold leading-5 ${
                                    isVisible ? "text-[#171717]" : "text-[#a1a1a1]"
                                  }`}
                                >
                                  {model.originalFileName}
                                </div>
                              </button>

                              <button
                                type="button"
                                className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#fff1f1] hover:text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-50"
                                data-testid={`delete-model-${model.id}`}
                                aria-label={`Delete ${model.originalFileName}`}
                                title="Delete model"
                                disabled={deletingModelId === model.id}
                                onClick={() => void deleteModel(model)}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>

                              <button
                                type="button"
                                className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                                aria-label="Model menu"
                                onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  setContextMenu({
                                    modelId: model.id,
                                    x: rect.right - 180,
                                    y: rect.bottom + 6
                                  });
                                }}
                              >
                                <MoreHorizontal size={15} aria-hidden />
                              </button>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-[9999px] border border-[#d7d7d7] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4d4d4d]">
                                {fileFormat}
                              </span>
                              <span className="rounded-[9999px] border border-[#ebebeb] bg-[#fcfcfc] px-2 py-0.5 text-[11px] font-semibold text-[#171717]">
                                Version {versionLabel}
                              </span>
                              {!isIfcModel(model) ? (
                                <span className="rounded-[9999px] border border-[#ebebeb] bg-[#fcfcfc] px-2 py-0.5 text-[11px] font-medium text-[#4d4d4d]">
                                  {getConversionBadgeLabel(model)}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-[#8f8f8f]">
                                Uploaded {formatUploadedAt(model.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "filters" ? (
              availableFilterProperties.length === 0 &&
              !isPropertyPickerVisible ? (
                <div className="flex h-full min-h-[520px] flex-col">
                  <EmptyFiltersState />
                </div>
              ) : (
                <div className="space-y-5 p-4">
                  {isPropertyPickerVisible ? (
                    <section className="overflow-hidden rounded-[12px] border border-[#232323] bg-[#111111] text-white shadow-[0_10px_32px_rgba(0,0,0,0.18)]">
                      <div className="border-b border-[#242424] px-3 py-2.5">
                        <label className="relative block">
                          <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7e7e7e]"
                            aria-hidden
                          />
                          <input
                            type="search"
                            placeholder="Search for a property..."
                            value={propertyPickerQuery}
                            onChange={(event) => setPropertyPickerQuery(event.target.value)}
                            className="h-9 w-full rounded-[8px] border border-[#2b2b2b] bg-[#111111] pl-9 pr-3 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#7e7e7e] focus:border-[#4a4a4a]"
                          />
                        </label>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto px-2 py-2">
                        <div className="px-1 pb-2 text-[12px] font-medium text-[#9a9a9a]">
                          Popular properties
                        </div>
                        {popularPropertyOptions.length > 0 ? (
                          <div className="space-y-0.5">
                            {popularPropertyOptions.map((property) => (
                              <button
                                key={`popular-${property.key}`}
                                type="button"
                                onClick={() => handleSelectFilterProperty(property.key)}
                                className="flex h-10 w-full items-center gap-3 rounded-[8px] px-2 text-left transition hover:bg-[#2a2a2a]"
                              >
                                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-400">
                                  Ab
                                </span>
                                <span className="truncate text-sm font-medium text-[#f5f5f5]">
                                  {filterPropertyLabels[property.key] ?? property.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-1 py-2 text-sm text-[#8b8b8b]">
                            No popular properties are available.
                          </div>
                        )}

                        <div className="px-1 pb-2 pt-4 text-[12px] font-medium text-[#9a9a9a]">
                          All properties ({filteredPropertyOptions.length})
                        </div>
                        {filteredPropertyOptions.length > 0 ? (
                          <div className="space-y-0.5">
                            {filteredPropertyOptions.map((property) => (
                              <button
                                key={`all-${property.key}`}
                                type="button"
                                onClick={() => handleSelectFilterProperty(property.key)}
                                className="flex h-10 w-full items-center gap-3 rounded-[8px] px-2 text-left transition hover:bg-[#2a2a2a]"
                              >
                                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-400">
                                  Ab
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[#f5f5f5]">
                                    {filterPropertyLabels[property.key] ?? property.label}
                                  </div>
                                  <div className="truncate text-[11px] text-[#8b8b8b]">
                                    {filterPropertyDescriptions[property.key] ??
                                      property.label}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-1 py-2 text-sm text-[#8b8b8b]">
                            No matching properties found.
                          </div>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {displayedFilterKeys.map((key) => {
                    const property = availableFilterPropertyMap.get(key);

                    if (!property) {
                      return null;
                    }

                    const selectedValues = selectedFilterValues[key] ?? {};
                    const hasSelectedValues = Object.keys(selectedValues).length > 0;

                    return (
                      <section
                        key={key}
                        className="rounded-[16px] border border-[#171717] bg-white"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-3 py-2.5">
                          <div className="text-sm font-semibold text-[#171717]">
                            {filterPropertyLabels[key] ?? property.label}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasSelectedValues ? (
                              <button
                                type="button"
                                onClick={() => clearFilterValues(key)}
                                className="text-xs font-medium text-[#2f6fed] transition hover:text-[#1d4fb8]"
                              >
                                Clear
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => hideFilterProperty(key)}
                              className="flex size-7 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                              aria-label={`Remove ${property.label} filter`}
                              title={`Remove ${property.label} filter`}
                            >
                              <X size={14} aria-hidden />
                            </button>
                          </div>
                        </div>

                        {property.values.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-[#4d4d4d]">
                            No values are available for this property yet.
                          </div>
                        ) : (
                          <div className="space-y-2 p-3">
                            {property.values.map((option) => {
                              const isSelected = selectedValues[option.value] ?? false;

                              return (
                                <label
                                  key={option.value}
                                  className={`flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2 text-sm transition ${
                                    isSelected
                                      ? "border-[#171717] bg-[#fcfcfc] text-[#171717]"
                                      : "border-[#ebebeb] bg-white text-[#171717]"
                                  }`}
                                >
                                  <span className="truncate">{option.label}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-[#8f8f8f]">
                                      {option.count}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(event) =>
                                        setFilterValueSelected(
                                          key,
                                          option.value,
                                          event.target.checked
                                        )
                                      }
                                      className="size-4 accent-[#171717]"
                                    />
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}

                  {!isPropertyPickerVisible &&
                  displayedFilterKeys.length === 0 ? (
                    <section>
                      <button
                        type="button"
                        onClick={() => setIsPropertyPickerVisible(true)}
                        className="flex h-11 w-full items-center justify-center rounded-[12px] border border-[#d8dde6] bg-white px-3 text-sm font-medium text-[#171717] transition hover:border-[#171717] hover:bg-[#fcfcfc]"
                      >
                        + Add filter
                      </button>
                    </section>
                  ) : null}
                </div>
              )
            ) : null}

            {activeTab === "saved" ? (
              <div className="flex h-full min-h-[520px] flex-col">
                <div className="p-4">
                  <div className="rounded-[12px] border border-[#ebebeb] bg-[#fcfcfc] p-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        className={`rounded-[6px] px-3 py-2 text-sm font-medium ${
                          savedViewScope === "all"
                            ? "bg-[#171717] text-white"
                            : "text-[#8f8f8f]"
                        }`}
                        onClick={() => setSavedViewScope("all")}
                      >
                        All Views
                      </button>
                      <button
                        type="button"
                        className={`rounded-[6px] px-3 py-2 text-sm font-medium ${
                          savedViewScope === "mine"
                            ? "bg-[#171717] text-white"
                            : "text-[#8f8f8f]"
                        }`}
                        onClick={() => setSavedViewScope("mine")}
                      >
                        My Views
                      </button>
                    </div>
                  </div>
                </div>
                <EmptySavedViewsState />
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[220px] overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("visibility")}
          >
            {(modelVisibility[contextMenu.modelId] ?? true) ? (
              <EyeOff size={14} aria-hidden />
            ) : (
              <Eye size={14} aria-hidden />
            )}
            {(modelVisibility[contextMenu.modelId] ?? true)
              ? "Hide model"
              : "Show model"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("color")}
          >
            <Palette size={14} aria-hidden />
            Edit color
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("resetColor")}
          >
            <RotateCcw size={14} aria-hidden />
            Reset color
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("move")}
          >
            <Move size={14} aria-hidden />
            Edit position
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("resetMove")}
          >
            <RotateCcw size={14} aria-hidden />
            Reset position
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-[#ebebeb] px-3 py-2 text-left text-sm transition hover:bg-[#f6f6f6]"
            onClick={() => handleContextAction("reprocess")}
          >
            <RefreshCw size={14} aria-hidden />
            {modelsById.get(contextMenu.modelId)
              ? getProcessButtonLabel(
                  modelsById.get(contextMenu.modelId)!,
                  processingModelId === contextMenu.modelId
                )
              : "Process"}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-[#ebebeb] px-3 py-2 text-left text-sm text-[#b42318] transition hover:bg-[#fff1f1]"
            onClick={() => handleContextAction("delete")}
          >
            <Trash2 size={14} aria-hidden />
            Delete model
          </button>
        </div>
      ) : null}

      {positionModalModel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[#ebebeb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#101828]">
                  Edit Position
                </h3>
                <p className="mt-1 truncate text-sm text-[#4d4d4d]">
                  {positionModalModel.originalFileName}
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                aria-label="Close position dialog"
                onClick={() => setPositionModalModelId(null)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="grid grid-cols-3 gap-3">
                {(["x", "y", "z"] as const).map((axis) => (
                  <label key={axis} className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase text-[#8f8f8f]">
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
                      className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#ebebeb] px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] transition hover:bg-[#f6f6f6]"
                onClick={() => {
                  resetModelOffset(positionModalModel.id);
                  setPositionDraft({ x: "0", y: "0", z: "0" });
                }}
              >
                <RotateCcw size={14} aria-hidden />
                Reset position
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] transition hover:bg-[#f6f6f6]"
                  onClick={() => setPositionModalModelId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-[100px] bg-[#171717] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
                  onClick={() => {
                    setModelOffset(positionModalModel.id, {
                      x: normalizeDraftValue(positionDraft.x),
                      y: normalizeDraftValue(positionDraft.y),
                      z: normalizeDraftValue(positionDraft.z)
                    });
                    setPositionModalModelId(null);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {colorModalModel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.18)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[16px] border border-[#ebebeb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#101828]">
                  Edit Color
                </h3>
                <p className="mt-1 truncate text-sm text-[#4d4d4d]">
                  {colorModalModel.originalFileName}
                </p>
              </div>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-[6px] text-[#8f8f8f] transition hover:bg-[#f6f6f6] hover:text-[#171717]"
                aria-label="Close color dialog"
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
                  className="h-14 w-16 rounded border border-[#d0d5dd] bg-white p-1"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#101828]">Model color</div>
                  <div className="mt-1 text-xs text-[#4d4d4d]">
                    Applies to the entire selected IFC model.
                  </div>
                </div>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase text-[#8f8f8f]">
                  Hex
                </span>
                <input
                  type="text"
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  className="h-10 rounded-[6px] border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-[#ebebeb] px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] transition hover:bg-[#f6f6f6]"
                onClick={() => {
                  resetModelColorOverride(colorModalModel.id);
                  setColorDraft("#8b8d95");
                }}
              >
                <RotateCcw size={14} aria-hidden />
                Reset color
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#171717] transition hover:bg-[#f6f6f6]"
                  onClick={() => setColorModalModelId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-[100px] bg-[#171717] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
                  onClick={() => {
                    setModelColorOverride(colorModalModel.id, colorDraft);
                    setColorModalModelId(null);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
