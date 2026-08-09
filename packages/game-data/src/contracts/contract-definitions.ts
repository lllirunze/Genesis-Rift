import {
  validateContractDefinitionCatalog,
  type ContractDefinitionCatalog,
} from "@genesis-rift/game-core";

/** 首批神鬼契约资源；契约完整内容仅应同步给所属玩家和权威审计端。 */
export const CONTRACT_DEFINITIONS: ContractDefinitionCatalog = Object.freeze({
  contract_000001: Object.freeze({
    contractId: "contract_000001",
    name: "bloodboundBlade",
    description: "Your strikes grow stronger, but healing items will eventually abandon you.",
    strength: "STRONG",
    baseWeight: 10,
    triggerTags: Object.freeze(["NIGHT_EVENT", "RUIN_EXPLORATION"]),
    allowedWorldStageIds: Object.freeze(["RIFT_STAGE", "CREATION_STAGE"]),
    buff: Object.freeze({
      effectId: "physical_attack_bonus",
      type: "ATTRIBUTE_MODIFIER",
      value: 4,
      tags: Object.freeze(["physicalAttack", "permanent"]),
    }),
    debuff: Object.freeze({
      effectId: "disable_active_healing_item",
      type: "GAMEPLAY_RULE",
      value: null,
      tags: Object.freeze(["healing", "item", "permanent"]),
    }),
    debuffTrigger: Object.freeze({
      type: "PERSONAL_TURN",
      personalTurnDelay: 7,
      worldStageId: null,
      latestPersonalTurn: null,
    }),
  }),
});

validateContractDefinitionCatalog(CONTRACT_DEFINITIONS);
