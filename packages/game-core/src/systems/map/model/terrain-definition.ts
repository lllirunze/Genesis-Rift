export interface TerrainDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly tags: readonly string[];
}

export type TerrainDefinitionCatalog = Readonly<Record<string, TerrainDefinition>>;

export function validateTerrainDefinition(definition: TerrainDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertUniqueNonEmptyStrings(definition.tags, "tags");
}

export function validateTerrainDefinitionCatalog(catalog: TerrainDefinitionCatalog): void {
  for (const [catalogId, definition] of Object.entries(catalog)) {
    validateTerrainDefinition(definition);

    if (catalogId !== definition.definitionId) {
      throw new Error(
        `Terrain catalog key ${catalogId} does not match definition id ${definition.definitionId}`,
      );
    }
  }
}

export function getTerrainDefinition(
  catalog: TerrainDefinitionCatalog,
  definitionId: string,
): TerrainDefinition {
  const definition = catalog[definitionId];

  if (definition === undefined) {
    throw new Error(`Unknown terrain definition: ${definitionId}`);
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
