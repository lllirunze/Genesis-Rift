import {
  validateBlueprintDefinitionCatalog,
  validateCharacterResourceDefinitions,
  validateContractDefinitionCatalog,
  validateEquipmentDefinitions,
  validateEventDefinitionCatalog,
  validateEventPoolDefinitionCatalog,
  validateHandCardDefinitions,
  validateItemDefinitionCatalog,
  validateMapContentDefinitionCatalog,
  validateMissionDefinitionCatalog,
  validateNpcDefinitionCatalog,
  validateQuestDefinitionCatalog,
  validateQuestRewardPoolCatalog,
  validateShopDefinitionCatalog,
  validateSkillDefinitionCatalog,
  validateStatusDefinitions,
  validateWeatherDefinitionCatalog,
  validateWeatherDisasterDefinition,
  validateWeatherEffectDefinitionCatalog,
} from "@genesis-rift/game-core";

import { BLUEPRINT_DEFINITION_CATALOG } from "../blueprints/blueprint-definitions.ts";
import { CONTRACT_DEFINITIONS } from "../contracts/contract-definitions.ts";
import { EVENT_DEFINITION_CATALOG } from "../events/event-definitions.ts";
import { EVENT_POOL_DEFINITION_CATALOG } from "../events/event-pool-definitions.ts";
import { EQUIPMENT_DEFINITION_CATALOG } from "../equipment/equipment-definitions.ts";
import { HAND_CARD_CATALOG } from "../hand-cards/hand-card-definitions.ts";
import { IDENTITY_CONFIG_LIST } from "../identities/identity-configs.ts";
import { ITEM_DEFINITION_CATALOG } from "../items/item-definitions.ts";
import { LEVEL_SYSTEM_CONFIG } from "../levels/level-config.ts";
import { MAP_CONTENT_DEFINITION_CATALOG } from "../maps/map-content-definitions.ts";
import { MISSION_DEFINITION_CATALOG } from "../missions/mission-definitions.ts";
import { NPC_DEFINITION_CATALOG } from "../npcs/npc-definitions.ts";
import { QUEST_DEFINITION_CATALOG } from "../quests/quest-definitions.ts";
import { QUEST_REWARD_POOL_CATALOG } from "../quests/quest-reward-pools.ts";
import { RACE_CONFIG_LIST } from "../races/race-configs.ts";
import { CHARACTER_RESOURCE_DEFINITIONS } from "../resources/character-resource-definitions.ts";
import { SHOP_DEFINITION_CATALOG } from "../shops/shop-definitions.ts";
import { SKILL_DEFINITION_CATALOG } from "../skills/skill-definitions.ts";
import { STATUS_DEFINITION_CATALOG } from "../statuses/status-definitions.ts";
import {
  WEATHER_DEFINITION_CATALOG,
  WEATHER_DISASTER_DEFINITION_CATALOG,
} from "../weather/weather-config.ts";
import { WEATHER_EFFECT_DEFINITION_CATALOG } from "../weather/weather-effect-config.ts";
import { validateIdentityConfigs } from "./validate-identity-configs.ts";
import { validateLevelSystemConfig } from "./validate-level-system-config.ts";
import { validateRaceConfigs } from "./validate-race-configs.ts";

/**
 * 方法名：validateGameData
 * 作用：在应用启动前集中校验全部正式静态资源及其跨目录引用关系。
 * @returns 无返回值。
 * @throws 任意配置编号、字段或关联对象无效时抛出错误并阻止服务器启动。
 */
export function validateGameData(): void {
  validateIdentityConfigs(IDENTITY_CONFIG_LIST);
  validateRaceConfigs(RACE_CONFIG_LIST);
  validateLevelSystemConfig(LEVEL_SYSTEM_CONFIG);
  validateCharacterResourceDefinitions(CHARACTER_RESOURCE_DEFINITIONS);
  validateItemDefinitionCatalog(ITEM_DEFINITION_CATALOG);
  validateEquipmentDefinitions(Object.values(EQUIPMENT_DEFINITION_CATALOG));
  validateHandCardDefinitions(Object.values(HAND_CARD_CATALOG));
  validateStatusDefinitions(Object.values(STATUS_DEFINITION_CATALOG));
  validateMapContentDefinitionCatalog(MAP_CONTENT_DEFINITION_CATALOG);
  validateWeatherDefinitionCatalog(WEATHER_DEFINITION_CATALOG);
  Object.values(WEATHER_DISASTER_DEFINITION_CATALOG).forEach(validateWeatherDisasterDefinition);
  validateWeatherEffectDefinitionCatalog(WEATHER_EFFECT_DEFINITION_CATALOG);
  validateEventDefinitionCatalog(EVENT_DEFINITION_CATALOG);
  validateEventPoolDefinitionCatalog(EVENT_POOL_DEFINITION_CATALOG, EVENT_DEFINITION_CATALOG);
  validateMissionDefinitionCatalog(MISSION_DEFINITION_CATALOG);
  validateQuestRewardPoolCatalog(QUEST_REWARD_POOL_CATALOG);
  validateQuestDefinitionCatalog(QUEST_DEFINITION_CATALOG);
  validateBlueprintDefinitionCatalog(BLUEPRINT_DEFINITION_CATALOG, ITEM_DEFINITION_CATALOG);
  validateNpcDefinitionCatalog(NPC_DEFINITION_CATALOG);
  validateShopDefinitionCatalog(SHOP_DEFINITION_CATALOG, ITEM_DEFINITION_CATALOG);
  validateSkillDefinitionCatalog(SKILL_DEFINITION_CATALOG);
  validateContractDefinitionCatalog(CONTRACT_DEFINITIONS);
}
