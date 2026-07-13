import type {
  CameraController as CameraControllerType,
  FilteringExtension as FilteringExtensionType,
  SelectionExtension as SelectionExtensionType,
  Viewer as ViewerType
} from "@speckle/viewer";

export type ViewerHost = {
  container: HTMLElement;
};

export type SpeckleViewerRuntime = {
  viewer: ViewerType;
  camera: CameraControllerType;
  selection: SelectionExtensionType;
  filtering: FilteringExtensionType;
};

export async function createViewer({
  container
}: ViewerHost): Promise<SpeckleViewerRuntime> {
  if (typeof window === "undefined") {
    throw new Error("Viewer initialization must run in a client component.");
  }

  const {
    CameraController,
    DefaultViewerParams,
    FilteringExtension,
    SelectionExtension,
    Viewer
  } = await import("@speckle/viewer");

  const viewer = new Viewer(container, {
    ...DefaultViewerParams,
    showStats: false,
    verbose: false,
    restrictInputToCanvas: true
  });

  await viewer.init();

  const camera = viewer.createExtension(CameraController);
  const selection = viewer.createExtension(SelectionExtension);
  const filtering = viewer.createExtension(FilteringExtension);

  camera.default();
  viewer.resize();
  viewer.requestRender();

  return {
    viewer,
    camera,
    selection,
    filtering
  };
}
