export type ClippingAxis = "x" | "y" | "z";

export type ClippingSide = "min" | "max";

export type ClippingFace =
  | "xMin"
  | "xMax"
  | "yMin"
  | "yMax"
  | "zMin"
  | "zMax";

export type ClippingPlaneState = {
  face: ClippingFace;
  axis: ClippingAxis;
  side: ClippingSide;
  enabled: boolean;
  offset: number;
};

export const defaultClippingPlanes: ClippingPlaneState[] = [
  { face: "xMin", axis: "x", side: "min", enabled: false, offset: -100 },
  { face: "xMax", axis: "x", side: "max", enabled: false, offset: 100 },
  { face: "yMin", axis: "y", side: "min", enabled: false, offset: -100 },
  { face: "yMax", axis: "y", side: "max", enabled: false, offset: 100 },
  { face: "zMin", axis: "z", side: "min", enabled: false, offset: -100 },
  { face: "zMax", axis: "z", side: "max", enabled: false, offset: 100 }
];
