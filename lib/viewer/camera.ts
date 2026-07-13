export type CameraCommand = "fit" | "home" | "focus-selected" | "reset";

export function createCameraCommand(command: CameraCommand) {
  return {
    command,
    requestedAt: Date.now()
  };
}
