import type { RaceConfig, RaceName } from "./race-config.ts";

/** 独立于职业初始值计算的种族属性偏移配置。 */
export const RACE_CONFIGS = {
  /** 不改变五维属性分布的人族配置。 */
  human: {
    id: "race.human",
    name: "human",
    nameKey: "race.human.name",
    attributeTendencies: {
      increased: [],
      decreased: [],
    },
    initialPrimaryAttributeOffset: {
      strength: 0,
      constitution: 0,
      spirit: 0,
      agility: 0,
      insight: 0,
    },
  },
  /** 偏向灵力与悟性的神族配置。 */
  divine: {
    id: "race.divine",
    name: "divine",
    nameKey: "race.divine.name",
    attributeTendencies: {
      increased: ["spirit", "insight"],
      decreased: ["strength", "constitution", "agility"],
    },
    initialPrimaryAttributeOffset: {
      strength: -1,
      constitution: -1,
      spirit: 2,
      agility: -1,
      insight: 1,
    },
  },
  /** 偏向力量与体质的魔族配置。 */
  demon: {
    id: "race.demon",
    name: "demon",
    nameKey: "race.demon.name",
    attributeTendencies: {
      increased: ["strength", "constitution"],
      decreased: ["spirit", "agility", "insight"],
    },
    initialPrimaryAttributeOffset: {
      strength: 2,
      constitution: 1,
      spirit: -1,
      agility: -1,
      insight: -1,
    },
  },
  /** 偏向敏捷与悟性的妖族配置。 */
  yokai: {
    id: "race.yokai",
    name: "yokai",
    nameKey: "race.yokai.name",
    attributeTendencies: {
      increased: ["agility", "insight"],
      decreased: ["strength", "constitution", "spirit"],
    },
    initialPrimaryAttributeOffset: {
      strength: -1,
      constitution: -1,
      spirit: -1,
      agility: 2,
      insight: 1,
    },
  },
} as const satisfies Record<RaceName, RaceConfig>;

/** 供需要顺序遍历种族配置的业务使用的只读列表。 */
export const RACE_CONFIG_LIST: readonly RaceConfig[] = Object.values(RACE_CONFIGS);
