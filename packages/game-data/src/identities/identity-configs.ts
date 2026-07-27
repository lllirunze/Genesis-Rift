import type { IdentityConfig, IdentityName } from "./identity-config.ts";

export const IDENTITY_CONFIGS = {
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

export const IDENTITY_CONFIG_LIST: readonly IdentityConfig[] = Object.values(IDENTITY_CONFIGS);
