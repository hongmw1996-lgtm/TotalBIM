"use client";

import { Info, MousePointer2 } from "lucide-react";
import { PropertyAccordion } from "@/components/bim-properties/PropertyAccordion";
import { useViewerStore } from "@/store/viewerStore";

type OverviewRow = {
  label: string;
  value: string;
};

const HIDDEN_OVERVIEW_KEYS = new Set([
  "applicationid",
  "speckletype",
  "expressid"
]);

function unwrapValue(value: unknown): unknown {
  let current = value;
  const seen = new WeakSet<object>();

  for (let index = 0; index < 6; index += 1) {
    if (
      !current ||
      typeof current !== "object" ||
      !("value" in current) ||
      !Object.prototype.hasOwnProperty.call(current, "value")
    ) {
      return current;
    }

    if (seen.has(current)) {
      return current;
    }

    seen.add(current);
    current = (current as { value: unknown }).value;
  }

  return current;
}

function normalizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function formatPrimitive(value: unknown): string | null {
  const unwrapped = unwrapValue(value);

  if (unwrapped === null || unwrapped === undefined) {
    return null;
  }

  if (typeof unwrapped === "string") {
    return unwrapped.trim() || null;
  }

  if (typeof unwrapped === "number" || typeof unwrapped === "boolean") {
    return String(unwrapped);
  }

  return null;
}

function findPrimitiveInValue(
  source: unknown,
  depth = 0,
  seen?: WeakSet<object>
): string | null {
  const primitive = formatPrimitive(source);
  if (primitive || depth > 4) {
    return primitive;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const nestedValue = findPrimitiveInValue(item, depth + 1, seen);
      if (nestedValue) {
        return nestedValue;
      }
    }

    return null;
  }

  if (!source || typeof source !== "object") {
    return null;
  }

  const nextSeen = seen ?? new WeakSet<object>();
  if (nextSeen.has(source)) {
    return null;
  }
  nextSeen.add(source);

  for (const value of Object.values(source as Record<string, unknown>)) {
    const nestedValue = findPrimitiveInValue(value, depth + 1, nextSeen);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return null;
}

function normalizeDisplayValue(label: string, value: string) {
  if (normalizeKey(label) === "category" && value.startsWith("OST_")) {
    return value.slice(4);
  }

  return value;
}

function isIfcClassName(value: string) {
  return /^IFC[A-Z0-9_]+$/.test(value.trim());
}

