import {
  PERMANENT_STATUS_DURATION_TURNS,
  type StatusDefinition,
  type StatusDefinitionCatalog,
} from "@genesis-rift/game-core";

export const BATTLE_FURY_STATUS_DEFINITION = {
  definitionId: "status.battle-fury",
  name: "Battle Fury",
  description: "Temporarily increases the target's physical strength.",
  kind: "buff",
  tags: ["battle", "physical"],
  duration: { turns: 2 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "strength",
      targetType: "primary",
      targetAttribute: "strength",
      valuePerStack: 2,
    },
  ],
} as const satisfies StatusDefinition;

export const WIND_BLESSING_STATUS_DEFINITION = {
  definitionId: "status.wind-blessing",
  name: "Wind Blessing",
  description: "Temporarily increases the target's movement range.",
  kind: "buff",
  tags: ["blessing", "movement"],
  duration: { turns: 3 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      valuePerStack: 1,
    },
  ],
} as const satisfies StatusDefinition;

export const VITALITY_BLESSING_STATUS_DEFINITION = {
  definitionId: "status.vitality-blessing",
  name: "Vitality Blessing",
  description: "Improves constitution and health regeneration for a short duration.",
  kind: "buff",
  tags: ["blessing", "survival", "recovery"],
  duration: { turns: 3 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "constitution",
      targetType: "primary",
      targetAttribute: "constitution",
      valuePerStack: 1,
    },
    {
      effectType: "attribute_modifier",
      effectId: "health-regeneration",
      targetType: "derived",
      targetAttribute: "healthRegeneration",
      valuePerStack: 1,
    },
  ],
} as const satisfies StatusDefinition;

export const ARCANE_ACCUMULATION_STATUS_DEFINITION = {
  definitionId: "status.arcane-accumulation",
  name: "Arcane Accumulation",
  description: "Permanently accumulates insight when its trigger condition is met.",
  kind: "buff",
  tags: ["growth", "arcane", "long-lived"],
  duration: { turns: PERMANENT_STATUS_DURATION_TURNS },
  maxStacks: 10,
  removal: {
    dispellable: false,
    removeOnDeath: false,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "insight",
      targetType: "primary",
      targetAttribute: "insight",
      valuePerStack: 1,
    },
  ],
} as const satisfies StatusDefinition;

export const EXHAUSTION_STATUS_DEFINITION = {
  definitionId: "status.exhaustion",
  name: "Exhaustion",
  description: "Temporarily reduces agility and movement range.",
  kind: "debuff",
  tags: ["battle", "physical", "movement"],
  duration: { turns: 2 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "agility",
      targetType: "primary",
      targetAttribute: "agility",
      valuePerStack: -2,
    },
    {
      effectType: "attribute_modifier",
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      valuePerStack: -1,
    },
  ],
} as const satisfies StatusDefinition;

export const POISONED_STATUS_DEFINITION = {
  definitionId: "status.poisoned",
  name: "Poisoned",
  description: "Temporarily reduces health regeneration.",
  kind: "debuff",
  tags: ["poison", "survival", "recovery"],
  duration: { turns: 3 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "health-regeneration",
      targetType: "derived",
      targetAttribute: "healthRegeneration",
      valuePerStack: -1,
    },
  ],
} as const satisfies StatusDefinition;

export const STATUS_DEFINITION_CATALOG = {
  [BATTLE_FURY_STATUS_DEFINITION.definitionId]: BATTLE_FURY_STATUS_DEFINITION,
  [WIND_BLESSING_STATUS_DEFINITION.definitionId]: WIND_BLESSING_STATUS_DEFINITION,
  [VITALITY_BLESSING_STATUS_DEFINITION.definitionId]: VITALITY_BLESSING_STATUS_DEFINITION,
  [ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId]: ARCANE_ACCUMULATION_STATUS_DEFINITION,
  [EXHAUSTION_STATUS_DEFINITION.definitionId]: EXHAUSTION_STATUS_DEFINITION,
  [POISONED_STATUS_DEFINITION.definitionId]: POISONED_STATUS_DEFINITION,
} as const satisfies StatusDefinitionCatalog;
