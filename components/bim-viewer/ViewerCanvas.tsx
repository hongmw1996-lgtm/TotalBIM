"use client";

import { Box } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApsViewerEmbed } from "@/components/bim-viewer/ApsViewerEmbed";
import { createFragmentsViewer } from "@/lib/viewer/createFragmentsViewer";
import type { FragmentsViewerRuntime } from "@/lib/viewer/createFragmentsViewer";
import type { ViewerFilterPropertyKey } from "@/lib/viewer/filtering";
import { loadIfcModel } from "@/lib/viewer/loadIfcModel";
import type { IfcLoadSource } from "@/lib/viewer/loadIfcModel";
import { viewerLoadModes } from "@/lib/viewer/loadModes";
import { VIEWER_SELECT_OBJECT_EVENT } from "@/lib/viewer/objectSearch";
import { VIEWER_COMMAND_EVENT, ViewerCommand } from "@/lib/viewer/viewerEvents";
import { useViewerStore } from "@/store/viewerStore";

type ViewerStatus = "idle" | "initializing" | "ready" | "loading" | "error";

function getSelectedPropertyFilters(
  selectedFilterValues: Partial<Record<ViewerFilterPropertyKey, Record<string, boolean>>>
) {
  return Object.fromEntries(
    Object.entries(selectedFilterValues)
      .map(([key, values]) => [
        key,
        Object.entries(values ?? {})
          .filter(([, isSelected]) => isSelected)
          .map(([value]) => value)
      ])
      .filter(([, values]) => values.length > 0)
  ) as Partial<Record<ViewerFilterPropertyKey, string[]>>;
}

