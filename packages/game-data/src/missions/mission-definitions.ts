import type { MissionDefinition, MissionDefinitionCatalog } from "@genesis-rift/game-core";

/** 当前业务对象的静态定义配置。 */
export const MAGE_IDENTITY_MISSION = createMission({
  missionId: "mission_000001",
  name: "arcaneMastery",
  description: "Demonstrate mastery of arcane power.",
  type: "identity",
  progressKey: "identity.arcaneAction",
  requiredProgress: 3,
  difficulty: "standard",
  identityIds: ["identity.mage"],
  gameplayTags: ["battle", "skill"],
  replacementGroupId: "identity.mage",
});

/** 当前业务对象的静态定义配置。 */
export const ASSASSIN_IDENTITY_MISSION = createMission({
  missionId: "mission_000002",
  name: "silentElimination",
  description: "Complete precise eliminations without being detected.",
  type: "identity",
  progressKey: "identity.assassination",
  requiredProgress: 3,
  difficulty: "standard",
  identityIds: ["identity.assassin"],
  gameplayTags: ["battle", "stealth"],
  replacementGroupId: "identity.assassin",
});

/** 当前业务对象的静态定义配置。 */
export const THIEF_IDENTITY_MISSION = createMission({
  missionId: "mission_000003",
  name: "shadowAcquisition",
  description: "Acquire valuable resources through cunning exploration.",
  type: "identity",
  progressKey: "identity.theft",
  requiredProgress: 3,
  difficulty: "standard",
  identityIds: ["identity.thief"],
  gameplayTags: ["explore", "resource"],
  replacementGroupId: "identity.thief",
});

/** 当前业务对象的静态定义配置。 */
export const RANGER_IDENTITY_MISSION = createMission({
  missionId: "mission_000004",
  name: "wildlandPathfinder",
  description: "Chart a path through unexplored wildlands.",
  type: "identity",
  progressKey: "identity.rangerExplore",
  requiredProgress: 4,
  difficulty: "standard",
  identityIds: ["identity.ranger"],
  gameplayTags: ["explore", "movement"],
  replacementGroupId: "identity.ranger",
});

/** 当前业务对象的静态定义配置。 */
export const DEMON_IDENTITY_MISSION = createMission({
  missionId: "mission_000005",
  name: "demonicConquest",
  description: "Overcome formidable opponents through overwhelming power.",
  type: "identity",
  progressKey: "identity.demonVictory",
  requiredProgress: 3,
  difficulty: "challenge",
  identityIds: ["identity.demon"],
  gameplayTags: ["battle", "boss"],
  replacementGroupId: "identity.demon",
});

/** 当前业务对象的静态定义配置。 */
export const MATRIARCH_IDENTITY_MISSION = createMission({
  missionId: "mission_000006",
  name: "elderWisdom",
  description: "Resolve the world's mysteries through insight.",
  type: "identity",
  progressKey: "identity.matriarchInsight",
  requiredProgress: 3,
  difficulty: "standard",
  identityIds: ["identity.matriarch"],
  gameplayTags: ["event", "explore"],
  replacementGroupId: "identity.matriarch",
});

/** 当前业务对象的静态定义配置。 */
export const FAITH_MISSION = createMission({
  missionId: "mission_000007",
  name: "faithfulOffering",
  description: "Answer the call of your hidden faith.",
  type: "faith",
  progressKey: "faith.devotion",
  requiredProgress: 2,
  difficulty: "standard",
  gameplayTags: ["event", "interaction"],
  replacementGroupId: "faith.general",
});

/** 当前业务对象的静态定义配置。 */
export const FAITH_MISSION_ALTERNATIVE = createMission({
  missionId: "mission_000008",
  name: "faithfulPilgrimage",
  description: "Follow a hidden sign to a sacred destination.",
  type: "faith",
  progressKey: "faith.pilgrimage",
  requiredProgress: 1,
  difficulty: "standard",
  gameplayTags: ["explore", "interaction"],
  replacementGroupId: "faith.general",
});

/** 当前业务对象的静态定义配置。 */
export const GROWTH_MISSION = createMission({
  missionId: "mission_000009",
  name: "forgedProgress",
  description: "Craft equipment that strengthens your journey.",
  type: "growth",
  progressKey: "growth.craft",
  requiredProgress: 1,
  difficulty: "standard",
  gameplayTags: ["crafting", "equipment"],
  replacementGroupId: "growth.general",
});