function normalizeRevitCategory(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || isIfcClassName(trimmedValue)) {
    return null;
  }

  return trimmedValue.startsWith("OST_") ? trimmedValue.slice(4) : trimmedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPropertyValueCandidate(record: Record<string, unknown>) {
  const directKeys = [
    "NominalValue",
    "LengthValue",
    "AreaValue",
    "VolumeValue",
    "CountValue",
    "WeightValue",
    "TimeValue",
    "NumberValue",
    "IntegerValue",
    "RealValue",
    "BooleanValue",
    "StringValue",
    "LabelValue",
    "Description",
    "value"
  ];

  for (const key of directKeys) {
    const candidate = findPrimitiveInValue(record[key]);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function findFirstValue(
  source: unknown,
  keys: string[],
  depth = 0,
  seen?: WeakSet<object>
): string | null {
  if (depth > 6) {
    return null;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const nestedValue = findFirstValue(item, keys, depth + 1, seen);
      if (nestedValue) {
        return nestedValue;
      }
    }

    return null;
  }

  if (!source || typeof source !== "object") {
    return null;
  }

  const nextSeen = seen ?? new WeakSet<object>();
  if (nextSeen.has(source as object)) {
    return null;
  }
  nextSeen.add(source as object);

  const record = source as Record<string, unknown>;
  const normalizedCandidates = new Set(keys.map(normalizeKey));

  for (const [key, value] of Object.entries(record)) {
    if (!normalizedCandidates.has(normalizeKey(key))) {
      continue;
    }

    const directValue = formatPrimitive(value);
    if (directValue) {
      return directValue;
    }

    const nestedValue = findFirstValue(value, keys, depth + 1, nextSeen);
    if (nestedValue) {
      return nestedValue;
    }
  }

  for (const value of Object.values(record)) {
    const nestedValue = findFirstValue(value, keys, depth + 1, nextSeen);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return null;
}

function findNamedPropertyValue(
  source: unknown,
  propertyNames: string[],
  depth = 0,
  seen?: WeakSet<object>
): string | null {
  if (depth > 7) {
    return null;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const nestedValue = findNamedPropertyValue(item, propertyNames, depth + 1, seen);
      if (nestedValue) {
        return nestedValue;
      }
    }

    return null;
  }

  if (!source || typeof source !== "object") {
    return null;
  }

  const nextSeen = seen ?? new WeakSet<object>();
  if (nextSeen.has(source as object)) {
    return null;
  }
  nextSeen.add(source as object);

  const record = source as Record<string, unknown>;
  const recordName = formatPrimitive(record.Name);

  if (
    recordName &&
    propertyNames.some((name) => normalizeKey(name) === normalizeKey(recordName))
  ) {
    const candidate = getPropertyValueCandidate(record);
    if (candidate) {
      return candidate;
    }
  }

  for (const value of Object.values(record)) {
    const nestedValue = findNamedPropertyValue(value, propertyNames, depth + 1, nextSeen);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return null;
}

function findRevitCategoryValue(source: Record<string, unknown> | null) {
  return normalizeRevitCategory(
    findNamedPropertyValue(source, [
      "Category",
      "Built-in Category",
      "BuiltInCategory"
    ]) ??
      findFirstValue(source, [
        "builtInCategory",
        "BuiltInCategory",
        "revitCategory",
        "RevitCategory"
      ])
  );
}

function splitFamilyAndType(value: string | null) {
  if (!value) {
    return { family: null, type: null };
  }

  const [familyPart, ...typeParts] = value.split(":");
  const family = familyPart?.trim() || null;
  const type = typeParts.join(":").trim() || null;

  return { family, type };
}

function stripElementTag(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/:\d+$/, "").trim() || null;
}

function findFamilyAndTypeValue(source: Record<string, unknown> | null) {
  return getIndexedPropertyValue(source, "familyandtype") ??
    findNamedPropertyValue(source, ["Family and Type"]) ??
    findFirstValue(source, ["FamilyAndType"]);
}

function getIndexedPropertyValue(
  source: Record<string, unknown> | null,
  key: string
) {
  if (!source) {
    return null;
  }

  const indexedProperties = unwrapValue(source.__ifcProperties);
  if (!isRecord(indexedProperties)) {
    return null;
  }

  return formatPrimitive(indexedProperties[key]);
}

function findFamilyValue(
  source: Record<string, unknown> | null,
  selectedObjectName: string | null
) {
  const familyAndType = splitFamilyAndType(findFamilyAndTypeValue(source));
  const selectedNameParts = splitFamilyAndType(stripElementTag(selectedObjectName));

  return (
    getIndexedPropertyValue(source, "family") ??
    getIndexedPropertyValue(source, "familyname") ??
    findNamedPropertyValue(source, ["Family", "Family Name"]) ??
    findFirstValue(source, ["Family", "FamilyName"]) ??
    familyAndType.family ??
    selectedNameParts.family
  );
}

function findTypeValue(
  source: Record<string, unknown> | null,
  selectedObjectName: string | null
) {
  const familyAndType = splitFamilyAndType(findFamilyAndTypeValue(source));
  const selectedNameParts = splitFamilyAndType(stripElementTag(selectedObjectName));

  return (
    getIndexedPropertyValue(source, "type") ??
    getIndexedPropertyValue(source, "typename") ??
    findNamedPropertyValue(source, ["Type", "Type Name"]) ??
    findFirstValue(source, ["TypeName", "ElementType"]) ??
    familyAndType.type ??
    selectedNameParts.type
  );
}

function inferRevitCategory(input: {
  selectedIfcType: string | null;
  selectedObjectName: string | null;
  selectedProperties: Record<string, unknown> | null;
}) {
  const explicitCategory = findRevitCategoryValue(input.selectedProperties);
  const indexedCategory = normalizeRevitCategory(
    getIndexedPropertyValue(input.selectedProperties, "category")
  );
  if (indexedCategory) {
    return indexedCategory;
  }

  if (explicitCategory) {
    return explicitCategory;
  }

  const ifcType = input.selectedIfcType?.toUpperCase() ?? "";
  const typeText = [
    input.selectedObjectName,
    findFirstValue(input.selectedProperties, ["ObjectType", "PredefinedType", "Name"])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (ifcType === "IFCWINDOW") {
    return "Windows";
  }

  if (ifcType === "IFCDOOR") {
    return "Doors";
  }

  if (ifcType.includes("WALL")) {
    return "Walls";
  }

  if (ifcType === "IFCROOF" || typeText.includes("roof")) {
    return "Roofs";
  }

  if (ifcType === "IFCSLAB") {
    const predefinedType = findFirstValue(input.selectedProperties, ["PredefinedType"]);
    if (predefinedType?.toUpperCase() === "ROOF") {
      return "Roofs";
    }

    return "Floors";
  }

  return null;
}

function addRelatingMaterialSources(source: unknown, sources: unknown[]) {
  const relationList = unwrapValue(source);
  if (!Array.isArray(relationList)) {
    return;
  }

  for (const relation of relationList) {
    if (!isRecord(relation)) {
      continue;
    }

    const material = unwrapValue(relation.RelatingMaterial);
    if (material) {
      sources.push(material);
    }
  }
}

function addTypeMaterialSources(source: unknown, sources: unknown[]) {
  const relationList = unwrapValue(source);
  if (!Array.isArray(relationList)) {
    return;
  }

  for (const relation of relationList) {
    if (!isRecord(relation)) {
      continue;
    }

    const relatingType = unwrapValue(relation.RelatingType);
    if (!isRecord(relatingType)) {
      continue;
    }

    addRelatingMaterialSources(relatingType.HasAssociations, sources);

    const directMaterial = unwrapValue(relatingType.RelatingMaterial);
    if (directMaterial) {
      sources.push(directMaterial);
    }
  }
}

function collectMaterialNames(
  source: unknown,
  values = new Set<string>(),
  seen?: WeakSet<object>,
  depth = 0
) {
  if (depth > 8) {
    return values;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      collectMaterialNames(item, values, seen, depth + 1);
    }
    return values;
  }

  if (!isRecord(source)) {
    return values;
  }

  const nextSeen = seen ?? new WeakSet<object>();
  if (nextSeen.has(source)) {
    return values;
  }
  nextSeen.add(source);

  const title =
    formatPrimitive(source.Name) ??
    formatPrimitive(source.LayerSetName) ??
    formatPrimitive(source.MaterialExpression);

  if (title) {
    const normalizedTitle = normalizeKey(title);
    if (
      normalizedTitle &&
      !normalizedTitle.startsWith("ifc") &&
      !["material", "materiallist", "materiallayersetusage"].includes(
        normalizedTitle
      )
    ) {
      values.add(title);
    }
  }

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeKey(key);
    if (
      [
        "isdefinedby",
        "definesoccurrence",
        "istypedby",
        "hasassociations",
        "containedinstructure",
        "properties",
        "ownerhistory",
        "representation",
        "objectplacement"
      ].includes(normalizedKey)
    ) {
      continue;
    }

    collectMaterialNames(value, values, nextSeen, depth + 1);
  }

  return values;
}