export function ViewerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<FragmentsViewerRuntime | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const [, setStatusMessage] = useState("뷰어 준비 완료");
  const [loadedModelIds, setLoadedModelIds] = useState<string[]>([]);
  const [apsSource, setApsSource] = useState<
    Extract<IfcLoadSource, { kind: "aps" }> | null
  >(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const activeModelIds = useViewerStore((state) => state.activeModelIds);
  const modelOffsets = useViewerStore((state) => state.modelOffsets);
  const modelVisibility = useViewerStore((state) => state.modelVisibility);
  const modelColorOverrides = useViewerStore(
    (state) => state.modelColorOverrides
  );
  const activeModelName = useViewerStore((state) => state.activeModelName);
  const activeModelFileUrl = useViewerStore((state) => state.activeModelFileUrl);
  const activeModelObjectCount = useViewerStore(
    (state) => state.activeModelObjectCount
  );
  const loadMode = useViewerStore((state) => state.loadMode);
  const objectSearchQuery = useViewerStore((state) => state.objectSearchQuery);
  const selectedFilterValues = useViewerStore(
    (state) => state.selectedFilterValues
  );
  const clippingPlanes = useViewerStore((state) => state.clippingPlanes);
  const appearance = useViewerStore((state) => state.appearance);
  const setAvailableFilterProperties = useViewerStore(
    (state) => state.setAvailableFilterProperties
  );
  const setError = useViewerStore((state) => state.setError);
  const setLoading = useViewerStore((state) => state.setLoading);
  const setObjectSearchReady = useViewerStore(
    (state) => state.setObjectSearchReady
  );
  const setObjectSearching = useViewerStore((state) => state.setObjectSearching);
  const setObjectSearchResults = useViewerStore(
    (state) => state.setObjectSearchResults
  );
  const setSelectedObject = useViewerStore((state) => state.setSelectedObject);
  const setClippingPlane = useViewerStore((state) => state.setClippingPlane);
  const activeLoadMode = viewerLoadModes.find((mode) => mode.mode === loadMode);

  function getRuntimeErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  useEffect(() => {
    const container = containerRef.current;

    if (!container || runtimeRef.current) {
      return;
    }

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initializeViewer() {
      if (!container) {
        return;
      }

      setStatus("initializing");
      setStatusMessage("Fragments Viewer 초기화 중");

      try {
        const runtime = await createFragmentsViewer({
          container,
          onSelection: setSelectedObject,
          onStatus: setStatusMessage,
          onFilterMetadata: ({ properties }) => {
            setAvailableFilterProperties(properties);
          },
          onClippingPlaneDrag: (face, offset) => {
            setClippingPlane(face, { offset });
          }
        });

        if (!isMounted) {
          await runtime.dispose();
          return;
        }

        runtimeRef.current = runtime;
        resizeObserver = new ResizeObserver(() => runtime.resize());
        resizeObserver.observe(container);
        setStatus("ready");
        setStatusMessage("Fragments Viewer 준비 완료");
        setIsViewerReady(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Fragments Viewer 초기화에 실패했습니다.";
        setStatus("error");
        setStatusMessage(message);
        setError(message);
      }
    }

    void initializeViewer();

    const handleViewerCommand = (event: Event) => {
      const command = (event as CustomEvent<{ command: ViewerCommand }>).detail
        ?.command;
      const runtime = runtimeRef.current;

      if (!command || !runtime) {
        return;
      }

      if (command === "fit") {
        runtime.fit();
      }

      if (command === "home" || command === "reset-camera") {
        runtime.home();
      }

      if (command === "focus-selected") {
        void runtime.focusSelectedObject();
      }

      if (command === "view-top") {
        runtime.setStandardView("top");
      }

      if (command === "view-front") {
        runtime.setStandardView("front");
      }

      if (command === "view-right") {
        runtime.setStandardView("right");
      }
    };

    const handleObjectSelectionRequest = (event: Event) => {
      const detail = (
        event as CustomEvent<{ localId: number; modelId?: string }>
      ).detail;
      const localId = detail?.localId;
      const modelId = detail?.modelId;
      const runtime = runtimeRef.current;

      if (!runtime || typeof localId !== "number") {
        return;
      }

      void runtime.selectObject(localId, modelId);
    };

    window.addEventListener(VIEWER_COMMAND_EVENT, handleViewerCommand);
    window.addEventListener(
      VIEWER_SELECT_OBJECT_EVENT,
      handleObjectSelectionRequest
    );

    return () => {
      isMounted = false;
      loadAbortRef.current?.abort();
      window.removeEventListener(VIEWER_COMMAND_EVENT, handleViewerCommand);
      window.removeEventListener(
        VIEWER_SELECT_OBJECT_EVENT,
        handleObjectSelectionRequest
      );
      resizeObserver?.disconnect();
      void runtimeRef.current?.dispose();
      runtimeRef.current = null;
      setIsViewerReady(false);
    };
  }, [setAvailableFilterProperties, setClippingPlane, setError, setSelectedObject]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || !isViewerReady) {
      return;
    }

    loadAbortRef.current?.abort();
    const abortController = new AbortController();
    loadAbortRef.current = abortController;

    async function loadActiveModel() {
      if (!runtime || activeModelIds.length === 0) {
        await runtime?.clear();
        setLoadedModelIds([]);
        setApsSource(null);
        setObjectSearchReady(false);
        setObjectSearchResults([]);
        setStatus("ready");
        setStatusMessage("왼쪽 목록에서 IFC 모델을 선택하세요.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setLoadedModelIds([]);
      setApsSource(null);
      setObjectSearchReady(false);
      setObjectSearchResults([]);
      setStatus("loading");
      setStatusMessage("모델 로드를 확인하는 중입니다.");

      try {
        const selectedModels = await Promise.all(
          activeModelIds.map((modelId) =>
            loadIfcModel({
              modelId,
              loadMode,
              signal: abortController.signal
            })
          )
        );

        if (abortController.signal.aborted) {
          return;
        }

        const fragmentSources = selectedModels.filter(
          (source) => source.kind === "fragments"
        ) as Extract<typeof selectedModels[number], { kind: "fragments" }>[];
        const apsSources = selectedModels.filter(
          (source) => source.kind === "aps"
        ) as Extract<typeof selectedModels[number], { kind: "aps" }>[];

        if (apsSources.length > 0) {
          await runtime.clear();
          const selectedApsSource = apsSources[apsSources.length - 1];
          setApsSource(selectedApsSource);
          setLoadedModelIds([selectedApsSource.model.id]);
          setObjectSearchReady(false);
          setObjectSearchResults([]);
          setStatus("ready");
          setStatusMessage(
            apsSources.length > 1
              ? "APS Viewer는 현재 NWC/NWD 모델을 한 번에 하나씩 표시합니다."
              : selectedApsSource.reason
          );
          return;
        }

        if (fragmentSources.length > 0) {
          await runtime.clear();
          setApsSource(null);
          setStatusMessage(fragmentSources[fragmentSources.length - 1].reason);
          const nextLoadedModelIds: string[] = [];

          for (const source of fragmentSources) {
            await runtime.loadFragments({
              modelId: source.model.id,
              modelLabel: source.model.originalFileName,
              derivative: source.derivative,
              originalFileUrl: source.model.fileUrl,
              signal: abortController.signal
            });
            nextLoadedModelIds.push(source.model.id);
            const offset = useViewerStore.getState().modelOffsets[source.model.id];
            if (offset) {
              runtime.setModelTransform(source.model.id, offset);
            }
          }

          await runtime.applyClippingPlanes(useViewerStore.getState().clippingPlanes);
          await runtime.applyAppearance(
            useViewerStore.getState().appearance,
            useViewerStore.getState().modelColorOverrides
          );
          await runtime.applyPropertyFilters(
            getSelectedPropertyFilters(
              useViewerStore.getState().selectedFilterValues
            )
          );

          for (const source of fragmentSources) {
            runtime.setModelVisibility(
              source.model.id,
              useViewerStore.getState().modelVisibility[source.model.id] ?? true
            );
          }

          setLoadedModelIds(nextLoadedModelIds);
          setObjectSearchReady(true);
          setStatus("ready");
          return;
        }

        await runtime.clear();
        setApsSource(null);
        setLoadedModelIds([]);
        setObjectSearchReady(false);
        setObjectSearchResults([]);
        setStatus("ready");
        setStatusMessage(
          selectedModels.map((source) => source.reason).join("\n") ||
            "No Fragments derivative is available for the selected model."
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "IFC 모델 로드에 실패했습니다.";
        await runtime.clear();
        setLoadedModelIds([]);
        setApsSource(null);
        setObjectSearchReady(false);
        setObjectSearchResults([]);
        setStatus("error");
        setStatusMessage(message);
        setError(message);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadActiveModel();

    return () => {
      abortController.abort();
    };
  }, [
    activeModelIds,
    isViewerReady,
    loadMode,
    setError,
    setLoading,
    setObjectSearchReady,
    setObjectSearchResults
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || loadedModelIds.length === 0) {
      return;
    }

    void runtime
      .applyPropertyFilters(getSelectedPropertyFilters(selectedFilterValues))
      .catch((error) => {
        setError(
          getRuntimeErrorMessage(error, "Failed to apply the property filter.")
        );
      });
  }, [loadedModelIds, selectedFilterValues, setError]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || loadedModelIds.length === 0) {
      return;
    }

    void runtime.applyClippingPlanes(clippingPlanes).catch((error) => {
      setError(
        getRuntimeErrorMessage(error, "Failed to apply the clipping planes.")
      );
    });
  }, [clippingPlanes, loadedModelIds, setError]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || loadedModelIds.length === 0) {
      return;
    }

    for (const modelId of loadedModelIds) {
      const offset = modelOffsets[modelId];
      if (offset) {
        runtime.setModelTransform(modelId, offset);
      }
    }
  }, [loadedModelIds, modelOffsets]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || loadedModelIds.length === 0) {
      return;
    }

    for (const modelId of loadedModelIds) {
      runtime.setModelVisibility(modelId, modelVisibility[modelId] ?? true);
    }
  }, [loadedModelIds, modelVisibility]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || loadedModelIds.length === 0) {
      return;
    }

    void runtime
      .applyAppearance(appearance, modelColorOverrides)
      .catch((error) => {
        setError(
          getRuntimeErrorMessage(error, "Failed to apply the viewer appearance.")
        );
      });
  }, [appearance, loadedModelIds, modelColorOverrides, setError]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const query = objectSearchQuery.trim();

    if (!runtime || loadedModelIds.length === 0 || query.length === 0) {
      setObjectSearching(false);
      setObjectSearchResults([]);
      return;
    }

    setObjectSearching(true);
    const timer = window.setTimeout(() => {
      const results = runtime.searchObjects(query);
      setObjectSearchResults(results);
      setObjectSearching(false);
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    loadedModelIds,
    objectSearchQuery,
    setObjectSearching,
    setObjectSearchResults
  ]);

  const showEmptyState =
    !apsSource &&
    (activeModelIds.length === 0 ||
      loadMode === "metadata-only" ||
      loadMode === "original-ifc" ||
      status === "error");

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-[#dfe5ec]">
      <div ref={containerRef} className="absolute inset-0" />
      {apsSource ? (
        <ApsViewerEmbed
          urn={apsSource.urn}
          modelName={apsSource.model.originalFileName}
          onError={setError}
        />
      ) : null}

      {showEmptyState ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[linear-gradient(0deg,rgba(32,48,71,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(32,48,71,0.08)_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="flex w-full max-w-[620px] flex-col items-center gap-5 px-6 text-center">
            <div className="flex size-24 items-center justify-center rounded-md border border-[#b9c2cf] bg-white/95 shadow-sm">
              <Box size={42} className="text-[#203047]" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#171a1f]">
                Fragments BIM Viewer
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5a6678]">
                {activeModelName
                  ? `${activeModelName} 모델을 ${activeLoadMode?.label ?? loadMode} 방식으로 준비했습니다.`
                  : "왼쪽 목록에서 모델을 선택하면 Fragments 파생 파일을 우선 로드합니다."}
              </p>
              {activeModelFileUrl ? (
                <p className="mt-2 text-xs leading-5 text-[#647083]">
                  원본 API: {activeModelFileUrl} · 객체 {activeModelObjectCount}개
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
