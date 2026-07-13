import type { SpatialTreeItem } from "@thatopen/fragments";
import type { IfcDerivativeSummary } from "@/lib/viewer/loadIfcModel";
import { ViewerAppearanceSettings } from "@/lib/viewer/appearance";
import type {
  ClippingAxis,
  ClippingFace,
  ClippingPlaneState
} from "@/lib/viewer/clipping";
import type {
  ViewerFilterMetadata,
  ViewerFilterPropertyKey,
  ViewerFilterPropertyOption
} from "@/lib/viewer/filtering";
import {
  buildIfcMaterialIndex,
  buildIfcObjectPropertyIndex,
  type IfcMaterialIndex,
  type IfcObjectPropertyIndex
} from "@/lib/viewer/ifcMaterialIndex";
import type { ViewerObjectSearchResult } from "@/lib/viewer/objectSearch";

type SelectionPayload = {
  selectedObjectId: string | null;
  selectedObjectCount: number;
  selectedObjectTypeCounts: Array<{ ifcType: string; count: number }>;
  selectedExpressId: number | null;
  selectedGlobalId: string | null;
  selectedIfcType: string | null;
  selectedObjectName: string | null;
  selectedProperties: Record<string, unknown> | null;
};

type FragmentsViewerHost = {
  container: HTMLElement;
  onSelection?: (selection: SelectionPayload | null) => void;
  onStatus?: (status: string) => void;
  onFilterMetadata?: (metadata: ViewerFilterMetadata) => void;
  onClippingPlaneDrag?: (face: ClippingFace, offset: number) => void;
};

type LoadFragmentsInput = {
  modelId: string;
  modelLabel?: string;
  derivative: IfcDerivativeSummary;
  originalFileUrl?: string;
  signal?: AbortSignal;
};

type ModelOffset = { x: number; y: number; z: number };

type SearchIndexItem = ViewerObjectSearchResult & {
  text: string;
};

type ModelFilterIndex = {
  geometryLocalIds: number[];
  propertyLocalIds: Map<ViewerFilterPropertyKey, Map<string, number[]>>;
  searchIndex: SearchIndexItem[];
};

type StandardView = "top" | "front" | "right";

const clippingFaceOrder: ClippingFace[] = [
  "xMin",
  "xMax",
  "yMin",
  "yMax",
  "zMin",
  "zMax"
];

function readAttribute(data: Record<string, unknown>, name: string) {
  const value = data[name];

  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    Object.prototype.hasOwnProperty.call(value, "value")
  ) {
    return (value as { value: unknown }).value;
  }

  return value;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeCategory(category: string | null) {
  return category?.trim() ?? "";
}

export type FragmentsViewerRuntime = Awaited<
  ReturnType<typeof createFragmentsViewer>
>;

