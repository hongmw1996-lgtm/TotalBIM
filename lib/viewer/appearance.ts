export type ViewerViewMode = "rendered" | "shaded" | "grey";

export type ViewerAppearanceSettings = {
  viewMode: ViewerViewMode;
  showGrid: boolean;
};

export const defaultViewerAppearance: ViewerAppearanceSettings = {
  viewMode: "rendered",
  showGrid: true
};
