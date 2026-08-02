import type {
  CharacterResourceDefinition,
  CharacterResourceDefinitionCatalog,
} from "@genesis-rift/shared";

/** 生命值资源与最大生命派生属性之间的运行时关系。 */
export const HEALTH_RESOURCE_DEFINITION = {
  resourceId: "health",
  maximumDerivedAttribute: "maxHealth",
  minimum: 0,
  initialValue: { kind: "maximum" },
} as const satisfies CharacterResourceDefinition<"health", "maxHealth">;

/** 当前角色运行时资源定义注册表。 */
export const CHARACTER_RESOURCE_DEFINITIONS = {
  health: HEALTH_RESOURCE_DEFINITION,
} as const satisfies CharacterResourceDefinitionCatalog<"health", "maxHealth">;
