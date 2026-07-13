"use client";

import {
  ArrowRight,
  ArrowUp,
  Check,
  Crosshair,
  Eye,
  Home,
  Maximize2,
  RotateCcw,
  Scissors,
  Square,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  dispatchViewerCommand,
  type ViewerCommand
} from "@/lib/viewer/viewerEvents";
import { useViewerStore } from "@/store/viewerStore";

const tools: Array<{
  label: string;
  command: ViewerCommand;
  icon: typeof Home;
}> = [
  { label: "홈 뷰", command: "home", icon: Home },
  { label: "전체 맞춤", command: "fit", icon: Maximize2 },
  { label: "선택 객체 맞춤", command: "focus-selected", icon: Crosshair },
  { label: "상단 뷰", command: "view-top", icon: ArrowUp },
  { label: "정면 뷰", command: "view-front", icon: Square },
  { label: "우측 뷰", command: "view-right", icon: ArrowRight },
  { label: "카메라 초기화", command: "reset-camera", icon: RotateCcw }
];

const viewModeOptions = [
  { value: "rendered", label: "Rendered" },
  { value: "shaded", label: "Shaded" },
  { value: "grey", label: "Grey" }
] as const;

const floatingPanelClass =
  "rounded-[16px] border border-[#ebebeb] bg-white text-[#171717] shadow-[0_8px_24px_rgba(0,0,0,0.06)]";

const iconButtonClass =
  "flex size-10 items-center justify-center rounded-[6px] text-[#4d4d4d] transition hover:bg-[#f6f6f6] hover:text-[#171717]";

export function ViewerToolbar() {
  const appearance = useViewerStore((state) => state.appearance);
  const clippingPlanes = useViewerStore((state) => state.clippingPlanes);
  const setAppearance = useViewerStore((state) => state.setAppearance);
  const setClippingBoxEnabled = useViewerStore(
    (state) => state.setClippingBoxEnabled
  );
  const resetClippingPlanes = useViewerStore(
    (state) => state.resetClippingPlanes
  );
  const [openPanel, setOpenPanel] = useState<"modes" | "clipping" | null>(null);

  const hasClipping = useMemo(
    () => Object.values(clippingPlanes).some((plane) => plane.enabled),
    [clippingPlanes]
  );

  return (
    <>
      {openPanel === "modes" ? (
        <div className="absolute bottom-20 left-1/2 z-20 w-[min(92vw,560px)] -translate-x-1/2">
          <div className={`${floatingPanelClass} p-3`}>
            <div className="flex flex-wrap items-center gap-2">
              {viewModeOptions.map((option) => {
                const isActive = appearance.viewMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-[100px] px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#171717] text-white"
                        : "border border-[#ebebeb] bg-white text-[#4d4d4d] hover:bg-[#f6f6f6]"
                    }`}
                    onClick={() => setAppearance({ viewMode: option.value })}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`mt-3 flex items-center justify-between px-4 py-3 ${floatingPanelClass}`}
          >
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Eye size={16} aria-hidden />
              뷰 모드
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[100px] bg-[#171717] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
              onClick={() => setOpenPanel(null)}
            >
              <Check size={15} aria-hidden />
              완료
            </button>
          </div>
        </div>
      ) : null}

      {openPanel === "clipping" ? (
        <div className="absolute bottom-20 left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2">
          <div className={`${floatingPanelClass} p-4`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Section Box</p>
                <p className="mt-1 text-xs leading-5 text-[#8f8f8f]">
                  Section Box를 켠 뒤 뷰어 안의 화살표를 직접 드래그해서
                  단면 위치를 조절합니다.
                </p>
              </div>
              <button
                type="button"
                className={iconButtonClass}
                aria-label="단면 패널 닫기"
                onClick={() => setOpenPanel(null)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-[100px] px-4 py-2 text-sm font-semibold transition ${
                  hasClipping
                    ? "bg-[#171717] text-white"
                    : "border border-[#ebebeb] bg-white text-[#4d4d4d] hover:bg-[#f6f6f6]"
                }`}
                onClick={() => setClippingBoxEnabled(!hasClipping)}
              >
                {hasClipping ? "Section Box 끄기" : "Section Box 켜기"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[100px] border border-[#ebebeb] bg-white px-4 py-2 text-sm font-semibold text-[#4d4d4d] transition hover:bg-[#f6f6f6]"
                onClick={resetClippingPlanes}
              >
                <RotateCcw size={14} aria-hidden />
                초기화
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[100px] bg-[#171717] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
                onClick={() => setOpenPanel(null)}
              >
                <Check size={15} aria-hidden />
                완료
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-20">
        <div
          className={`flex items-center gap-1 border border-[#ebebeb] bg-white px-2 py-2 ${floatingPanelClass}`}
        >
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.command}
                type="button"
                className={iconButtonClass}
                title={tool.label}
                aria-label={tool.label}
                onClick={() => dispatchViewerCommand(tool.command)}
              >
                <Icon size={17} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div
          className={`flex items-center gap-1 border border-[#ebebeb] bg-white px-2 py-2 ${floatingPanelClass}`}
        >
          <button
            type="button"
            className={`flex size-10 items-center justify-center rounded-[6px] transition ${
              openPanel === "clipping"
                ? "bg-[#171717] text-white"
                : hasClipping
                  ? "text-[#171717] hover:bg-[#f6f6f6]"
                  : "text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
            }`}
            title="Section Box"
            aria-label="Section Box"
            onClick={() =>
              setOpenPanel((value) => (value === "clipping" ? null : "clipping"))
            }
          >
            <Scissors size={17} aria-hidden />
          </button>

          <button
            type="button"
            className={`flex size-10 items-center justify-center rounded-[6px] transition ${
              openPanel === "modes"
                ? "bg-[#171717] text-white"
                : "text-[#4d4d4d] hover:bg-[#f6f6f6] hover:text-[#171717]"
            }`}
            title="뷰 모드"
            aria-label="뷰 모드"
            onClick={() =>
              setOpenPanel((value) => (value === "modes" ? null : "modes"))
            }
          >
            <Eye size={17} aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
