import type { EncounterDefinitionCatalog } from "@genesis-rift/game-core";

/** 野外野兽遭遇的首批敌对单位配置。 */
export const WILDERNESS_BEAST_ENCOUNTER_DEFINITION = {
  encounterDefinitionId: "encounter_000001",
  name: "Wild Beast",
  maximumHealth: 28,
  physicalAttack: 8,
  physicalDefense: 2,
  evasionRate: 5,
} as const;

/** 当前版本可由事件创建的全部敌对遭遇配置。 */
export const ENCOUNTER_DEFINITION_CATALOG = {
  [WILDERNESS_BEAST_ENCOUNTER_DEFINITION.encounterDefinitionId]:
    WILDERNESS_BEAST_ENCOUNTER_DEFINITION,
} as const satisfies EncounterDefinitionCatalog;
