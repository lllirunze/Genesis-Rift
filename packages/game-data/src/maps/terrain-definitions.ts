import type { TerrainDefinition, TerrainDefinitionCatalog } from "@genesis-rift/game-core";

export const PLAIN_TERRAIN_DEFINITION = {
  definitionId: "terrain.plain",
  name: "Plain",
  tags: ["land", "open"],
} as const satisfies TerrainDefinition;

export const FOREST_TERRAIN_DEFINITION = {
  definitionId: "terrain.forest",
  name: "Forest",
  tags: ["land", "vegetation"],
} as const satisfies TerrainDefinition;

export const MOUNTAIN_TERRAIN_DEFINITION = {
  definitionId: "terrain.mountain",
  name: "Mountain",
  tags: ["land", "highland"],
} as const satisfies TerrainDefinition;

export const RIVER_TERRAIN_DEFINITION = {
  definitionId: "terrain.river",
  name: "River",
  tags: ["water", "flowing"],
} as const satisfies TerrainDefinition;

export const TERRAIN_DEFINITION_CATALOG = {
  [PLAIN_TERRAIN_DEFINITION.definitionId]: PLAIN_TERRAIN_DEFINITION,
  [FOREST_TERRAIN_DEFINITION.definitionId]: FOREST_TERRAIN_DEFINITION,
  [MOUNTAIN_TERRAIN_DEFINITION.definitionId]: MOUNTAIN_TERRAIN_DEFINITION,
  [RIVER_TERRAIN_DEFINITION.definitionId]: RIVER_TERRAIN_DEFINITION,
} as const satisfies TerrainDefinitionCatalog;
