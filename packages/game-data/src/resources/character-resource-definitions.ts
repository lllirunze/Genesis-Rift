import type {
  CharacterResourceDefinition,
  CharacterResourceDefinitionCatalog,
} from "@genesis-rift/shared";

export const HEALTH_RESOURCE_DEFINITION = {
  resourceId: "health",
  maximumDerivedAttribute: "maxHealth",
  minimum: 0,
  initialValue: { kind: "maximum" },
} as const satisfies CharacterResourceDefinition<"health", "maxHealth">;

export const CHARACTER_RESOURCE_DEFINITIONS = {
  health: HEALTH_RESOURCE_DEFINITION,
} as const satisfies CharacterResourceDefinitionCatalog<"health", "maxHealth">;
