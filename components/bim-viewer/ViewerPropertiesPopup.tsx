"use client";

import { Info, PanelRight, X } from "lucide-react";
import { useState } from "react";
import { ObjectPropertiesPanel } from "@/components/bim-properties/ObjectPropertiesPanel";
import { useViewerStore } from "@/store/viewerStore";

export function ViewerPropertiesPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const selectedObjectCount = useViewerStore((state) => state.selectedObjectCount);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="absolute right-4 top-4 z-20 inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d8dde6] bg-white px-4 text-sm font-medium text-[#263142] shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-[#f8fafc]"
        onClick={() => setIsOpen(true)}
      >
        <PanelRight size={17} aria-hidden />
        Selection info
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-20 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-[#d8dde6] bg-[rgba(255,255,255,0.96)] shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-[#e6eaf0] px-4 py-3">
        <div className="inline-flex min-w-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-[#eef4ff] text-[#2563eb]">
            <Info size={16} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#263142]">Selection info</p>
            <p className="text-xs text-[#667085]">
              {selectedObjectCount > 0
                ? `${selectedObjectCount} selected`
                : "Select an object"}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#111827]"
          aria-label="Close selection info"
          onClick={() => setIsOpen(false)}
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      <div className="max-h-[calc(100vh-9rem)] overflow-y-auto bg-[rgba(255,255,255,0.96)]">
        <ObjectPropertiesPanel className="[&>div:first-child]:hidden" />
      </div>
    </div>
  );
}
