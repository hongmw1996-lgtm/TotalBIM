"use client";

import { ViewerCanvas } from "@/components/bim-viewer/ViewerCanvas";
import { ViewerErrorOverlay } from "@/components/bim-viewer/ViewerErrorOverlay";
import { ViewerLoadingOverlay } from "@/components/bim-viewer/ViewerLoadingOverlay";
import { ViewerPropertiesPopup } from "@/components/bim-viewer/ViewerPropertiesPopup";
import { ViewerToolbar } from "@/components/bim-viewer/ViewerToolbar";
import { useViewerStore } from "@/store/viewerStore";

export function BimViewer() {
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden">
      <ViewerCanvas />
      <ViewerToolbar />
      <ViewerPropertiesPopup />
      {isLoading ? <ViewerLoadingOverlay /> : null}
      {error ? <ViewerErrorOverlay message={error} /> : null}
    </div>
  );
}