function findMaterialValues(source: Record<string, unknown> | null) {
  if (!source) {
    return [];
  }

  const indexedMaterialNames = unwrapValue(source.__materialNames);
  if (Array.isArray(indexedMaterialNames)) {
    const names = indexedMaterialNames
      .map((entry) => formatPrimitive(entry))
      .filter((entry): entry is string => Boolean(entry));

    if (names.length > 0) {
      return [...new Set(names)];
    }
  }

  const materialSources: unknown[] = [];
  addRelatingMaterialSources(source.HasAssociations, materialSources);
  addTypeMaterialSources(source.IsTypedBy, materialSources);
  addTypeMaterialSources(source.DefinesOccurrence, materialSources);

  const materialNames = [...collectMaterialNames(materialSources)].sort((left, right) =>
    left.localeCompare(right)
  );

  return materialNames;
}

function buildOverviewRows(input: {
  selectedIfcType: string | null;
  selectedObjectName: string | null;
  selectedProperties: Record<string, unknown> | null;
}) {
  const {
    selectedIfcType,
    selectedObjectName,
    selectedProperties
  } = input;

  const candidates: Array<[string, string | null]> = [
    ["family", findFamilyValue(selectedProperties, selectedObjectName)],
    ["type", findTypeValue(selectedProperties, selectedObjectName)],
    [
      "category",
      inferRevitCategory({
        selectedIfcType,
        selectedObjectName,
        selectedProperties
      })
    ],
    [
      "units",
      findFirstValue(selectedProperties, ["Units", "units", "Unit"]) ?? "mm"
    ],
    [
      "worksetname",
      getIndexedPropertyValue(selectedProperties, "workset") ??
        getIndexedPropertyValue(selectedProperties, "worksetname") ??
        findNamedPropertyValue(selectedProperties, ["Workset"]) ??
        findFirstValue(selectedProperties, [
          "worksetName",
          "WorksetName",
          "Workset",
          "workset"
        ])
    ],
    ["material", null]
  ];

  const rows: OverviewRow[] = [];

  for (const [label, value] of candidates) {
    if (HIDDEN_OVERVIEW_KEYS.has(normalizeKey(label))) {
      continue;
    }

    rows.push({
      label,
      value: value ? normalizeDisplayValue(label, value) : "null"
    });
  }

  const materialValues = findMaterialValues(selectedProperties);
  const materialRowIndex = rows.findIndex((row) => row.label === "material");

  if (materialRowIndex >= 0) {
    rows[materialRowIndex] = {
      label: "material",
      value: materialValues.length > 0 ? materialValues.join("\n") : "null"
    };
  }

  return rows;
}

