export type ExtractedIfcObject = {
  expressId?: number;
  globalId?: string;
  ifcType?: string;
  name?: string;
  objectType?: string;
  storeyName?: string;
  category?: string;
  properties?: Record<string, unknown>;
};

export async function extractIfcObjects(
  filePath: string
): Promise<ExtractedIfcObject[]> {
  void filePath;

  return [];
}
