"use client";

import { Grid3X3, Palette } from "lucide-react";
import { PanelSection } from "@/components/bim-sidebar/PanelSection";
import { useViewerStore } from "@/store/viewerStore";

const viewModeOptions = [
  { value: "rendered", label: "Rendered" },
  { value: "shaded", label: "Shaded" },
  { value: "grey", label: "Grey" }
] as const;

export function AppearancePanel() {
  const appearance = useViewerStore((state) => state.appearance);
  const setAppearance = useViewerStore((state) => state.setAppearance);

  return (
    <PanelSection title="표시 스타일">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs leading-5 text-[#647083]">
          <Palette size={15} aria-hidden />
          Speckle 방식의 뷰 모드를 선택합니다.
        </div>

        <div className="grid grid-cols-3 gap-2">
          {viewModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-md border px-3 py-2 text-left text-xs font-medium transition ${
                appearance.viewMode === option.value
                  ? "border-[#203047] bg-[#eef1f4] text-[#203047]"
                  : "border-[#d8dde6] bg-white text-[#3d4858] hover:bg-[#f6f7f9]"
              }`}
              onClick={() => setAppearance({ viewMode: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border border-[#d8dde6] bg-white px-3 py-2 text-sm text-[#263142]">
          <span className="inline-flex items-center gap-2">
            <Grid3X3 size={15} aria-hidden />
            기준 그리드
          </span>
          <input
            type="checkbox"
            checked={appearance.showGrid}
            onChange={(event) =>
              setAppearance({ showGrid: event.target.checked })
            }
            className="size-4 accent-[#203047]"
          />
        </label>
      </div>
    </PanelSection>
  );
}