export function ObjectPropertiesPanel({
  className = ""
}: {
  className?: string;
}) {
  const {
    selectedObjectCount,
    selectedObjectTypeCounts,
    selectedIfcType,
    selectedObjectName,
    selectedProperties
  } = useViewerStore();

  const overviewRows = buildOverviewRows({
    selectedIfcType,
    selectedObjectName,
    selectedProperties
  });

  return (
    <div className={`flex min-h-full flex-col ${className}`.trim()}>
      <div className="border-b border-[#d8dde6] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#263142]">Selection info</h2>
        <p className="mt-1 text-xs text-[#647083]">
          {
            "\uc120\ud0dd\ud55c \uac1d\uccb4\uc758 \uae30\ubcf8 \uc815\ubcf4\uc640 \uc18d\uc131 \uc9d1\ud569\uc744 \ud655\uc778\ud569\ub2c8\ub2e4."
          }
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {selectedObjectCount === 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-dashed border-[#cfd6e1] px-4 py-5 text-sm leading-6 text-[#647083]">
            <MousePointer2 size={18} className="mt-0.5 shrink-0" aria-hidden />
            {
              "\ubdf0\uc5b4\uc5d0\uc11c \uac1d\uccb4\ub97c \uc120\ud0dd\ud558\uba74 \uae30\ubcf8 \uc815\ubcf4\uc640 property set\uc774 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4."
            }
          </div>
        ) : selectedObjectCount > 1 ? (
          <section className="rounded-md border border-[#d8dde6] bg-white">
            <div className="flex items-center gap-2 border-b border-[#d8dde6] px-4 py-3">
              <Info size={16} aria-hidden />
              <h3 className="text-sm font-semibold text-[#263142]">
                {"\ub2e4\uc911 \uc120\ud0dd \uc694\uc57d"}
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-[#263142]">
                {"\ucd1d "}{selectedObjectCount}{"\uac1c \uc120\ud0dd\ub428"}
              </p>
              <div className="mt-3 space-y-2">
                {selectedObjectTypeCounts.map((entry) => (
                  <div
                    key={entry.ifcType}
                    className="flex items-center justify-between rounded-md border border-[#e3e7ee] px-3 py-2 text-sm"
                  >
                    <span className="text-[#647083]">{entry.ifcType}</span>
                    <span className="font-medium text-[#263142]">
                      {entry.count}{"\uac1c"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            <PropertyAccordion
              properties={null}
              overviewRows={
                overviewRows.length > 0
                  ? overviewRows
                  : []
              }
              rootTitle="RevitObject"
            />
          </>
        )}
      </div>
    </div>
  );
}
