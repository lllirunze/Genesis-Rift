import type { RegionDefinition, RegionDefinitionCatalog } from "@genesis-rift/game-core";

export const WILDERNESS_REGION_DEFINITION = {
  definitionId: "region.wilderness",
  name: "Wilderness",
  category: "wilderness",
  tags: ["outdoor"],
} as const satisfies RegionDefinition;

export const CIVILIZED_REGION_DEFINITION = {
  definitionId: "region.civilized",
  name: "Civilized Area",
  category: "civilized",
  tags: ["settlement", "safe-area"],
} as const satisfies RegionDefinition;

export const SPECIAL_REGION_DEFINITION = {
  definitionId: "region.special",
  name: "Special Area",
  category: "special",
  tags: ["special-rule"],
} as const satisfies RegionDefinition;

export const REGION_DEFINITION_CATALOG = {
  [WILDERNESS_REGION_DEFINITION.definitionId]: WILDERNESS_REGION_DEFINITION,
  [CIVILIZED_REGION_DEFINITION.definitionId]: CIVILIZED_REGION_DEFINITION,
  [SPECIAL_REGION_DEFINITION.definitionId]: SPECIAL_REGION_DEFINITION,
} as const satisfies RegionDefinitionCatalog;
