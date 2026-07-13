"use client";

import { PanelSection } from "@/components/bim-sidebar/PanelSection";
import { viewerLoadModes } from "@/lib/viewer/loadModes";
import { useViewerStore } from "@/store/viewerStore";

export function LoadModePanel() {
  const loadMode = useViewerStore((state) => state.loadMode);
  const setLoadMode = useViewerStore((state) => state.setLoadMode);

  return (
    <PanelSection title="로드 방식">
      <div className="grid grid-cols-2 gap-2">
        {viewerLoadModes.map((mode) => (
          <button
            key={mode.mode}
            type="button"
            className={`rounded-md border px-3 py-2 text-left text-xs transition ${
              loadMode === mode.mode
                ? "border-[#203047] bg-[#eef1f4] text-[#203047]"
                : "border-[#d8dde6] bg-white text-[#3d4858] hover:bg-[#f6f7f9]"
            }`}
            title={mode.description}
            onClick={() => setLoadMode(mode.mode)}
          >
            <span className="block font-medium">{mode.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#647083]">
        대용량 IFC는 원본을 바로 열지 않고 경량 Fragments 파생 파일을 먼저
        사용합니다. 층별/카테고리 파생 파일이 없으면 전체 Fragments로
        대체합니다.
      </p>
    </PanelSection>
  );
}
