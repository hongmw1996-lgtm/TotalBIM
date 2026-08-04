"use client";

type EntityRecord = {
  type: string;
  args: string[];
};

export type IfcMaterialIndex = Map<number, string[]>;
export type IfcObjectPropertyIndex = Map<number, Record<string, string>>;
export type IfcObjectIndexedProperty = {
  name: string;
  value: string;
};

function decodeStepString(value: string) {
  return value
    .replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, (_match, hex: string) => {
      const codePoints: string[] = [];
      for (let index = 0; index < hex.length; index += 4) {
        const code = Number.parseInt(hex.slice(index, index + 4), 16);
        if (Number.isFinite(code)) {
          codePoints.push(String.fromCharCode(code));
        }
      }
      return codePoints.join("");
    })
    .replace(/''/g, "'");
}

function unquoteStepString(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) {
    return null;
  }

  return decodeStepString(trimmed.slice(1, -1)).trim() || null;
}

function splitTopLevel(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let inString = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "'") {
      if (inString && nextChar === "'") {
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      parts.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(input.slice(start).trim());
  return parts;
}

function extractRefs(value: string) {
  return [...value.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function extractStepString(value: string) {
  const stringMatch = value.match(/'((?:''|[^'])*)'/);
  return stringMatch ? decodeStepString(stringMatch[1]).trim() || null : null;
}

function normalizeMaterialName(name: string | null) {
  if (!name) {
    return null;
  }

  const trimmed = name.trim();
  if (!trimmed || /^ifc/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function parseIfcEntities(ifcText: string) {
  const entities = new Map<number, EntityRecord>();
  const entityPattern = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([\s\S]*?)\);/g;
  let match: RegExpExecArray | null;

  while ((match = entityPattern.exec(ifcText)) !== null) {
    entities.set(Number(match[1]), {
      type: match[2],
      args: splitTopLevel(match[3])
    });
  }

  return entities;
}

function normalizePropertyName(name: string | null) {
  return name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

function getSingleValueProperty(entity: EntityRecord) {
  if (entity.type !== "IFCPROPERTYSINGLEVALUE") {
    return null;
  }

  const name = unquoteStepString(entity.args[0] ?? "");
  const value = extractStepString(entity.args[2] ?? "");

  if (!name || !value) {
    return null;
  }

  return { name, value };
}

function getPropertySetValues(
  propertySetId: number,
  entities: Map<number, EntityRecord>
) {
  const propertySet = entities.get(propertySetId);
  if (!propertySet) {
    return {};
  }

  const propertyRefs = extractRefs(propertySet.args.join(","));
  const values: Record<string, string> = {};

  for (const propertyRef of propertyRefs) {
    const property = entities.get(propertyRef);
    if (!property) {
      continue;
    }

    const singleValue = getSingleValueProperty(property);
    if (!singleValue) {
      continue;
    }

    const normalizedName = normalizePropertyName(singleValue.name);
    values[normalizedName] = singleValue.value;
    values[`__name:${normalizedName}`] = singleValue.name;
  }

  return values;
}

export function getIndexedPropertyValue(
  properties: Record<string, string> | null | undefined,
  propertyName: string
) {
  return properties?.[normalizePropertyName(propertyName)]?.trim() || null;
}

export function getIndexedPropertiesForDisplay(
  properties: Record<string, string> | null | undefined
) {
  if (!properties) {
    return [];
  }

  return Object.entries(properties)
    .filter(([name, value]) => !name.startsWith("__name:") && value.trim())
    .map(([name, value]) => ({
      name: properties[`__name:${name}`] ?? name,
      value
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildIfcObjectPropertyIndex(
  ifcText: string
): IfcObjectPropertyIndex {
  const entities = parseIfcEntities(ifcText);
  const index: IfcObjectPropertyIndex = new Map();

  for (const entity of entities.values()) {
    if (entity.type !== "IFCRELDEFINESBYPROPERTIES") {
      continue;
    }

    const relatedObjectIds = extractRefs(entity.args[4] ?? "");
    const propertySetId = extractRefs(entity.args[5] ?? "")[0];
    if (!propertySetId || relatedObjectIds.length === 0) {
      continue;
    }

    const values = getPropertySetValues(propertySetId, entities);
    if (Object.keys(values).length === 0) {
      continue;
    }

    for (const objectId of relatedObjectIds) {
      index.set(objectId, {
        ...(index.get(objectId) ?? {}),
        ...values
      });
    }
  }

  for (const entity of entities.values()) {
    if (entity.type !== "IFCRELDEFINESBYTYPE") {
      continue;
    }

    const relatedObjectIds = extractRefs(entity.args[4] ?? "");
    const typeObjectId = extractRefs(entity.args[5] ?? "")[0];
    const typeValues = typeObjectId ? index.get(typeObjectId) : null;

    if (!typeValues || relatedObjectIds.length === 0) {
      continue;
    }

    for (const objectId of relatedObjectIds) {
      index.set(objectId, {
        ...typeValues,
        ...(index.get(objectId) ?? {})
      });
    }
  }

  return index;
}

export function buildIfcMaterialIndex(ifcText: string): IfcMaterialIndex {
  const entities = parseIfcEntities(ifcText);
  const materialNames = new Map<number, string>();
  const materialRefs = new Map<number, number[]>();

  for (const [id, entity] of entities) {
    if (entity.type === "IFCMATERIAL") {
      const materialName = normalizeMaterialName(unquoteStepString(entity.args[0] ?? ""));
      if (materialName) {
        materialNames.set(id, materialName);
      }
      continue;
    }

    if (entity.type === "IFCMATERIALLAYER") {
      const refs = extractRefs(entity.args[0] ?? "");
      if (refs.length > 0) {
        materialRefs.set(id, refs);
      }
      continue;
    }

    if (
      entity.type === "IFCMATERIALLAYERSET" ||
      entity.type === "IFCMATERIALLAYERSETUSAGE" ||
      entity.type === "IFCMATERIALLIST" ||
      entity.type === "IFCMATERIALCONSTITUENT" ||
      entity.type === "IFCMATERIALCONSTITUENTSET"
    ) {
      const refs = extractRefs(entity.args.join(","));
      if (refs.length > 0) {
        materialRefs.set(id, refs);
      }
    }
  }

  function resolveMaterialNames(
    id: number,
    seen = new Set<number>()
  ): string[] {
    const directName = materialNames.get(id);
    if (directName) {
      return [directName];
    }

    if (seen.has(id)) {
      return [];
    }
    seen.add(id);

    const names: string[] = [];
    for (const ref of materialRefs.get(id) ?? []) {
      names.push(...resolveMaterialNames(ref, seen));
    }

    return [...new Set(names)];
  }

  const index: IfcMaterialIndex = new Map();

  for (const entity of entities.values()) {
    if (entity.type !== "IFCRELASSOCIATESMATERIAL") {
      continue;
    }

    const relatedObjectIds = extractRefs(entity.args[4] ?? "");
    const materialId = extractRefs(entity.args[5] ?? "")[0];
    if (!materialId || relatedObjectIds.length === 0) {
      continue;
    }

    const names = resolveMaterialNames(materialId);
    if (names.length === 0) {
      continue;
    }

    for (const objectId of relatedObjectIds) {
      const existingNames = index.get(objectId) ?? [];
      index.set(objectId, [...new Set([...existingNames, ...names])]);
    }
  }

  for (const entity of entities.values()) {
    if (entity.type !== "IFCRELDEFINESBYTYPE") {
      continue;
    }

    const relatedObjectIds = extractRefs(entity.args[4] ?? "");
    const typeObjectId = extractRefs(entity.args[5] ?? "")[0];
    const typeMaterialNames = typeObjectId ? index.get(typeObjectId) : null;

    if (!typeMaterialNames || relatedObjectIds.length === 0) {
      continue;
    }

    for (const objectId of relatedObjectIds) {
      const existingNames = index.get(objectId) ?? [];
      index.set(objectId, [
        ...new Set([...existingNames, ...typeMaterialNames])
      ]);
    }
  }

  return index;
}
