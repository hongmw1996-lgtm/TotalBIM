import path from "node:path";

const DEFAULT_MAX_UPLOAD_MB = 250;

export function getMaxUploadMb() {
  const configuredSize = Number(process.env.IFC_MAX_UPLOAD_MB);

  return Number.isFinite(configuredSize) && configuredSize > 0
    ? configuredSize
    : DEFAULT_MAX_UPLOAD_MB;
}

export function getMaxUploadBytes() {
  return getMaxUploadMb() * 1024 * 1024;
}

export function getIfcUploadDir() {
  return path.join(process.cwd(), "uploads", "ifc");
}

export function sanitizeIfcFileName(fileName: string) {
  const safeName = path.basename(fileName).replace(/[\\/\0\r\n]/g, "_");
  return safeName.normalize("NFC");
}

export function getBimFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function isIfcFileName(fileName: string) {
  return getBimFileExtension(fileName) === ".ifc";
}

export function isSupportedBimFileName(fileName: string) {
  return [".ifc", ".nwc", ".nwd"].includes(getBimFileExtension(fileName));
}

export function isPathInsideIfcUploadDir(filePath: string) {
  const uploadDir = getIfcUploadDir();
  const relativePath = path.relative(uploadDir, filePath);

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}
