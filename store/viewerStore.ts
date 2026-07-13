"use client";

import { create } from "zustand";
import {
  defaultViewerAppearance,
  ViewerAppearanceSettings
} from "@/lib/viewer/appearance";
import {
  ClippingFace,
  ClippingPlaneState,
  defaultClippingPlanes
} from "@/lib/viewer/clipping";
import {
  ViewerFilterPropertyKey,
  ViewerFilterPropertyOption
} from "@/lib/viewer/filtering";
import { ViewerLoadMode } from "@/lib/viewer/loadModes";
import type { ViewerObjectSearchResult } from "@/lib/viewer/objectSearch";

export type IfcModelSummary = {
  id: string;
  projectId?: string | null;
  modelVersion?: string | null;
  fileName: string;
  originalFileName: string;
  fileFormat?: "IFC" | "NWC" | "NWD";
  fileSize: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  objectCount: number;
  derivativeCount: number;
  originalArchiveProvider?: string | null;
  originalArchivedAt?: string | null;
  originalDeletedAt?: string | null;
  fileUrl: string;
};

type SelectedFilterValues = Partial<
  Record<ViewerFilterPropertyKey, Record<string, boolean>>
>;

type ViewerState = {
  activeModelId: string | null;
  activeModelIds: string[];
  modelOffsets: Record<string, { x: number; y: number; z: number }>;
  modelVisibility: Record<string, boolean>;
  modelColorOverrides: Record<string, string | null>;
  activeModelName: string | null;
  activeModelFileUrl: string | null;
  activeModelObjectCount: number;
  loadMode: ViewerLoadMode;
  selectedObjectId: string | null;
  selectedObjectCount: number;
  selectedObjectTypeCounts: Array<{ ifcType: string; count: number }>;
  selectedExpressId: number | null;
  selectedGlobalId: string | null;
  selectedIfcType: string | null;
  selectedObjectName: string | null;
  selectedProperties: Record<string, unknown> | null;
  availableFilterProperties: ViewerFilterPropertyOption[];
  activeFilterKeys: ViewerFilterPropertyKey[];
  objectSearchQuery: string;
  objectSearchResults: ViewerObjectSearchResult[];
  isObjectSearchReady: boolean;
  isObjectSearching: boolean;
  selectedFilterValues: SelectedFilterValues;
  clippingPlanes: Record<ClippingFace, ClippingPlaneState>;
  appearance: ViewerAppearanceSettings;
  isLoading: boolean;
  error: string | null;
  setActiveModel: (
    model: Pick<
      IfcModelSummary,
      "id" | "originalFileName" | "fileUrl" | "objectCount"
    > | null
  ) => void;
  setActiveModelIds: (modelIds: string[]) => void;
  toggleActiveModelId: (modelId: string) => void;
  clearActiveModelIds: () => void;
  setModelOffset: (
    modelId: string,
    patch: Partial<{ x: number; y: number; z: number }>
  ) => void;
  resetModelOffset: (modelId: string) => void;
  setModelVisibility: (modelId: string, isVisible: boolean) => void;
  setModelColorOverride: (modelId: string, color: string | null) => void;
  resetModelColorOverride: (modelId: string) => void;
  setSelectedObject: (
    selection: Pick<
      ViewerState,
      | "selectedObjectId"
      | "selectedObjectCount"
      | "selectedObjectTypeCounts"
      | "selectedExpressId"
      | "selectedGlobalId"
      | "selectedIfcType"
      | "selectedObjectName"
      | "selectedProperties"
    > | null
  ) => void;
  setLoadMode: (loadMode: ViewerLoadMode) => void;
  setAvailableFilterProperties: (
    properties: ViewerFilterPropertyOption[]
  ) => void;
  setObjectSearchQuery: (query: string) => void;
  setObjectSearchResults: (results: ViewerObjectSearchResult[]) => void;
  setObjectSearchReady: (isReady: boolean) => void;
  setObjectSearching: (isSearching: boolean) => void;
  showFilterProperty: (key: ViewerFilterPropertyKey) => void;
  hideFilterProperty: (key: ViewerFilterPropertyKey) => void;
  setFilterValueSelected: (
    key: ViewerFilterPropertyKey,
    value: string,
    isSelected: boolean
  ) => void;
  clearFilterValues: (key: ViewerFilterPropertyKey) => void;
  clearAllFilters: () => void;
  setClippingPlane: (
    face: ClippingFace,
    patch: Partial<Omit<ClippingPlaneState, "face" | "axis" | "side">>
  ) => void;
  setClippingBoxEnabled: (isEnabled: boolean) => void;
  resetClippingPlanes: () => void;
  setAppearance: (patch: Partial<ViewerAppearanceSettings>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
};

const initialClippingPlanes = Object.fromEntries(
  defaultClippingPlanes.map((plane) => [plane.face, plane])
) as Record<ClippingFace, ClippingPlaneState>;

function pruneSelectedFilterValues(
  selectedFilterValues: SelectedFilterValues,
  properties: ViewerFilterPropertyOption[]
) {
  return Object.fromEntries(
    Object.entries(selectedFilterValues)
      .map(([rawKey, values]) => {
        const key = rawKey as ViewerFilterPropertyKey;
        const property = properties.find((entry) => entry.key === key);

        if (!property || !values) {
          return null;
        }

        const nextValues = Object.fromEntries(
          Object.entries(values).filter(([value, isSelected]) => {
            if (!isSelected) {
              return false;
            }

            return property.values.some((option) => option.value === value);
          })
        );

        return Object.keys(nextValues).length > 0 ? [key, nextValues] : null;
      })
      .filter(
        (
          entry
        ): entry is [ViewerFilterPropertyKey, Record<string, boolean>] =>
          entry !== null
      )
  ) as SelectedFilterValues;
}

export const useViewerStore = create<ViewerState>((set) => ({
  activeModelId: null,
  activeModelIds: [],
  modelOffsets: {},
  modelVisibility: {},
  modelColorOverrides: {},
  activeModelName: null,
  activeModelFileUrl: null,
  activeModelObjectCount: 0,
  loadMode: "preview",
  selectedObjectId: null,
  selectedObjectCount: 0,
  selectedObjectTypeCounts: [],
  selectedExpressId: null,
  selectedGlobalId: null,
  selectedIfcType: null,
  selectedObjectName: null,
  selectedProperties: null,
  availableFilterProperties: [],
  activeFilterKeys: [],
  objectSearchQuery: "",
  objectSearchResults: [],
  isObjectSearchReady: false,
  isObjectSearching: false,
  selectedFilterValues: {},
  clippingPlanes: initialClippingPlanes,
  appearance: defaultViewerAppearance,
  isLoading: false,
  error: null,
  setActiveModel: (model) =>
    set({
      activeModelId: model?.id ?? null,
      activeModelIds: model?.id ? [model.id] : [],
      activeModelName: model?.originalFileName ?? null,
      activeModelFileUrl: model?.fileUrl ?? null,
      activeModelObjectCount: model?.objectCount ?? 0,
      selectedObjectId: null,
      selectedObjectCount: 0,
      selectedObjectTypeCounts: [],
      selectedExpressId: null,
      selectedGlobalId: null,
      selectedIfcType: null,
      selectedObjectName: null,
      selectedProperties: null,
      availableFilterProperties: [],
      activeFilterKeys: [],
      objectSearchQuery: "",
      objectSearchResults: [],
      isObjectSearchReady: false,
      isObjectSearching: false,
      selectedFilterValues: {},
      clippingPlanes: initialClippingPlanes,
      appearance: defaultViewerAppearance
    }),
  setActiveModelIds: (modelIds) =>
    set((state) => ({
      activeModelIds: modelIds,
      activeModelId: modelIds[modelIds.length - 1] ?? null,
      activeModelName: modelIds.length === 0 ? null : state.activeModelName,
      activeModelFileUrl:
        modelIds.length === 0 ? null : state.activeModelFileUrl,
      activeModelObjectCount:
        modelIds.length === 0 ? 0 : state.activeModelObjectCount
    })),
  toggleActiveModelId: (modelId) =>
    set((state) => {
      const nextActiveModelIds = state.activeModelIds.includes(modelId)
        ? state.activeModelIds.filter((id) => id !== modelId)
        : [...state.activeModelIds, modelId];

      return {
        activeModelIds: nextActiveModelIds,
        activeModelId: nextActiveModelIds[nextActiveModelIds.length - 1] ?? null
      };
    }),
  clearActiveModelIds: () =>
    set({
      activeModelIds: [],
      activeModelId: null,
      activeModelName: null,
      activeModelFileUrl: null,
      activeModelObjectCount: 0,
      availableFilterProperties: [],
      activeFilterKeys: [],
      selectedFilterValues: {}
    }),
  setModelOffset: (modelId, patch) =>
    set((state) => {
      const current = state.modelOffsets[modelId] ?? { x: 0, y: 0, z: 0 };

      return {
        modelOffsets: {
          ...state.modelOffsets,
          [modelId]: {
            x: patch.x ?? current.x,
            y: patch.y ?? current.y,
            z: patch.z ?? current.z
          }
        }
      };
    }),
  resetModelOffset: (modelId) =>
    set((state) => ({
      modelOffsets: {
        ...state.modelOffsets,
        [modelId]: { x: 0, y: 0, z: 0 }
      }
    })),
  setModelVisibility: (modelId, isVisible) =>
    set((state) => ({
      modelVisibility: {
        ...state.modelVisibility,
        [modelId]: isVisible
      }
    })),
  setModelColorOverride: (modelId, color) =>
    set((state) => ({
      modelColorOverrides: {
        ...state.modelColorOverrides,
        [modelId]: color
      }
    })),
  resetModelColorOverride: (modelId) =>
    set((state) => ({
      modelColorOverrides: {
        ...state.modelColorOverrides,
        [modelId]: null
      }
    })),
  setSelectedObject: (selection) =>
    set({
      selectedObjectId: selection?.selectedObjectId ?? null,
      selectedObjectCount: selection?.selectedObjectCount ?? 0,
      selectedObjectTypeCounts: selection?.selectedObjectTypeCounts ?? [],
      selectedExpressId: selection?.selectedExpressId ?? null,
      selectedGlobalId: selection?.selectedGlobalId ?? null,
      selectedIfcType: selection?.selectedIfcType ?? null,
      selectedObjectName: selection?.selectedObjectName ?? null,
      selectedProperties: selection?.selectedProperties ?? null
    }),
  setLoadMode: (loadMode) => set({ loadMode }),
  setAvailableFilterProperties: (properties) =>
    set((state) => ({
      availableFilterProperties: properties,
      activeFilterKeys: state.activeFilterKeys.filter((key) =>
        properties.some((property) => property.key === key)
      ),
      selectedFilterValues: pruneSelectedFilterValues(
        state.selectedFilterValues,
        properties
      )
    })),
  setObjectSearchQuery: (query) => set({ objectSearchQuery: query }),
  setObjectSearchResults: (results) => set({ objectSearchResults: results }),
  setObjectSearchReady: (isReady) => set({ isObjectSearchReady: isReady }),
  setObjectSearching: (isSearching) => set({ isObjectSearching: isSearching }),
  showFilterProperty: (key) =>
    set((state) => ({
      activeFilterKeys: state.activeFilterKeys.includes(key)
        ? state.activeFilterKeys
        : [...state.activeFilterKeys, key]
    })),
  hideFilterProperty: (key) =>
    set((state) => ({
      activeFilterKeys: state.activeFilterKeys.filter((entry) => entry !== key),
      selectedFilterValues: Object.fromEntries(
        Object.entries(state.selectedFilterValues).filter(
          ([entryKey]) => entryKey !== key
        )
      ) as SelectedFilterValues
    })),
  setFilterValueSelected: (key, value, isSelected) =>
    set((state) => {
      const currentValues = state.selectedFilterValues[key] ?? {};
      const nextValues = isSelected
        ? {
            ...currentValues,
            [value]: true
          }
        : Object.fromEntries(
            Object.entries(currentValues).filter(([entry]) => entry !== value)
          );
      const nextSelectedFilterValues = {
        ...state.selectedFilterValues
      };

      if (Object.keys(nextValues).length > 0) {
        nextSelectedFilterValues[key] = nextValues;
      } else {
        delete nextSelectedFilterValues[key];
      }

      return {
        selectedFilterValues: nextSelectedFilterValues
      };
    }),
  clearFilterValues: (key) =>
    set((state) => ({
      selectedFilterValues: Object.fromEntries(
        Object.entries(state.selectedFilterValues).filter(
          ([entryKey]) => entryKey !== key
        )
      ) as SelectedFilterValues
    })),
  clearAllFilters: () =>
    set({
      activeFilterKeys: [],
      selectedFilterValues: {}
    }),
  setClippingPlane: (face, patch) =>
    set((state) => ({
      clippingPlanes: {
        ...state.clippingPlanes,
        [face]: {
          ...state.clippingPlanes[face],
          ...patch
        }
      }
    })),
  setClippingBoxEnabled: (isEnabled) =>
    set((state) => ({
      clippingPlanes: Object.fromEntries(
        Object.entries(state.clippingPlanes).map(([face, plane]) => [
          face,
          {
            ...plane,
            enabled: isEnabled
          }
        ])
      ) as Record<ClippingFace, ClippingPlaneState>
    })),
  resetClippingPlanes: () => set({ clippingPlanes: initialClippingPlanes }),
  setAppearance: (patch) =>
    set((state) => ({
      appearance: {
        ...state.appearance,
        ...patch
      }
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
}));
