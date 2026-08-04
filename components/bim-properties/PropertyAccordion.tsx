"use client";

type PropertyRow = {
  label: string;
  value: string;
};

type PropertySection = {
  title: string;
  rows: PropertyRow[];
  sections: PropertySection[];
  leaf?: boolean;
};

type PropertyAccordionProps = {
  overviewRows?: PropertyRow[];
  properties: Record<string, unknown> | null;
  rootTitle?: string;
};

const HIDDEN_PROPERTY_KEYS = new Set([
  "applicationid",
  "speckletype",
  "elementid",
  "worksetid",
  "parentapplicationid",
  "expressid",
  "localid",
  "guid",
  "globalid"
]);

const STRUCTURAL_KEYS = new Set([
  "isdefinedby",
  "definesoccurrence",
  "istypedby",
  "hasassociations",
  "containedinstructure",
  "properties",
  "__ifcproperties",
  "__materialnames"
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function formatLabel(label: string) {
  return label.replace(/_/g, " ").trim() || "item";
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

  if (Array.isArray(unwrapped)) {
    const values = unwrapped
      .map((entry) => formatPrimitive(entry))
      .filter((entry): entry is string => Boolean(entry));

    return values.length > 0 ? values.join(", ") : null;
  }

  return null;
}

function getStringValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = formatPrimitive(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function getMeasurementValue(record: Record<string, unknown>) {
  const candidateKeys = [
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

  for (const key of candidateKeys) {
    const value = formatPrimitive(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function buildPrimitiveRows(
  source: Record<string, unknown>,
  excludedKeys: string[] = []
) {
  return Object.entries(source)
    .filter(([key]) => !excludedKeys.includes(key))
    .filter(([key]) => !STRUCTURAL_KEYS.has(normalizeKey(key)))
    .filter(([key]) => !HIDDEN_PROPERTY_KEYS.has(normalizeKey(key)))
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: formatPrimitive(value)
    }))
    .filter((entry): entry is PropertyRow => Boolean(entry.value));
}

function buildPropertySetSection(
  definition: unknown,
  fallbackTitle: string,
  seen?: WeakSet<object>
): PropertySection | null {
  if (!isRecord(definition)) {
    return null;
  }

  const nextSeen = seen ?? new WeakSet<object>();
  if (nextSeen.has(definition)) {
    return null;
  }
  nextSeen.add(definition);

  const title =
    getStringValue(definition, "Name", "LongName") ??
    getStringValue(definition, "_category", "type", "Type") ??
    fallbackTitle;

  const rows: PropertyRow[] = [];
  const sections: PropertySection[] = [];

  const hasProperties = unwrapValue(definition.HasProperties);
  if (Array.isArray(hasProperties)) {
    for (const item of hasProperties) {
      if (!isRecord(item)) {
        continue;
      }

      const label = getStringValue(item, "Name", "LongName") ?? "value";
      if (HIDDEN_PROPERTY_KEYS.has(normalizeKey(label))) {
        continue;
      }

      const value = getMeasurementValue(item);
      if (value) {
        rows.push({
          label: formatLabel(label),
          value
        });
      }
    }
  }

  const quantities = unwrapValue(definition.Quantities);
  if (Array.isArray(quantities)) {
    for (const quantity of quantities) {
      if (!isRecord(quantity)) {
        continue;
      }

      const label = getStringValue(quantity, "Name", "LongName") ?? "quantity";
      if (HIDDEN_PROPERTY_KEYS.has(normalizeKey(label))) {
        continue;
      }

      const value = getMeasurementValue(quantity);
      if (value) {
        rows.push({
          label: formatLabel(label),
          value
        });
      }
    }
  }

  const hasPropertySets = unwrapValue(definition.HasPropertySets);
  if (Array.isArray(hasPropertySets)) {
    for (const propertySet of hasPropertySets) {
      const childSection = buildPropertySetSection(
        propertySet,
        "Property Set",
        nextSeen
      );
      if (childSection) {
        sections.push(childSection);
      }
    }
  }

  if (rows.length === 0 && sections.length === 0) {
    rows.push(
      ...buildPrimitiveRows(definition, [
        "Name",
        "LongName",
        "_category",
        "HasProperties",
        "HasPropertySets",
        "Quantities"
      ])
    );
  }

  if (rows.length === 0 && sections.length === 0) {
    return null;
  }

  return {
    title: formatLabel(title),
    rows,
    sections
  };
}

function isQuantityTitle(title: string) {
  const normalized = normalizeKey(title);
  return (
    normalized.includes("quantity") ||
    normalized.includes("qto") ||
    normalized.includes("materialquantities")
  );
}

function buildIndexedIfcParametersSection(properties: Record<string, unknown>) {
  const indexedProperties = unwrapValue(properties.__ifcProperties);

  if (!isRecord(indexedProperties)) {
    return null;
  }

  const rows = [
    ["Level", indexedProperties.level],
    ["Zoning", indexedProperties.zoning]
  ]
    .map(([label, value]) => ({
      label: String(label),
      value: formatPrimitive(value)
    }))
    .filter(
      (row): row is PropertyRow =>
        typeof row.value === "string" && row.value.length > 0
    );

  if (rows.length === 0) {
    return null;
  }

  return {
    title: "IFC Object Parameters",
    rows,
    sections: []
  } satisfies PropertySection;
}

function collectPropertySetSections(
  source: unknown,
  fallbackTitle: string,
  seen?: WeakSet<object>
) {
  const sections: PropertySection[] = [];

  if (!isRecord(source)) {
    return sections;
  }

  const directSection = buildPropertySetSection(source, fallbackTitle, seen);
  if (directSection) {
    sections.push(directSection);
  }

  const nestedPropertySets = unwrapValue(source.HasPropertySets);
  if (Array.isArray(nestedPropertySets)) {
    for (const propertySet of nestedPropertySets) {
      const section = buildPropertySetSection(propertySet, "Property Set", seen);
      if (section) {
        sections.push(section);
      }
    }
  }

  return sections;
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

  const title = getStringValue(source, "Name", "LayerSetName", "MaterialExpression");
  const normalizedTitle = title ? normalizeKey(title) : null;
  if (
    title &&
    normalizedTitle &&
    !HIDDEN_PROPERTY_KEYS.has(normalizedTitle) &&
    !["material", "materiallist", "materiallayersetusage"].includes(
      normalizedTitle
    ) &&
    !normalizedTitle.startsWith("ifc")
  ) {
    values.add(title);
  }

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeKey(key);
    if (
      STRUCTURAL_KEYS.has(normalizedKey) ||
      HIDDEN_PROPERTY_KEYS.has(normalizedKey) ||
      ["ownerhistory", "representation", "objectplacement"].includes(normalizedKey)
    ) {
      continue;
    }

    collectMaterialNames(value, values, nextSeen, depth + 1);
  }

  return values;
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

function collectAssociatedMaterialSources(properties: Record<string, unknown>) {
  const sources: unknown[] = [];

  addRelatingMaterialSources(properties.HasAssociations, sources);
  addTypeMaterialSources(properties.IsTypedBy, sources);
  addTypeMaterialSources(properties.DefinesOccurrence, sources);

  return sources;
}

function buildPropertiesSection(properties: Record<string, unknown>) {
  const directProperties = unwrapValue(properties.properties);

  if (isRecord(directProperties)) {
    const rows = buildPrimitiveRows(directProperties);
    if (rows.length > 0) {
      return {
        title: "properties",
        rows,
        sections: []
      } satisfies PropertySection;
    }
  }

  const fallbackRows = buildPrimitiveRows(properties, [
    "Name",
    "LongName",
    "_guid",
    "_category",
    "type",
    "Type",
    "category",
    "Properties"
  ]);

  if (fallbackRows.length === 0) {
    return null;
  }

  return {
    title: "properties",
    rows: fallbackRows,
    sections: []
  } satisfies PropertySection;
}

function buildMaterialSection(properties: Record<string, unknown>) {
  const materialSources = collectAssociatedMaterialSources(properties);
  const names = [...collectMaterialNames(materialSources)].sort((left, right) =>
    left.localeCompare(right)
  );

  if (names.length === 0) {
    return null;
  }

  return {
    title: "Material Quantities",
    rows: [],
    sections: names.map((name) => ({
      title: name,
      rows: [],
      sections: [],
      leaf: true
    }))
  } satisfies PropertySection;
}

function buildParametersSection(properties: Record<string, unknown>) {
  const instanceSections: PropertySection[] = [];
  const typeSections: PropertySection[] = [];

  const isDefinedBy = unwrapValue(properties.IsDefinedBy);
  if (Array.isArray(isDefinedBy)) {
    for (const relation of isDefinedBy) {
      if (!isRecord(relation) || !relation.RelatingPropertyDefinition) {
        continue;
      }

      const section = buildPropertySetSection(
        relation.RelatingPropertyDefinition,
        "Property Set",
        new WeakSet<object>()
      );

      if (!section || isQuantityTitle(section.title)) {
        continue;
      }

      instanceSections.push(section);
    }
  }

  const typeRelations = [
    unwrapValue(properties.IsTypedBy),
    unwrapValue(properties.DefinesOccurrence)
  ];

  for (const relationList of typeRelations) {
    if (!Array.isArray(relationList)) {
      continue;
    }

    for (const relation of relationList) {
      if (!isRecord(relation) || !relation.RelatingType) {
        continue;
      }

      const sections = collectPropertySetSections(
        relation.RelatingType,
        "Type",
        new WeakSet<object>()
      );
      for (const section of sections) {
        if (isQuantityTitle(section.title)) {
          continue;
        }

        typeSections.push(section);
      }
    }
  }

  if (instanceSections.length === 0 && typeSections.length === 0) {
    return null;
  }

  return {
    title: "Parameters",
    rows: [],
    sections: [
      {
        title: "Instance Parameters",
        rows: [],
        sections: instanceSections
      },
      {
        title: "Type Parameters",
        rows: [],
        sections: typeSections
      }
    ].filter((section) => section.sections.length > 0)
  } satisfies PropertySection;
}

function buildRootSections(properties: Record<string, unknown>) {
  const sections: PropertySection[] = [];

  const propertiesSection = buildPropertiesSection(properties);
  if (propertiesSection) {
    sections.push(propertiesSection);
  }

  const materialSection = buildMaterialSection(properties);
  if (materialSection) {
    sections.push(materialSection);
  }

  const indexedParametersSection = buildIndexedIfcParametersSection(properties);
  if (indexedParametersSection) {
    sections.push(indexedParametersSection);
  }

  const parametersSection = buildParametersSection(properties);
  if (parametersSection) {
    sections.push(parametersSection);
  }

  return sections;
}

function PropertySectionBlock({
  section,
  depth = 0
}: {
  section: PropertySection;
  depth?: number;
}) {
  const hasBody = section.rows.length > 0 || section.sections.length > 0;
  const isLeaf = section.leaf === true;

  if (!hasBody && !isLeaf) {
    return null;
  }

  if (isLeaf) {
    return (
      <div className="rounded-md border border-[#d8dde6] bg-[#f8fafc] px-3 py-2 text-sm text-[#263142]">
        {section.title}
      </div>
    );
  }

  return (
    <details
      open={depth < 2}
      className="rounded-md border border-[#d8dde6] bg-white"
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-[#263142] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-[#6b7280]">{depth < 1 ? "\u25be" : "\u25b8"}</span>
          {section.title}
        </span>
      </summary>

      {hasBody ? (
        <div className="border-t border-[#eef2f6] px-3 py-2.5">
          {section.rows.length > 0 ? (
            <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              {section.rows.map((row, index) => (
                <div
                  key={`${section.title}-${row.label}-${index}`}
                  className="contents"
                >
                  <dt className="text-[#667085]">{row.label}</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words text-[#263142]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {section.sections.length > 0 ? (
            <div className={section.rows.length > 0 ? "mt-2 space-y-2" : "space-y-2"}>
              {section.sections.map((childSection, index) => (
                <PropertySectionBlock
                  key={`${section.title}-${childSection.title}-${index}`}
                  section={childSection}
                  depth={depth + 1}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}

export function PropertyAccordion({
  overviewRows = [],
  properties,
  rootTitle = "Object"
}: PropertyAccordionProps) {
  const sections = properties ? buildRootSections(properties) : [];
  const rootSection =
    overviewRows.length > 0 || sections.length > 0
      ? {
          title: rootTitle,
          rows: overviewRows,
          sections
        }
      : null;

  return (
    <section className="space-y-2">
      {!rootSection ? (
        <div className="rounded-md border border-[#d8dde6] bg-white px-4 py-5 text-sm text-[#667085]">
          No property information available.
        </div>
      ) : (
        <>
          <PropertySectionBlock section={rootSection} />
          <div className="flex items-center justify-between px-1 text-xs text-[#98a2b3]">
            <span>elements</span>
            <span>(0)</span>
          </div>
        </>
      )}
    </section>
  );
}
