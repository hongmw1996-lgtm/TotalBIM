export type IfcMetadata = {
  schema?: string;
  projectName?: string;
  siteName?: string;
  buildingName?: string;
};

export async function parseIfcMetadata(filePath: string): Promise<IfcMetadata> {
  void filePath;

  return {};
}
