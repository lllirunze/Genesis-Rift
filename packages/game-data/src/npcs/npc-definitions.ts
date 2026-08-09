import type { NpcDefinition, NpcDefinitionCatalog } from "@genesis-rift/game-core";

/** 提供装备制造服务的铁匠 NPC 静态定义。 */
export const BLACKSMITH_NPC_DEFINITION = {
  definitionId: "npc_000001",
  name: "blacksmith",
  services: [
    {
      serviceType: "crafting",
      requiredConditionIds: ["condition_000001"],
      requiredEnvironmentTags: ["day"],
    },
  ],
} as const satisfies NpcDefinition;

/** 提供药剂和基础材料的商人 NPC 静态定义。 */
export const MERCHANT_NPC_DEFINITION = {
  definitionId: "npc_000002",
  name: "merchant",
  services: [
    {
      serviceType: "shop",
      requiredConditionIds: [],
      requiredEnvironmentTags: ["day"],
      shopDefinitionId: "shop_000001",
    },
  ],
} as const satisfies NpcDefinition;

/** 当前版本提供的 NPC 静态定义注册表。 */
export const NPC_DEFINITION_CATALOG = {
  [BLACKSMITH_NPC_DEFINITION.definitionId]: BLACKSMITH_NPC_DEFINITION,
  [MERCHANT_NPC_DEFINITION.definitionId]: MERCHANT_NPC_DEFINITION,
} as const satisfies NpcDefinitionCatalog;
