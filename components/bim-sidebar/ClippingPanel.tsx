"use client";

import { RotateCcw, Scissors } from "lucide-react";
import { PanelSection } from "@/components/bim-sidebar/PanelSection";
import { useViewerStore } from "@/store/viewerStore";

export function ClippingPanel() {
  const clippingPlanes = useViewerStore((state) => state.clippingPlanes);
  const setClippingBoxEnabled = useViewerStore(
    (state) => state.setClippingBoxEnabled
  );
  const resetClippingPlanes = useViewerStore(
    (state) => state.resetClippingPlanes
  );
  const hasClipping = Object.values(clippingPlanes).some(
    (plane) => plane.enabled
  );

  return (
    <PanelSection title="단면">
      <div className="mb-3 flex items-start gap-2 text-xs leading-5 text-[#647083]">
        <Scissors size={15} className="mt-0.5 shrink-0" aria-hidden />
        Section Box를 켠 뒤 뷰어 안의 화살표를 직접 드래그해서 단면 위치를
        조절합니다.
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`h-8 rounded-md px-3 text-xs font-medium transition ${
            hasClipping
              ? "bg-[#203047] text-white"
              : "border border-[#d8dde6] bg-white text-[#203047] hover:bg-[#eef1f4]"
          }`}
          onClick={() => setClippingBoxEnabled(!hasClipping)}
        >
          {hasClipping ? "Section Box 끄기" : "Section Box 켜기"}
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-[#203047] transition hover:bg-[#eef1f4]"
          onClick={resetClippingPlanes}
        >
          <RotateCcw size={14} aria-hidden />
          초기화
        </button>
      </div>
    </PanelSection>
  );
}
