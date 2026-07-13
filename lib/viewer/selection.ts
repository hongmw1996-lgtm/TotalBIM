export type ViewerSelection = {
  objectId: string | null;
  expressId: number | null;
  globalId: string | null;
};

export function normalizeSelection(selection: Partial<ViewerSelection>) {
  return {
    objectId: selection.objectId ?? null,
    expressId: selection.expressId ?? null,
    globalId: selection.globalId ?? null
  };
}