export async function createFragmentsViewer({
  container,
  onSelection,
  onStatus,
  onFilterMetadata,
  onClippingPlaneDrag
}: FragmentsViewerHost) {
  if (typeof window === "undefined") {
    throw new Error("Fragments viewer must run in a browser.");
  }

  const THREE = await import("three");
  const { OrbitControls } = await import(
    "three/examples/jsm/controls/OrbitControls.js"
  );
  const { RoomEnvironment } = await import(
    "three/examples/jsm/environments/RoomEnvironment.js"
  );
  const FRAGS = await import("@thatopen/fragments");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d6dee8");
  const clippingOverlayScene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
  camera.position.set(30, 24, 30);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor("#d6dee8");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environmentMap.texture;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableZoom = true;
  controls.screenSpacePanning = true;
  controls.target.set(0, 0, 0);
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.RIGHT = null;
  controls.mouseButtons.MIDDLE = null;

  let middleDragStart: { x: number; y: number; mode: "pan" | "orbit" } | null =
    null;

  function handleCanvasMouseDown(event: MouseEvent) {
    if (event.button === 1) {
      middleDragStart = {
        x: event.clientX,
        y: event.clientY,
        mode: event.shiftKey ? "orbit" : "pan"
      };
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (beginClippingPlaneDrag(event)) {
      selectionDragStart = null;
      isSelectionDragging = false;
      event.preventDefault();
      return;
    }

    selectionDragStart = { x: event.clientX, y: event.clientY };
    isSelectionDragging = false;
  }

  function handleCanvasAuxClick(event: MouseEvent) {
    if (event.button === 1) {
      event.preventDefault();
    }
  }

  function panCamera(deltaX: number, deltaY: number) {
    const offset = camera.position.clone().sub(controls.target);
    const targetDistance =
      offset.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const element = renderer.domElement;
    const panX = (2 * deltaX * targetDistance) / Math.max(element.clientHeight, 1);
    const panY = (2 * deltaY * targetDistance) / Math.max(element.clientHeight, 1);
    const pan = new THREE.Vector3();
    const up = camera.up.clone().setLength(panY);
    const right = new THREE.Vector3()
      .setFromMatrixColumn(camera.matrix, 0)
      .setLength(-panX);

    pan.copy(right).add(up);
    camera.position.add(pan);
    controls.target.add(pan);
    camera.lookAt(controls.target);
    needsFragmentsUpdate = true;
  }

  function orbitCamera(deltaX: number, deltaY: number) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta -= (2 * Math.PI * deltaX) / Math.max(renderer.domElement.clientWidth, 1);
    spherical.phi -= (Math.PI * deltaY) / Math.max(renderer.domElement.clientHeight, 1);
    spherical.makeSafe();
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    needsFragmentsUpdate = true;
  }

  scene.add(new THREE.AmbientLight("#ffffff", 0.5));

  const skyLight = new THREE.HemisphereLight("#e7eef8", "#c8d0da", 0.9);
  scene.add(skyLight);

  const keyLight = new THREE.DirectionalLight("#ffffff", 1.55);
  keyLight.position.set(34, 46, 30);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.radius = 3;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight.target);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight("#d5e3f4", 0.45);
  fillLight.position.set(-20, 16, -26);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight("#c9d8ec", 0.28);
  rimLight.position.set(14, 26, -22);
  scene.add(rimLight);

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({
      color: new THREE.Color("#000000"),
      opacity: 0.14
    })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = false;
  scene.add(shadowCatcher);

  const grid = new THREE.GridHelper(80, 40, "#8d98a8", "#c1cad5");
  grid.position.y = -0.02;
  const gridMaterials = Array.isArray(grid.material)
    ? grid.material
    : [grid.material];
  for (const material of gridMaterials) {
    material.transparent = true;
    material.opacity = 0.85;
  }
  scene.add(grid);
  const shadowMaterial =
    shadowCatcher.material as InstanceType<typeof THREE.ShadowMaterial>;

  const clippingBoxGroup = new THREE.Group();
  clippingBoxGroup.visible = false;
  clippingOverlayScene.add(clippingBoxGroup);

  const clippingBoxHelper = new THREE.Box3Helper(
    new THREE.Box3(),
    new THREE.Color("#171717")
  );
  clippingBoxGroup.add(clippingBoxHelper);

  const clippingFaceMeshes = new Map<
    ClippingFace,
    InstanceType<typeof THREE.Mesh>
  >();
  const clippingArrowGroups = new Map<
    ClippingFace,
    InstanceType<typeof THREE.Group>
  >();
  const clippingFaceMaterial = new THREE.MeshBasicMaterial({
    color: "#2f6fed",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const clippingHandleMaterial = new THREE.MeshBasicMaterial({
    color: "#171717",
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  function createClippingArrowHandle(face: ClippingFace) {
    const group = new THREE.Group();
    group.name = `section-box-arrow-${face}`;
    group.userData.clippingFace = face;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.72, 16),
      clippingHandleMaterial.clone()
    );
    shaft.position.y = 0.36;
    shaft.userData.clippingFace = face;
    group.add(shaft);

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.32, 24),
      clippingHandleMaterial.clone()
    );
    head.position.y = 0.88;
    head.userData.clippingFace = face;
    group.add(head);

    return group;
  }

  for (const face of clippingFaceOrder) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      clippingFaceMaterial.clone()
    );
    mesh.name = `section-box-${face}`;
    mesh.userData.clippingFace = face;
    clippingFaceMeshes.set(face, mesh);
    clippingBoxGroup.add(mesh);

    const arrow = createClippingArrowHandle(face);
    clippingArrowGroups.set(face, arrow);
    clippingBoxGroup.add(arrow);
  }

  type FragmentsModel = InstanceType<typeof FRAGS.FragmentsModel>;
  const fragments = new FRAGS.FragmentsModels("/api/fragments/worker");
  let currentModel: FragmentsModel | null = null;
  const loadedModels: FragmentsModel[] = [];
  const loadedModelIds: string[] = [];
  const materialIndexByModelId = new Map<string, Promise<IfcMaterialIndex>>();
  const propertyIndexByModelId = new Map<string, Promise<IfcObjectPropertyIndex>>();
  const materialIndexCacheByModelId = new Map<string, IfcMaterialIndex>();
  const propertyIndexCacheByModelId = new Map<string, IfcObjectPropertyIndex>();
  const filterIndexByModelId = new Map<string, ModelFilterIndex>();
  const modelLabelsById = new Map<string, string>();
  const modelTransforms = new Map<string, ModelOffset>();
  const geometryIdsByModel = new Map<FragmentsModel, number[]>();
  const geometryBoxesByModel = new Map<
    FragmentsModel,
    Array<InstanceType<typeof THREE.Box3>>
  >();
  let activeClippingPlanes: InstanceType<typeof THREE.Plane>[] = [];
  let activeClippingState: Record<ClippingFace, ClippingPlaneState> | null =
    null;
  let clippingDragStart:
    | {
        face: ClippingFace;
        startOffset: number;
        startPoint: InstanceType<typeof THREE.Vector3>;
        dragPlane: InstanceType<typeof THREE.Plane>;
        axisVector: InstanceType<typeof THREE.Vector3>;
        halfSize: number;
      }
    | null = null;
  let selectedLocalId: number | null = null;
  const selectedLocalIdsByModelId = new Map<string, Set<number>>();
  const ghostedLocalIdsByModelId = new Map<string, Set<number>>();
  let activePropertyFilterValues: Partial<
    Record<ViewerFilterPropertyKey, string[]>
  > = {};
  let selectionDragStart: { x: number; y: number } | null = null;
  let isSelectionDragging = false;
  let animationFrame = 0;
  let isDisposed = false;
  let needsFragmentsUpdate = false;
  let fragmentsVersion = 0;

  const selectionBox = document.createElement("div");
  selectionBox.style.position = "absolute";
  selectionBox.style.display = "none";
  selectionBox.style.pointerEvents = "none";
  selectionBox.style.border = "1px dashed #2f6fed";
  selectionBox.style.background = "rgba(47, 111, 237, 0.12)";
  selectionBox.style.zIndex = "5";
  container.appendChild(selectionBox);

  const ghostFilterColor = new THREE.Color("#b8b8b8");
  const ghostFilterOpacity = 0.14;

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    needsFragmentsUpdate = true;
  }

  function focusCameraOnBox(
    box: InstanceType<typeof THREE.Box3>,
    direction = new THREE.Vector3(1, 0.72, 1).normalize()
  ) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const distance =
      maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    camera.position.copy(center).add(direction.multiplyScalar(distance * 1.35));
    camera.near = Math.max(distance / 1000, 0.1);
    camera.far = Math.max(distance * 20, 1000);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
    needsFragmentsUpdate = true;
  }

  function getCurrentModelBox() {
    if (loadedModels.length === 0) {
      return null;
    }

    const union = new THREE.Box3();

    for (const model of loadedModels) {
      const box = model.box.clone();

      if (box.isEmpty()) {
        box.setFromObject(model.object);
      }

      box.translate(model.object.position);

      if (!box.isEmpty()) {
        union.union(box);
      }
    }

    return union.isEmpty() ? null : union;
  }

  function fitCameraToCurrentModel() {
    const box = getCurrentModelBox();

    if (!box) {
      shadowCatcher.visible = false;
      return;
    }

    camera.up.set(0, 1, 0);
    updateGroundPlane(box);
    focusCameraOnBox(box);
  }

  function updateGroundPlane(box: InstanceType<typeof THREE.Box3>) {
    if (box.isEmpty()) {
      shadowCatcher.visible = false;
      return;
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const largestHorizontalSpan = Math.max(size.x, size.z, 12);
    const planeSize = largestHorizontalSpan * 2.4;
    const groundY = box.min.y - Math.max(largestHorizontalSpan * 0.0025, 0.02);
    const shadowSpan = Math.max(largestHorizontalSpan * 1.1, 20);

    shadowCatcher.visible = true;
    shadowCatcher.position.set(center.x, groundY, center.z);
    shadowCatcher.scale.set(planeSize, planeSize, 1);

    grid.position.y = groundY + 0.002;

    keyLight.target.position.set(center.x, center.y, center.z);
    keyLight.shadow.camera.left = -shadowSpan;
    keyLight.shadow.camera.right = shadowSpan;
    keyLight.shadow.camera.top = shadowSpan;
    keyLight.shadow.camera.bottom = -shadowSpan;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = Math.max(size.y * 4, 120);
    keyLight.shadow.camera.updateProjectionMatrix();
  }

  async function getGeometryIdsForModel(model: FragmentsModel) {
    const cached = geometryIdsByModel.get(model);

    if (cached) {
      return cached;
    }

    const ids = await model.getItemsIdsWithGeometry();
    geometryIdsByModel.set(model, ids);
    return ids;
  }

  function getLoadedModel(modelId: string) {
    return loadedModels[loadedModelIds.indexOf(modelId)] ?? null;
  }

  function getAllSearchIndex() {
    return [...filterIndexByModelId.values()].flatMap((index) => index.searchIndex);
  }

  function emitFilterMetadata() {
    const propertyCounts = new Map<
      ViewerFilterPropertyKey,
      Map<string, number>
    >();

    for (const filterIndex of filterIndexByModelId.values()) {
      for (const [propertyKey, values] of filterIndex.propertyLocalIds) {
        const counts = propertyCounts.get(propertyKey) ?? new Map<string, number>();

        for (const [value, ids] of values) {
          counts.set(value, (counts.get(value) ?? 0) + ids.length);
        }

        propertyCounts.set(propertyKey, counts);
      }
    }

    const labelByPropertyKey: Record<ViewerFilterPropertyKey, string> = {
      type: "type",
      name: "name",
      id: "id",
      level: "level"
    };

    const properties: ViewerFilterPropertyOption[] = [...propertyCounts.entries()]
      .map(([key, counts]) => ({
        key,
        label: labelByPropertyKey[key],
        values: [...counts.entries()]
          .map(([value, count]) => ({
            value,
            label: value,
            count
          }))
          .sort((left, right) => {
            if (right.count !== left.count) {
              return right.count - left.count;
            }

            return left.label.localeCompare(right.label);
          })
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    onFilterMetadata?.({ properties });
  }

  function loadMaterialIndex(modelId: string, originalFileUrl?: string) {
    if (!originalFileUrl) {
      return;
    }

    if (materialIndexByModelId.has(modelId) && propertyIndexByModelId.has(modelId)) {
      return;
    }

    const ifcTextPromise = fetch(originalFileUrl, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to read indexed data from the source IFC file.");
          }

          return response.text();
        })
        .catch(() => "");

    if (!materialIndexByModelId.has(modelId)) {
      materialIndexByModelId.set(
        modelId,
        ifcTextPromise.then((ifcText) =>
          ifcText ? buildIfcMaterialIndex(ifcText) : new Map()
        ).then((index) => {
          materialIndexCacheByModelId.set(modelId, index);
          return index;
        })
      );
    }

    if (!propertyIndexByModelId.has(modelId)) {
      propertyIndexByModelId.set(
        modelId,
        ifcTextPromise.then((ifcText) =>
          ifcText ? buildIfcObjectPropertyIndex(ifcText) : new Map()
        ).then((index) => {
          propertyIndexCacheByModelId.set(modelId, index);
          if (currentModel?.modelId === modelId && selectedLocalId !== null) {
            void selectLocalId(selectedLocalId, currentModel);
          }
          return index;
        })
      );
    }
  }

  function getMaterialNamesForSelection(modelId: string, expressId: number | null) {
    if (expressId === null) {
      return [];
    }

    return materialIndexCacheByModelId.get(modelId)?.get(expressId) ?? [];
  }

  function getRawPropertiesForSelection(
    modelId: string,
    expressId: number | null
  ) {
    if (expressId === null) {
      return {};
    }

    return propertyIndexCacheByModelId.get(modelId)?.get(expressId) ?? {};
  }

  function applyModelTransform(modelId: string) {
    const model = loadedModels[loadedModelIds.indexOf(modelId)];
    const offset = modelTransforms.get(modelId);

    if (!model || !offset) {
      return;
    }

    model.object.position.set(offset.x, offset.y, offset.z);
    needsFragmentsUpdate = true;
  }

  function isLoadedModel(model: FragmentsModel | null | undefined): model is FragmentsModel {
    return model !== null && model !== undefined && loadedModels.includes(model);
  }

  function isModelNotFoundError(error: unknown) {
    return error instanceof Error && error.message.includes("Model not found");
  }

  function canIgnoreModelError(
    error: unknown,
    model?: FragmentsModel | null,
    version?: number
  ) {
    if (!isModelNotFoundError(error)) {
      return false;
    }

    if (isDisposed) {
      return true;
    }

    if (typeof version === "number" && version !== fragmentsVersion) {
      return true;
    }

    if (model && !loadedModels.includes(model)) {
      return true;
    }

    return false;
  }

  async function updateFragments(force = false, version = fragmentsVersion) {
    try {
      await fragments.update(force);
    } catch (error) {
      if (canIgnoreModelError(error, undefined, version)) {
        return;
      }

      throw error;
    }
  }

  function setStandardView(view: StandardView) {
    const box = getCurrentModelBox();

    if (!box) {
      return;
    }

    if (view === "top") {
      camera.up.set(0, 0, -1);
      focusCameraOnBox(box, new THREE.Vector3(0, 1, 0));
      return;
    }

    camera.up.set(0, 1, 0);

    if (view === "front") {
      focusCameraOnBox(box, new THREE.Vector3(0, 0.05, 1).normalize());
      return;
    }

    focusCameraOnBox(box, new THREE.Vector3(1, 0.05, 0).normalize());
  }

  async function focusSelectedObject() {
    const model = currentModel;

    if (!isLoadedModel(model) || selectedLocalId === null) {
      fitCameraToCurrentModel();
      return;
    }

    try {
      const box = await model.getMergedBox([selectedLocalId]);

      if (box.isEmpty()) {
        fitCameraToCurrentModel();
        return;
      }

      camera.up.set(0, 1, 0);
      focusCameraOnBox(box);
      await updateFragments(true);
    } catch (error) {
      if (canIgnoreModelError(error, model)) {
        fitCameraToCurrentModel();
        return;
      }

      throw error;
    }
  }

  function getAxisVector(axis: ClippingAxis) {
    if (axis === "x") {
      return new THREE.Vector3(1, 0, 0);
    }

    if (axis === "y") {
      return new THREE.Vector3(0, 1, 0);
    }

    return new THREE.Vector3(0, 0, 1);
  }

  function getClippingPlaneNormal(plane: ClippingPlaneState) {
    const axisVector = getAxisVector(plane.axis);

    return plane.side === "min" ? axisVector : axisVector.multiplyScalar(-1);
  }

  function getAxisCenterAndHalfSize(axis: ClippingAxis, box: InstanceType<typeof THREE.Box3>) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    if (axis === "x") {
      return { center: center.x, halfSize: Math.max(size.x / 2, 1) };
    }

    if (axis === "y") {
      return { center: center.y, halfSize: Math.max(size.y / 2, 1) };
    }

    return { center: center.z, halfSize: Math.max(size.z / 2, 1) };
  }

  function getPlanePosition(
    plane: ClippingPlaneState,
    box: InstanceType<typeof THREE.Box3>
  ) {
    const { center, halfSize } = getAxisCenterAndHalfSize(plane.axis, box);

    return center + (plane.offset / 100) * halfSize;
  }

  function getSectionBoxFromClippingState(
    box: InstanceType<typeof THREE.Box3>,
    clippingPlanes: Record<ClippingFace, ClippingPlaneState>
  ) {
    const sectionBox = box.clone();

    for (const plane of Object.values(clippingPlanes)) {
      const position = plane.enabled ? getPlanePosition(plane, box) : null;

      if (position === null) {
        continue;
      }

      if (plane.face === "xMin") {
        sectionBox.min.x = position;
      }

      if (plane.face === "xMax") {
        sectionBox.max.x = position;
      }

      if (plane.face === "yMin") {
        sectionBox.min.y = position;
      }

      if (plane.face === "yMax") {
        sectionBox.max.y = position;
      }

      if (plane.face === "zMin") {
        sectionBox.min.z = position;
      }

      if (plane.face === "zMax") {
        sectionBox.max.z = position;
      }
    }

    if (sectionBox.min.x > sectionBox.max.x) {
      [sectionBox.min.x, sectionBox.max.x] = [sectionBox.max.x, sectionBox.min.x];
    }

    if (sectionBox.min.y > sectionBox.max.y) {
      [sectionBox.min.y, sectionBox.max.y] = [sectionBox.max.y, sectionBox.min.y];
    }

    if (sectionBox.min.z > sectionBox.max.z) {
      [sectionBox.min.z, sectionBox.max.z] = [sectionBox.max.z, sectionBox.min.z];
    }

    return sectionBox;
  }

  function updateClippingFaceMesh(
    face: ClippingFace,
    mesh: InstanceType<typeof THREE.Mesh>,
    box: InstanceType<typeof THREE.Box3>
  ) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    mesh.rotation.set(0, 0, 0);

    if (face === "xMin" || face === "xMax") {
      mesh.rotation.y = face === "xMin" ? Math.PI / 2 : -Math.PI / 2;
      mesh.position.set(face === "xMin" ? box.min.x : box.max.x, center.y, center.z);
      mesh.scale.set(Math.max(size.z, 0.01), Math.max(size.y, 0.01), 1);
      return;
    }

    if (face === "yMin" || face === "yMax") {
      mesh.rotation.x = face === "yMin" ? -Math.PI / 2 : Math.PI / 2;
      mesh.position.set(center.x, face === "yMin" ? box.min.y : box.max.y, center.z);
      mesh.scale.set(Math.max(size.x, 0.01), Math.max(size.z, 0.01), 1);
      return;
    }

    mesh.rotation.y = face === "zMin" ? 0 : Math.PI;
    mesh.position.set(center.x, center.y, face === "zMin" ? box.min.z : box.max.z);
    mesh.scale.set(Math.max(size.x, 0.01), Math.max(size.y, 0.01), 1);
  }

  function getFaceOutwardVector(face: ClippingFace) {
    if (face === "xMin") {
      return new THREE.Vector3(-1, 0, 0);
    }

    if (face === "xMax") {
      return new THREE.Vector3(1, 0, 0);
    }

    if (face === "yMin") {
      return new THREE.Vector3(0, -1, 0);
    }

    if (face === "yMax") {
      return new THREE.Vector3(0, 1, 0);
    }

    if (face === "zMin") {
      return new THREE.Vector3(0, 0, -1);
    }

    return new THREE.Vector3(0, 0, 1);
  }

  function getFaceCenter(
    face: ClippingFace,
    box: InstanceType<typeof THREE.Box3>
  ) {
    const center = box.getCenter(new THREE.Vector3());

    if (face === "xMin") {
      return new THREE.Vector3(box.min.x, center.y, center.z);
    }

    if (face === "xMax") {
      return new THREE.Vector3(box.max.x, center.y, center.z);
    }

    if (face === "yMin") {
      return new THREE.Vector3(center.x, box.min.y, center.z);
    }

    if (face === "yMax") {
      return new THREE.Vector3(center.x, box.max.y, center.z);
    }

    if (face === "zMin") {
      return new THREE.Vector3(center.x, center.y, box.min.z);
    }

    return new THREE.Vector3(center.x, center.y, box.max.z);
  }

  function updateClippingArrowHandle(
    face: ClippingFace,
    arrow: InstanceType<typeof THREE.Group>,
    box: InstanceType<typeof THREE.Box3>
  ) {
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1);
    const arrowLength = THREE.MathUtils.clamp(maxSize * 0.12, 0.9, 8);
    const direction = getFaceOutwardVector(face);

    arrow.position.copy(getFaceCenter(face, box));
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    arrow.scale.setScalar(arrowLength);
    arrow.visible = true;
  }

  function updateSectionBoxVisual(
    clippingPlanes: Record<ClippingFace, ClippingPlaneState> | null
  ) {
    const box = getCurrentModelBox();
    const hasActiveSectionBox =
      clippingPlanes !== null &&
      Object.values(clippingPlanes).some((plane) => plane.enabled);

    if (!box || !hasActiveSectionBox || !clippingPlanes) {
      clippingBoxGroup.visible = false;
      return;
    }

    const sectionBox = getSectionBoxFromClippingState(box, clippingPlanes);

    clippingBoxHelper.box.copy(sectionBox);
    clippingBoxGroup.visible = true;

    for (const [face, mesh] of clippingFaceMeshes) {
      updateClippingFaceMesh(face, mesh, sectionBox);
      mesh.visible = true;
    }

    for (const [face, arrow] of clippingArrowGroups) {
      updateClippingArrowHandle(face, arrow, sectionBox);
    }
  }

  function raycastSectionBoxFace(clientX: number, clientY: number) {
    if (!clippingBoxGroup.visible) {
      return null;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(
      Array.from(clippingArrowGroups.values()),
      true
    );
    const hit = hits[0];
    const face = hit?.object.userData.clippingFace;

    if (!hit || !face || !clippingFaceOrder.includes(face)) {
      return null;
    }

    return {
      face: face as ClippingFace,
      point: hit.point.clone()
    };
  }

  function beginClippingPlaneDrag(event: MouseEvent) {
    const hit = raycastSectionBoxFace(event.clientX, event.clientY);
    const box = getCurrentModelBox();

    if (!hit || !box || !activeClippingState) {
      return false;
    }

    const plane = activeClippingState[hit.face];
    const { halfSize } = getAxisCenterAndHalfSize(plane.axis, box);
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      cameraDirection,
      hit.point
    );

    clippingDragStart = {
      face: hit.face,
      startOffset: plane.offset,
      startPoint: hit.point,
      dragPlane,
      axisVector: getAxisVector(plane.axis),
      halfSize
    };
    renderer.domElement.style.cursor = "grabbing";

    return true;
  }

  function updateClippingPlaneDrag(event: MouseEvent) {
    if (!clippingDragStart || !activeClippingState) {
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const currentPoint = new THREE.Vector3();

    if (!raycaster.ray.intersectPlane(clippingDragStart.dragPlane, currentPoint)) {
      return;
    }

    const delta = currentPoint
      .sub(clippingDragStart.startPoint)
      .dot(clippingDragStart.axisVector);
    const deltaOffset = (delta / clippingDragStart.halfSize) * 100;
    const plane = activeClippingState[clippingDragStart.face];
    let nextOffset = THREE.MathUtils.clamp(
      clippingDragStart.startOffset + deltaOffset,
      -100,
      100
    );

    const oppositeFace =
      plane.face === "xMin"
        ? "xMax"
        : plane.face === "xMax"
          ? "xMin"
          : plane.face === "yMin"
            ? "yMax"
            : plane.face === "yMax"
              ? "yMin"
              : plane.face === "zMin"
                ? "zMax"
                : "zMin";
    const oppositePlane = activeClippingState[oppositeFace];

    if (plane.side === "min" && oppositePlane.enabled) {
      nextOffset = Math.min(nextOffset, oppositePlane.offset - 1);
    }

    if (plane.side === "max" && oppositePlane.enabled) {
      nextOffset = Math.max(nextOffset, oppositePlane.offset + 1);
    }

    onClippingPlaneDrag?.(clippingDragStart.face, nextOffset);
  }

  function updateSectionBoxCursor(event: MouseEvent) {
    if (clippingDragStart) {
      return;
    }

    renderer.domElement.style.cursor = raycastSectionBoxFace(
      event.clientX,
      event.clientY
    )
      ? "grab"
      : "";
  }

  async function applyClippingPlanes(
    clippingPlanes: Record<ClippingFace, ClippingPlaneState>
  ) {
    const box = getCurrentModelBox();

    activeClippingState = clippingPlanes;

    if (loadedModels.length === 0 || !box) {
      activeClippingPlanes = [];
      renderer.clippingPlanes = [];
      updateSectionBoxVisual(null);
      return;
    }

    activeClippingPlanes = Object.values(clippingPlanes)
      .filter((plane) => plane.enabled)
      .map((plane) => {
        const position = getPlanePosition(plane, box);
        const normal = getClippingPlaneNormal(plane);
        const constant = plane.side === "min" ? -position : position;

        return new THREE.Plane(normal, constant);
      });

    renderer.clippingPlanes = activeClippingPlanes;
    for (const model of loadedModels) {
      model.getClippingPlanesEvent = () => activeClippingPlanes;
    }
    updateSectionBoxVisual(clippingPlanes);

    try {
      await updateFragments(true);
      needsFragmentsUpdate = true;
    } catch (error) {
      if (!loadedModels.some((model) => canIgnoreModelError(error, model))) {
        throw error;
      }
    }
  }

  async function applyAppearance(
    settings: ViewerAppearanceSettings,
    colorOverrides: Record<string, string | null> = {}
  ) {
    grid.visible = settings.showGrid;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    if (settings.viewMode === "rendered") {
      scene.background = new THREE.Color("#d6dee8");
      renderer.setClearColor("#d6dee8");
      renderer.toneMappingExposure = 0.95;
      skyLight.intensity = 0.9;
      keyLight.intensity = 1.55;
      fillLight.intensity = 0.45;
      rimLight.intensity = 0.28;
      shadowMaterial.opacity = 0.14;
      for (const material of gridMaterials) {
        material.opacity = 0.85;
      }
    } else if (settings.viewMode === "shaded") {
      scene.background = new THREE.Color("#101317");
      renderer.setClearColor("#101317");
      renderer.toneMappingExposure = 0.82;
      skyLight.intensity = 0.42;
      keyLight.intensity = 1.25;
      fillLight.intensity = 0.18;
      rimLight.intensity = 0.12;
      shadowMaterial.opacity = 0.2;
      for (const material of gridMaterials) {
        material.opacity = 0.28;
      }
    } else {
      scene.background = new THREE.Color("#edf1f5");
      renderer.setClearColor("#edf1f5");
      renderer.toneMappingExposure = 0.88;
      skyLight.intensity = 0.72;
      keyLight.intensity = 1.35;
      fillLight.intensity = 0.28;
      rimLight.intensity = 0.18;
      shadowMaterial.opacity = 0.12;
      for (const material of gridMaterials) {
        material.opacity = 0.62;
      }
    }

    if (loadedModels.length === 0) {
      needsFragmentsUpdate = true;
      return;
    }

    const models = loadedModels.slice();

    await Promise.all(
      models.map(async (model) => {
        try {
          await model.resetColor(undefined);
          const ids = await getGeometryIdsForModel(model);

          if (ids.length === 0) {
            return;
          }

          if (settings.viewMode !== "rendered") {
            const defaultColor =
              settings.viewMode === "shaded"
                ? new THREE.Color("#8b8d95")
                : new THREE.Color("#b8bcc4");

            await model.setColor(ids, defaultColor);
          }

          const overrideColor = colorOverrides[model.modelId];

          if (overrideColor) {
            await model.setColor(ids, new THREE.Color(overrideColor));
          }
        } catch (error) {
          if (!canIgnoreModelError(error, model)) {
            throw error;
          }
        }
      })
    );

    if (Object.values(activePropertyFilterValues).some((values) => values?.length)) {
      await applyPropertyFilters(activePropertyFilterValues);
      return;
    }

    await applySelectionColors();
    await updateFragments(true);
    needsFragmentsUpdate = true;
  }

  function collectDescendantLocalIds(node: SpatialTreeItem) {
    const ids: number[] = [];

    for (const child of node.children ?? []) {
      if (typeof child.localId === "number") {
        ids.push(child.localId);
      }

      ids.push(...collectDescendantLocalIds(child));
    }

    return ids;
  }

  function collectStoreyNodes(node: SpatialTreeItem, storeys: SpatialTreeItem[]) {
    if (normalizeCategory(node.category).toUpperCase() === "IFCBUILDINGSTOREY") {
      storeys.push(node);
    }

    for (const child of node.children ?? []) {
      collectStoreyNodes(child, storeys);
    }
  }

  async function getItemName(model: FragmentsModel, localId: number) {
    try {
      const [data] = await model.getItemsData([localId], {
        attributesDefault: true
      });
      const record = (data ?? {}) as Record<string, unknown>;

      return (
        getString(readAttribute(record, "Name")) ??
        getString(readAttribute(record, "LongName"))
      );
    } catch (error) {
      if (canIgnoreModelError(error, model)) {
        return null;
      }

      throw error;
    }
  }

  async function buildSearchIndex(model: FragmentsModel, localIds: number[]) {
    const nextIndex: SearchIndexItem[] = [];
    const chunkSize = 300;
    const modelLabel = modelLabelsById.get(model.modelId) ?? null;

    for (let index = 0; index < localIds.length; index += chunkSize) {
      const chunk = localIds.slice(index, index + chunkSize);
      let items;

      try {
        items = await model.getItemsData(chunk, {
          attributesDefault: true
        });
      } catch (error) {
        if (canIgnoreModelError(error, model)) {
          return [];
        }

        throw error;
      }

      items.forEach((item, itemIndex) => {
        const data = (item ?? {}) as Record<string, unknown>;
        const localId = chunk[itemIndex];
        const name =
          getString(readAttribute(data, "Name")) ??
          getString(readAttribute(data, "LongName"));
        const globalId =
          getString(readAttribute(data, "_guid")) ??
          getString(readAttribute(data, "GlobalId")) ??
          getString(readAttribute(data, "GlobalId.value"));
        const ifcType =
          getString(readAttribute(data, "_category")) ??
          getString(readAttribute(data, "category")) ??
          getString(readAttribute(data, "type")) ??
          getString(readAttribute(data, "Type"));
        const objectId = `${model.modelId}:${localId}`;

        nextIndex.push({
          modelId: model.modelId,
          modelLabel,
          localId,
          objectId,
          name,
          globalId,
          ifcType,
          text: [localId, name, globalId, ifcType]
            .filter((value) => value !== null && value !== undefined)
            .join(" ")
            .toLowerCase()
        });
      });
    }

    return nextIndex;
  }

  async function buildFilterIndex(model: FragmentsModel) {
    try {
      const geometryLocalIds = await model.getItemsIdsWithGeometry();
      const geometryIds = new Set(geometryLocalIds);
      const propertyLocalIds = new Map<
        ViewerFilterPropertyKey,
        Map<string, number[]>
      >();

      const addPropertyValue = (
        propertyKey: ViewerFilterPropertyKey,
        value: string | null,
        localId: number
      ) => {
        const normalizedValue = value?.trim();
        if (!normalizedValue) {
          return;
        }

        const valueMap = propertyLocalIds.get(propertyKey) ?? new Map<string, number[]>();
        const ids = valueMap.get(normalizedValue) ?? [];
        ids.push(localId);
        valueMap.set(normalizedValue, ids);
        propertyLocalIds.set(propertyKey, valueMap);
      };

      try {
        const spatialTree = await model.getSpatialStructure();
        const storeyNodes: SpatialTreeItem[] = [];
        collectStoreyNodes(spatialTree, storeyNodes);

        await Promise.all(
          storeyNodes.map(async (storeyNode) => {
            if (typeof storeyNode.localId !== "number") {
              return;
            }

            const ids = collectDescendantLocalIds(storeyNode).filter((id) =>
              geometryIds.has(id)
            );

            if (ids.length === 0) {
              return;
            }

            const name = await getItemName(model, storeyNode.localId);
            const label = name ?? `Storey ${storeyNode.localId}`;
            for (const id of new Set(ids)) {
              addPropertyValue("level", label, id);
            }
          })
        );
      } catch {
        // Storey metadata is optional.
      }

      const searchIndex = await buildSearchIndex(model, geometryLocalIds);
      for (const item of searchIndex) {
        addPropertyValue("type", normalizeCategory(item.ifcType), item.localId);
        addPropertyValue("name", item.name, item.localId);
        addPropertyValue(
          "id",
          item.globalId ? item.globalId : String(item.localId),
          item.localId
        );
      }

      return {
        geometryLocalIds,
        propertyLocalIds: new Map(
          [...propertyLocalIds.entries()].map(([propertyKey, valueMap]) => [
            propertyKey,
            new Map(
              [...valueMap.entries()].map(([value, ids]) => [value, [...new Set(ids)]])
            )
          ])
        ),
        searchIndex
      } satisfies ModelFilterIndex;
    } catch (error) {
      if (canIgnoreModelError(error, model)) {
        return {
          geometryLocalIds: [],
          propertyLocalIds: new Map<ViewerFilterPropertyKey, Map<string, number[]>>(),
          searchIndex: []
        } satisfies ModelFilterIndex;
      }

      throw error;
    }
  }

  async function applyVisibilityFilters(visibleStoreys: Record<string, boolean>) {
    void visibleStoreys;
  }

  async function processLocalIdChunks(
    ids: Iterable<number>,
    handler: (chunk: number[]) => Promise<void>,
    chunkSize = 1800
  ) {
    let chunk: number[] = [];

    for (const id of ids) {
      chunk.push(id);

      if (chunk.length >= chunkSize) {
        await handler(chunk);
        chunk = [];
      }
    }

    if (chunk.length > 0) {
      await handler(chunk);
    }
  }

  async function resetSelectionColors() {
    await Promise.all(
      loadedModels.slice().map(async (model) => {
        const ids = selectedLocalIdsByModelId.get(model.modelId);
        if (!ids || ids.size === 0) {
          return;
        }

        try {
          await processLocalIdChunks(ids, async (chunk) => {
            await model.resetColor(chunk);
          });
        } catch (error) {
          if (!canIgnoreModelError(error, model)) {
            throw error;
          }
        }
      })
    );
    selectedLocalIdsByModelId.clear();
  }

  async function applySelectionColors() {
    await Promise.all(
      loadedModels.slice().map(async (model) => {
        const ids = selectedLocalIdsByModelId.get(model.modelId);
        if (!ids || ids.size === 0) {
          return;
        }

        try {
          await processLocalIdChunks(ids, async (chunk) => {
            await model.setColor(chunk, new THREE.Color("#2f6fed"));
          });
        } catch (error) {
          if (!canIgnoreModelError(error, model)) {
            throw error;
          }
        }
      })
    );
  }

  async function applyPropertyFilters(
    selectedFilters: Partial<Record<ViewerFilterPropertyKey, string[]>>
  ) {
    activePropertyFilterValues = Object.fromEntries(
      Object.entries(selectedFilters).filter(
        ([, values]) => Array.isArray(values) && values.length > 0
      )
    ) as Partial<Record<ViewerFilterPropertyKey, string[]>>;

    if (loadedModels.length === 0) {
      return;
    }

    try {
      await Promise.all(
        loadedModels.slice().map(async (model) => {
          const filterIndex = filterIndexByModelId.get(model.modelId);
          const previousGhostIds = ghostedLocalIdsByModelId.get(model.modelId);

          if (previousGhostIds && previousGhostIds.size > 0) {
            await processLocalIdChunks(previousGhostIds, async (chunk) => {
              await model.resetColor(chunk);
            });
            await processLocalIdChunks(previousGhostIds, async (chunk) => {
              await model.resetOpacity(chunk);
            });
          }

          if (!filterIndex) {
            ghostedLocalIdsByModelId.delete(model.modelId);
            return;
          }

          const activeEntries = Object.entries(activePropertyFilterValues).filter(
            ([, values]) => Array.isArray(values) && values.length > 0
          ) as Array<[ViewerFilterPropertyKey, string[]]>;

          if (activeEntries.length === 0) {
            ghostedLocalIdsByModelId.delete(model.modelId);
            return;
          }

          let matchedIds: number[] | null = null;

          for (const [propertyKey, selectedValues] of activeEntries) {
            const propertyMap = filterIndex.propertyLocalIds.get(propertyKey);
            const unionIds = new Set<number>();

            for (const value of selectedValues) {
              for (const id of propertyMap?.get(value) ?? []) {
                unionIds.add(id);
              }
            }

            matchedIds =
              matchedIds === null
                ? [...unionIds]
                : matchedIds.filter((id) => unionIds.has(id));
          }

          const matchingSet = new Set<number>(matchedIds ?? []);

          const ghostIds =
            matchingSet.size > 0
              ? filterIndex.geometryLocalIds.filter((id) => !matchingSet.has(id))
              : filterIndex.geometryLocalIds;

          if (ghostIds.length > 0) {
            await processLocalIdChunks(ghostIds, async (chunk) => {
              await model.setColor(chunk, ghostFilterColor);
            });
            await processLocalIdChunks(ghostIds, async (chunk) => {
              await model.setOpacity(chunk, ghostFilterOpacity);
            });
            ghostedLocalIdsByModelId.set(model.modelId, new Set(ghostIds));
          } else {
            ghostedLocalIdsByModelId.delete(model.modelId);
          }
        })
      );

      await applySelectionColors();
      await updateFragments(true);
      needsFragmentsUpdate = true;
    } catch (error) {
      if (!loadedModels.some((model) => canIgnoreModelError(error, model))) {
        throw error;
      }
    }
  }

  async function clearSelection() {
    if (loadedModels.length === 0) {
      return;
    }

    selectedLocalId = null;
    await resetSelectionColors();
    if (Object.values(activePropertyFilterValues).some((values) => values?.length)) {
      await applyPropertyFilters(activePropertyFilterValues);
    }
    onSelection?.(null);
    needsFragmentsUpdate = true;
  }

  async function selectLocalId(localId: number, model: FragmentsModel | null = currentModel) {
    if (!model || !loadedModels.includes(model)) {
      onSelection?.(null);
      return;
    }

    try {
      currentModel = model;
      selectedLocalId = localId;
      await resetSelectionColors();
      if (Object.values(activePropertyFilterValues).some((values) => values?.length)) {
        await applyPropertyFilters(activePropertyFilterValues);
      }
      await model.setColor([localId], new THREE.Color("#2f6fed"));
      selectedLocalIdsByModelId.set(model.modelId, new Set([localId]));

      const [rawData] = await model.getItemsData([localId], {
        attributesDefault: true
      });
      const data = (rawData ?? {}) as Record<string, unknown>;
      const selectedExpressId =
        getNumber(readAttribute(data, "expressID")) ??
        getNumber(readAttribute(data, "ExpressID")) ??
        localId;
      const materialNames = getMaterialNamesForSelection(
        model.modelId,
        selectedExpressId
      );
      const rawIndexedProperties = getRawPropertiesForSelection(
        model.modelId,
        selectedExpressId
      );
      const selectedProperties = {
        ...data,
        __ifcProperties: rawIndexedProperties,
        ...(materialNames.length > 0 ? { __materialNames: materialNames } : {})
      };

      onSelection?.({
        selectedObjectId: `${model.modelId}:${localId}`,
        selectedObjectCount: 1,
        selectedObjectTypeCounts: [
          {
            ifcType:
              getString(readAttribute(data, "_category")) ??
              getString(readAttribute(data, "type")) ??
              getString(readAttribute(data, "Type")) ??
              getString(readAttribute(data, "category")) ??
              "Unknown",
            count: 1
          }
        ],
        selectedExpressId,
        selectedGlobalId:
          getString(readAttribute(data, "_guid")) ??
          getString(readAttribute(data, "GlobalId")) ??
          getString(readAttribute(data, "GlobalId.value")),
        selectedIfcType:
          getString(readAttribute(data, "_category")) ??
          getString(readAttribute(data, "type")) ??
          getString(readAttribute(data, "Type")) ??
          getString(readAttribute(data, "category")),
        selectedObjectName:
          getString(readAttribute(data, "Name")) ??
          getString(readAttribute(data, "LongName")),
        selectedProperties
      });
      needsFragmentsUpdate = true;
    } catch (error) {
      selectedLocalId = null;
      onSelection?.(null);
      onStatus?.(
        error instanceof Error && error.message.includes("Model not found")
          ? "The selected model was reloaded, so the current selection was cleared."
          : "Failed to read the selected object."
      );
    }
  }

  async function buildMultiSelectionSummary(
    groupedSelections: Map<FragmentsModel, Set<number>>
  ) {
    const typeCounts = new Map<string, number>();
    let totalCount = 0;

    for (const [model, ids] of groupedSelections) {
      const localIds = [...ids];
      let items;

      try {
        items = await model.getItemsData(localIds, {
          attributesDefault: true
        });
      } catch (error) {
        if (canIgnoreModelError(error, model)) {
          continue;
        }

        throw error;
      }

      totalCount += localIds.length;

      items.forEach((item) => {
        const data = (item ?? {}) as Record<string, unknown>;
        const ifcType =
          getString(readAttribute(data, "_category")) ??
          getString(readAttribute(data, "type")) ??
          getString(readAttribute(data, "Type")) ??
          getString(readAttribute(data, "category")) ??
          "Unknown";

        typeCounts.set(ifcType, (typeCounts.get(ifcType) ?? 0) + 1);
      });
    }

    return {
      totalCount,
      typeCounts: [...typeCounts.entries()]
        .map(([ifcType, count]) => ({ ifcType, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.ifcType.localeCompare(right.ifcType)
        )
    };
  }

  async function raycastAtPoint(clientX: number, clientY: number) {
    for (let index = loadedModels.length - 1; index >= 0; index -= 1) {
      const model = loadedModels[index];
      const result = await model.raycast({
        camera,
        dom: renderer.domElement,
        mouse: new THREE.Vector2(clientX, clientY)
      });

      if (result) {
        return { model, localId: result.localId };
      }
    }

    return null;
  }

  function updateSelectionBox(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    const rect = container.getBoundingClientRect();
    const left = Math.min(startX, endX) - rect.left;
    const top = Math.min(startY, endY) - rect.top;
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const includeOnly = endX >= startX;

    selectionBox.style.display = "block";
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.borderColor = includeOnly ? "#2f6fed" : "#22a06b";
    selectionBox.style.background = includeOnly
      ? "rgba(47, 111, 237, 0.12)"
      : "rgba(34, 160, 107, 0.12)";
  }

  async function ensureSelectionBoxes(model: FragmentsModel) {
    if (geometryIdsByModel.has(model) && geometryBoxesByModel.has(model)) {
      return;
    }

    try {
      const ids = await model.getItemsIdsWithGeometry();
      const boxes: Array<InstanceType<typeof THREE.Box3>> = [];
      const chunkSize = 500;

      for (let index = 0; index < ids.length; index += chunkSize) {
        const chunk = ids.slice(index, index + chunkSize);
        const chunkBoxes = await model.getBoxes(chunk);
        boxes.push(...chunkBoxes);
      }

      geometryIdsByModel.set(model, ids);
      geometryBoxesByModel.set(model, boxes);
    } catch (error) {
      if (!canIgnoreModelError(error, model)) {
        throw error;
      }
    }
  }

  function projectBoxToScreen(
    box: InstanceType<typeof THREE.Box3>,
    offset: InstanceType<typeof THREE.Vector3>
  ) {
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ];

    const rect = renderer.domElement.getBoundingClientRect();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
      corner.add(offset).project(camera);
      const screenX = (corner.x * 0.5 + 0.5) * rect.width + rect.left;
      const screenY = (-corner.y * 0.5 + 0.5) * rect.height + rect.top;
      minX = Math.min(minX, screenX);
      minY = Math.min(minY, screenY);
      maxX = Math.max(maxX, screenX);
      maxY = Math.max(maxY, screenY);
    }

    return { minX, minY, maxX, maxY };
  }

  async function selectByDragBox(startX: number, startY: number, endX: number, endY: number) {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);
    const includeOnly = endX >= startX;
    const groupedSelections = new Map<FragmentsModel, Set<number>>();

    for (const model of loadedModels) {
      await ensureSelectionBoxes(model);
      const geometryIds = geometryIdsByModel.get(model) ?? [];
      const geometryBoxes = geometryBoxesByModel.get(model) ?? [];
      const modelOffset = model.object.position.clone();

      for (let index = 0; index < geometryIds.length; index += 1) {
        const localId = geometryIds[index];
        const box = geometryBoxes[index];

        if (!box) {
          continue;
        }

        const projected = projectBoxToScreen(box, modelOffset);
        const isIncluded =
          projected.minX >= left &&
          projected.maxX <= right &&
          projected.minY >= top &&
          projected.maxY <= bottom;
        const isIntersecting =
          projected.maxX >= left &&
          projected.minX <= right &&
          projected.maxY >= top &&
          projected.minY <= bottom;

        if ((includeOnly && !isIncluded) || (!includeOnly && !isIntersecting)) {
          continue;
        }

        const ids = groupedSelections.get(model) ?? new Set<number>();
        ids.add(localId);
        groupedSelections.set(model, ids);
      }
    }

    if (groupedSelections.size === 0) {
      await clearSelection();
      return;
    }

    selectedLocalId = null;
    await resetSelectionColors();
    if (Object.values(activePropertyFilterValues).some((values) => values?.length)) {
      await applyPropertyFilters(activePropertyFilterValues);
    }

    for (const [model, ids] of groupedSelections) {
      try {
        currentModel = model;
        await processLocalIdChunks(ids, async (chunk) => {
          await model.setColor(chunk, new THREE.Color("#2f6fed"));
        });
        selectedLocalIdsByModelId.set(model.modelId, new Set(ids));
      } catch (error) {
        if (!canIgnoreModelError(error, model)) {
          throw error;
        }
      }
    }

    const summary = await buildMultiSelectionSummary(groupedSelections);

    onSelection?.({
      selectedObjectId: null,
      selectedObjectCount: summary.totalCount,
      selectedObjectTypeCounts: summary.typeCounts,
      selectedExpressId: null,
      selectedGlobalId: null,
      selectedIfcType: null,
      selectedObjectName: null,
      selectedProperties: null
    });
    needsFragmentsUpdate = true;
  }

  function handleCanvasMouseMove(event: MouseEvent) {
    if (clippingDragStart) {
      updateClippingPlaneDrag(event);
      return;
    }

    if (middleDragStart) {
      const deltaX = event.clientX - middleDragStart.x;
      const deltaY = event.clientY - middleDragStart.y;

      if (middleDragStart.mode === "pan") {
        panCamera(deltaX, deltaY);
      } else {
        orbitCamera(deltaX, deltaY);
      }

      middleDragStart = {
        ...middleDragStart,
        x: event.clientX,
        y: event.clientY
      };
      return;
    }

    if (!selectionDragStart) {
      updateSectionBoxCursor(event);
      return;
    }

    const dragDistance = Math.hypot(
      event.clientX - selectionDragStart.x,
      event.clientY - selectionDragStart.y
    );

    if (dragDistance < 6) {
      return;
    }

    isSelectionDragging = true;
    updateSelectionBox(
      selectionDragStart.x,
      selectionDragStart.y,
      event.clientX,
      event.clientY
    );
  }

  async function handleCanvasMouseUp(event: MouseEvent) {
    if (event.button === 0 && clippingDragStart) {
      clippingDragStart = null;
      renderer.domElement.style.cursor = "";
      return;
    }

    if (event.button === 1) {
      middleDragStart = null;
      return;
    }

    if (event.button !== 0 || !selectionDragStart) {
      return;
    }

    const start = selectionDragStart;
    selectionDragStart = null;
    selectionBox.style.display = "none";

    if (!isSelectionDragging) {
      const hit = await raycastAtPoint(event.clientX, event.clientY);

      if (!hit) {
        await clearSelection();
        return;
      }

      await selectLocalId(hit.localId, hit.model);
      return;
    }

    isSelectionDragging = false;
    await selectByDragBox(start.x, start.y, event.clientX, event.clientY);
  }

  function animate() {
    if (isDisposed) {
      return;
    }

    const controlsChanged = controls.update();

    if (controlsChanged || needsFragmentsUpdate) {
      needsFragmentsUpdate = false;
      void updateFragments();
    }

    renderer.render(scene, camera);
    if (clippingBoxGroup.visible) {
      const sceneClippingPlanes = renderer.clippingPlanes;
      renderer.clippingPlanes = [];
      renderer.clearDepth();
      renderer.render(clippingOverlayScene, camera);
      renderer.clippingPlanes = sceneClippingPlanes;
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  resize();
  renderer.domElement.addEventListener("mousedown", handleCanvasMouseDown);
  renderer.domElement.addEventListener("auxclick", handleCanvasAuxClick);
  window.addEventListener("mousemove", handleCanvasMouseMove);
  window.addEventListener("mouseup", handleCanvasMouseUp);
  controls.addEventListener("change", () => {
    needsFragmentsUpdate = true;
  });
  animate();

  return {
    async loadFragments({
      modelId,
      modelLabel,
      derivative,
      originalFileUrl,
      signal
    }: LoadFragmentsInput) {
      const version = ++fragmentsVersion;
      onStatus?.("Downloading the Fragments derivative file.");
      const response = await fetch(derivative.fileUrl, {
        cache: "no-store",
        signal
      });

      if (!response.ok) {
        throw new Error("Failed to download the Fragments derivative file.");
      }

      const buffer = await response.arrayBuffer();

      if (signal?.aborted) {
        return;
      }

      const existingIndex = loadedModelIds.indexOf(modelId);
      if (existingIndex >= 0) {
        const existingModel = loadedModels[existingIndex];

        scene.remove(existingModel.object);
        geometryIdsByModel.delete(existingModel);
        geometryBoxesByModel.delete(existingModel);
        materialIndexByModelId.delete(modelId);
        propertyIndexByModelId.delete(modelId);
        materialIndexCacheByModelId.delete(modelId);
        propertyIndexCacheByModelId.delete(modelId);
        filterIndexByModelId.delete(modelId);
        modelLabelsById.delete(modelId);
        loadedModels.splice(existingIndex, 1);
        loadedModelIds.splice(existingIndex, 1);
        emitFilterMetadata();

        try {
          await fragments.disposeModel(existingModel.modelId);
        } catch {
          // Ignore stale internal registrations during reload.
        }
      }

      onStatus?.("Loading the Fragments model.");
      loadMaterialIndex(modelId, originalFileUrl);
      modelLabelsById.set(modelId, modelLabel ?? modelId);
      currentModel = await fragments.load(buffer, {
        modelId,
        camera,
        onProgress: (event) => {
          if (typeof event.progress === "number") {
            onStatus?.(`Loading Fragments ${Math.round(event.progress * 100)}%`);
          }
        }
      });
      currentModel.useCamera(camera);
      currentModel.getClippingPlanesEvent = () => activeClippingPlanes;
      currentModel.object.traverse((child) => {
        if ("castShadow" in child) {
          child.castShadow = true;
        }

        if ("receiveShadow" in child) {
          child.receiveShadow = true;
        }
      });
      scene.add(currentModel.object);
      loadedModels.push(currentModel);
      loadedModelIds.push(modelId);
      if (!modelTransforms.has(modelId)) {
        modelTransforms.set(modelId, { x: 0, y: 0, z: 0 });
      }
      applyModelTransform(modelId);
      geometryIdsByModel.delete(currentModel);
      geometryBoxesByModel.delete(currentModel);
      filterIndexByModelId.set(modelId, await buildFilterIndex(currentModel));
      emitFilterMetadata();
      fitCameraToCurrentModel();
      await updateFragments(true, version);
      onStatus?.(`${derivative.fileName} loaded successfully.`);
    },
    searchObjects(query: string) {
      const normalizedQuery = query.trim().toLowerCase();

      if (normalizedQuery.length === 0) {
        return [];
      }

      const terms = normalizedQuery.split(/\s+/).filter(Boolean);

      return getAllSearchIndex()
        .filter((item) => terms.every((term) => item.text.includes(term)))
        .slice(0, 30)
        .map((item) => ({
          modelId: item.modelId,
          modelLabel: item.modelLabel,
          localId: item.localId,
          objectId: item.objectId,
          name: item.name,
          globalId: item.globalId,
          ifcType: item.ifcType
        }));
    },
    async selectObject(localId: number, modelId?: string) {
      const model = modelId ? getLoadedModel(modelId) : currentModel;
      await selectLocalId(localId, model);
    },
    applyVisibilityFilters,
    applyPropertyFilters,
    applyClippingPlanes,
    applyAppearance,
    setModelVisibility(modelId: string, isVisible: boolean) {
      const model = getLoadedModel(modelId);

      if (!model) {
        return;
      }

      model.object.visible = isVisible;
      needsFragmentsUpdate = true;
    },
    setModelTransform(modelId: string, offset: ModelOffset) {
      modelTransforms.set(modelId, offset);
      applyModelTransform(modelId);
      fitCameraToCurrentModel();
    },
    async clear() {
      fragmentsVersion += 1;
      onSelection?.(null);
      activeClippingPlanes = [];
      activeClippingState = null;
      clippingDragStart = null;
      selectedLocalId = null;
      selectedLocalIdsByModelId.clear();
      ghostedLocalIdsByModelId.clear();
      activePropertyFilterValues = {};
      renderer.clippingPlanes = [];
      clippingBoxGroup.visible = false;
      shadowCatcher.visible = false;
      grid.position.y = -0.02;
      filterIndexByModelId.clear();
      modelLabelsById.clear();
      emitFilterMetadata();

      const disposedModelIds = new Set<string>();

      for (const model of loadedModels) {
        scene.remove(model.object);
        geometryIdsByModel.delete(model);
        geometryBoxesByModel.delete(model);

        if (disposedModelIds.has(model.modelId)) {
          continue;
        }

        disposedModelIds.add(model.modelId);

        try {
          await fragments.disposeModel(model.modelId);
        } catch {
          // Ignore already-disposed models to keep clear() idempotent.
        }
      }

      loadedModels.length = 0;
      loadedModelIds.length = 0;
      materialIndexByModelId.clear();
      propertyIndexByModelId.clear();
      materialIndexCacheByModelId.clear();
      propertyIndexCacheByModelId.clear();
      filterIndexByModelId.clear();
      modelLabelsById.clear();
      modelTransforms.clear();
      geometryIdsByModel.clear();
      geometryBoxesByModel.clear();
      currentModel = null;

      needsFragmentsUpdate = true;
    },
    fit() {
      fitCameraToCurrentModel();
    },
    home() {
      fitCameraToCurrentModel();
    },
    setStandardView,
    focusSelectedObject,
    resize,
    async dispose() {
      isDisposed = true;
      fragmentsVersion += 1;
      window.cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("mousedown", handleCanvasMouseDown);
      renderer.domElement.removeEventListener("auxclick", handleCanvasAuxClick);
      window.removeEventListener("mousemove", handleCanvasMouseMove);
      window.removeEventListener("mouseup", handleCanvasMouseUp);
      onSelection?.(null);
      await fragments.dispose();
      controls.dispose();
      environmentMap.dispose();
      pmremGenerator.dispose();
      clippingBoxHelper.dispose();
      for (const mesh of clippingFaceMeshes.values()) {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          material.dispose();
        }
      }
      for (const group of clippingArrowGroups.values()) {
        group.traverse((child) => {
          if (!("geometry" in child) || !("material" in child)) {
            return;
          }

          const mesh = child as InstanceType<typeof THREE.Mesh>;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const material of materials) {
            material.dispose();
          }
        }
        );
      }
      renderer.dispose();
      selectionBox.remove();
      renderer.domElement.remove();
    }
  };
}