/** 当前业务对象的静态定义配置。 */
export const GROWTH_MISSION_ALTERNATIVE = createMission({
  missionId: "mission_000010",
  name: "seasonedAdventurer",
  description: "Reach a new level of personal growth.",
  type: "growth",
  progressKey: "growth.levelUp",
  requiredProgress: 2,
  difficulty: "standard",
  gameplayTags: ["level", "growth"],
  replacementGroupId: "growth.general",
});

/** 当前业务对象的静态定义配置。 */
export const WORLD_MISSION = createMission({
  missionId: "mission_000011",
  name: "frontierDiscovery",
  description: "Discover distant regions beyond the known frontier.",
  type: "world",
  progressKey: "world.discoverRegion",
  requiredProgress: 3,
  difficulty: "standard",
  gameplayTags: ["explore", "map"],
  replacementGroupId: "world.general",
});

/** 当前业务对象的静态定义配置。 */
export const WORLD_MISSION_ALTERNATIVE = createMission({
  missionId: "mission_000012",
  name: "riftInvestigation",
  description: "Investigate the changes caused by the world's rift.",
  type: "world",
  progressKey: "world.riftInvestigation",
  requiredProgress: 2,
  difficulty: "challenge",
  gameplayTags: ["event", "map"],
  replacementGroupId: "world.general",
});

/** 当前业务对象的静态定义配置。 */
export const FREE_MISSION = createMission({
  missionId: "mission_000013",
  name: "merchantNetwork",
  description: "Complete profitable exchanges throughout the world.",
  type: "free",
  progressKey: "free.trade",
  requiredProgress: 2,
  difficulty: "basic",
  gameplayTags: ["economy", "interaction"],
  replacementGroupId: "free.general",
});

/** 当前业务对象的静态定义配置。 */
export const FREE_MISSION_ALTERNATIVE = createMission({
  missionId: "mission_000014",
  name: "fortuneSeeker",
  description: "Uncover opportunities hidden across the world.",
  type: "free",
  progressKey: "free.fortune",
  requiredProgress: 2,
  difficulty: "standard",
  gameplayTags: ["event", "resource"],
  replacementGroupId: "free.general",
});

/** 当前版本提供的使命静态定义注册表。 */
export const MISSION_DEFINITION_CATALOG = {
  [MAGE_IDENTITY_MISSION.missionId]: MAGE_IDENTITY_MISSION,
  [ASSASSIN_IDENTITY_MISSION.missionId]: ASSASSIN_IDENTITY_MISSION,
  [THIEF_IDENTITY_MISSION.missionId]: THIEF_IDENTITY_MISSION,
  [RANGER_IDENTITY_MISSION.missionId]: RANGER_IDENTITY_MISSION,
  [DEMON_IDENTITY_MISSION.missionId]: DEMON_IDENTITY_MISSION,
  [MATRIARCH_IDENTITY_MISSION.missionId]: MATRIARCH_IDENTITY_MISSION,
  [FAITH_MISSION.missionId]: FAITH_MISSION,
  [FAITH_MISSION_ALTERNATIVE.missionId]: FAITH_MISSION_ALTERNATIVE,
  [GROWTH_MISSION.missionId]: GROWTH_MISSION,
  [GROWTH_MISSION_ALTERNATIVE.missionId]: GROWTH_MISSION_ALTERNATIVE,
  [WORLD_MISSION.missionId]: WORLD_MISSION,
  [WORLD_MISSION_ALTERNATIVE.missionId]: WORLD_MISSION_ALTERNATIVE,
  [FREE_MISSION.missionId]: FREE_MISSION,
  [FREE_MISSION_ALTERNATIVE.missionId]: FREE_MISSION_ALTERNATIVE,
} as const satisfies MissionDefinitionCatalog;

/** 创建默认开放条件下的使命静态定义，避免各资源重复维护不变字段。 */
function createMission(
  definition: Omit<MissionDefinition, "eligibility" | "conflictTags" | "baseWeight"> & {
    readonly identityIds?: readonly string[];
  },
): MissionDefinition {
  return {
    ...definition,
    baseWeight: 1,
    eligibility: {
      identityIds: definition.identityIds ?? [],
      faithIds: [],
      requiredModuleIds: [],
      requiredContentIds: [],
      requiredWorldStateKeys: [],
    },
    conflictTags: [],
  };
}
