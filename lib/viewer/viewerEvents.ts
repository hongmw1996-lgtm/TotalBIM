export type ViewerCommand =
  | "home"
  | "fit"
  | "reset-camera"
  | "focus-selected"
  | "view-top"
  | "view-front"
  | "view-right";

export const VIEWER_COMMAND_EVENT = "bim-viewer:command";

export function dispatchViewerCommand(command: ViewerCommand) {
  window.dispatchEvent(
    new CustomEvent<{ command: ViewerCommand }>(VIEWER_COMMAND_EVENT, {
      detail: {
        command
      }
    })
  );
}
