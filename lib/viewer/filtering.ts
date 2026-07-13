export type ViewerFilterPropertyKey = "type" | "name" | "id" | "level";

export type ViewerFilterValueOption = {
  value: string;
  label: string;
  count: number;
};

export type ViewerFilterPropertyOption = {
  key: ViewerFilterPropertyKey;
  label: string;
  values: ViewerFilterValueOption[];
};

export type ViewerFilterMetadata = {
  properties: ViewerFilterPropertyOption[];
};
