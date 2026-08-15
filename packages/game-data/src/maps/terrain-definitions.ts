import type { TerrainDefinition, TerrainDefinitionCatalog } from "@genesis-rift/game-core";

/** 当前业务对象的静态定义配置。 */
export const PLAIN_TERRAIN_DEFINITION = {
  definitionId: "terrain_000001",
  name: "Plain",
  tags: ["land", "open"],
  movementCostModifier: 0,
} as const satisfies TerrainDefinition;

/** 当前业务对象的静态定义配置。 */
export const FOREST_TERRAIN_DEFINITION = {
  definitionId: "terrain_000002",
  name: "Forest",
  tags: ["land", "vegetation"],
  movementCostModifier: 1,
} as const satisfies TerrainDefinition;

/** 当前业务对象的静态定义配置。 */
export const MOUNTAIN_TERRAIN_DEFINITION = {
  definitionId: "terrain_000003",
  name: "Mountain",
  tags: ["land", "highland"],
  movementCostModifier: 2,
} as const satisfies TerrainDefinition;

/** 当前业务对象的静态定义配置。 */
export const RIVER_TERRAIN_DEFINITION = {
  definitionId: "terrain_000004",
  name: "River",
  tags: ["water", "flowing"],
  movementCostModifier: 2,
} as const satisfies TerrainDefinition;

/** 当前业务对象的静态定义配置。 */
export const DESERT_TERRAIN_DEFINITION = {
  definitionId: "terrain_000005",
  name: "Desert",
  tags: ["land", "arid"],
  movementCostModifier: 1,
} as const satisfies TerrainDefinition;

/** 当前业务对象的静态定义配置。 */
export const SNOW_TERRAIN_DEFINITION = {
  definitionId: "terrain_000006",
  name: "Snow",
  tags: ["land", "cold"],
  movementCostModifier: 2,
} as const satisfies TerrainDefinition;

/** 当前模块使用的只读配置注册表。 */
export const TERRAIN_DEFINITION_CATALOG = {
  [PLAIN_TERRAIN_DEFINITION.definitionId]: PLAIN_TERRAIN_DEFINITION,
  [FOREST_TERRAIN_DEFINITION.definitionId]: FOREST_TERRAIN_DEFINITION,
  [MOUNTAIN_TERRAIN_DEFINITION.definitionId]: MOUNTAIN_TERRAIN_DEFINITION,
  [RIVER_TERRAIN_DEFINITION.definitionId]: RIVER_TERRAIN_DEFINITION,
  [DESERT_TERRAIN_DEFINITION.definitionId]: DESERT_TERRAIN_DEFINITION,
  [SNOW_TERRAIN_DEFINITION.definitionId]: SNOW_TERRAIN_DEFINITION,
} as const satisfies TerrainDefinitionCatalog;
