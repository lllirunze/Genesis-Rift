import type { IdentityConfig, IdentityName } from "./identity-config.ts";

/** 六种职业的初始属性、资源名称与立绘配置。 */
export const IDENTITY_CONFIGS = {
  /** 法师职业配置。 */
  mage: {
    id: "identity.mage",
    name: "mage",
    nameKey: "identity.mage.name",
    portraitFile: "mage.avif",
    attributePriorities: {
      primary: ["spirit"],
      secondary: ["insight"],
    },
    initialPrimaryAttributes: {
      strength: 3,
      constitution: 4,
      spirit: 8,
      agility: 4,
      insight: 6,
    },
  },
  /** 杀手职业配置。 */
  assassin: {
    id: "identity.assassin",
    name: "assassin",
    nameKey: "identity.assassin.name",
    portraitFile: "assassin.avif",
    attributePriorities: {
      primary: ["strength", "agility"],
      secondary: [],
    },
    initialPrimaryAttributes: {
      strength: 7,
      constitution: 4,
      spirit: 3,
      agility: 7,
      insight: 4,
    },
  },
  /** 盗贼职业配置。 */
  thief: {
    id: "identity.thief",
    name: "thief",
    nameKey: "identity.thief.name",
    portraitFile: "thief.avif",
    attributePriorities: {
      primary: ["agility"],
      secondary: ["constitution"],
    },
    initialPrimaryAttributes: {
      strength: 4,
      constitution: 6,
      spirit: 3,
      agility: 8,
      insight: 4,
    },
  },
  /** 游侠职业配置。 */
  ranger: {
    id: "identity.ranger",
    name: "ranger",
    nameKey: "identity.ranger.name",
    portraitFile: "ranger.avif",
    attributePriorities: {
      primary: ["agility"],
      secondary: ["spirit"],
    },
    initialPrimaryAttributes: {
      strength: 4,
      constitution: 4,
      spirit: 6,
      agility: 8,
      insight: 3,
    },
  },
  /** 魔王职业配置。 */
  demon: {
    id: "identity.demon",
    name: "demon",
    nameKey: "identity.demon.name",
    portraitFile: "demon.avif",
    attributePriorities: {
      primary: ["strength", "constitution"],
      secondary: [],
    },
    initialPrimaryAttributes: {
      strength: 8,
      constitution: 8,
      spirit: 3,
      agility: 3,
      insight: 3,
    },
  },
  /** 神仙长老职业配置。 */
  matriarch: {
    id: "identity.matriarch",
    name: "matriarch",
    nameKey: "identity.matriarch.name",
    portraitFile: "matriarch.avif",
    attributePriorities: {
      primary: ["insight"],
      secondary: ["spirit", "constitution"],
    },
    initialPrimaryAttributes: {
      strength: 2,
      constitution: 6,
      spirit: 6,
      agility: 3,
      insight: 8,
    },
  },
} as const satisfies Record<IdentityName, IdentityConfig>;

/** 供需要顺序遍历职业配置的业务使用的只读列表。 */
export const IDENTITY_CONFIG_LIST: readonly IdentityConfig[] = Object.values(IDENTITY_CONFIGS);
