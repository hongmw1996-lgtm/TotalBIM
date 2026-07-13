export type ViewerObjectSearchResult = {
  modelId: string;
  modelLabel: string | null;
  localId: number;
  objectId: string;
  name: string | null;
  globalId: string | null;
  ifcType: string | null;
};

export const VIEWER_SELECT_OBJECT_EVENT = "ifc-viewer:select-object";

export function requestViewerObjectSelection(localId: number, modelId?: string) {
  window.dispatchEvent(
    new CustomEvent<{ localId: number; modelId?: string }>(
      VIEWER_SELECT_OBJECT_EVENT,
      {
        detail: { localId, modelId }
      }
    )
  );
}
