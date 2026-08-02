import { REGION_CATEGORIES } from "../map-content-config.ts";

export type RegionCategory = (typeof REGION_CATEGORIES)[number];

export interface RegionDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly category: RegionCategory;
  readonly tags: readonly string[];
}

export type RegionDefinitionCatalog = Readonly<Record<string, RegionDefinition>>;

export function validateRegionDefinition(definition: RegionDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");

  if (!REGION_CATEGORIES.includes(definition.category)) {
    throw new RangeError(`Unsupported region category: ${definition.category}`);
  }

  assertUniqueNonEmptyStrings(definition.tags, "tags");
}

export function validateRegionDefinitionCatalog(catalog: RegionDefinitionCatalog): void {
  for (const [catalogId, definition] of Object.entries(catalog)) {
    validateRegionDefinition(definition);

    if (catalogId !== definition.definitionId) {
      throw new Error(
        `Region catalog key ${catalogId} does not match definition id ${definition.definitionId}`,
      );
    }
  }
}

export function getRegionDefinition(
  catalog: RegionDefinitionCatalog,
  definitionId: string,
): RegionDefinition {
  const definition = catalog[definitionId];

  if (definition === undefined) {
    throw new Error(`Unknown region definition: ${definitionId}`);
  }

  return definition;
}

function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
