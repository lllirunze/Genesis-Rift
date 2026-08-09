import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { CharacterState } from "../character/index.ts";
import {
  createEmptyEquipmentLoadout,
  type EquipmentDefinitionCatalog,
} from "../equipment/index.ts";
import { createCharacterStatusState, type StatusDefinitionCatalog } from "./status/index.ts";
import { createCombatAttributeSnapshot } from "./combat-snapshot.ts";

const PLAYER_ID = "player_a" as PlayerId;

const EQUIPMENT: EquipmentDefinitionCatalog = {};
const STATUSES: StatusDefinitionCatalog = {};
const FORMULAS = {
  physicalAttack: {
    coefficients: { strength: 1, constitution: 0, spirit: 0, agility: 0, insight: 0 },
    primaryStaticOffset: { strength: 0, constitution: 0, spirit: 0, agility: 0, insight: 0 },
    derivedStaticOffset: 0,
    roundingMode: "floor",
    minimum: 0,
    maximum: null,
  },
} as const;

describe("createCombatAttributeSnapshot", () => {
  it("combines the character with equipped and active-status modifier sources", () => {
    const character: CharacterState = {
      playerId: PLAYER_ID,
      identityId: "mage",
      raceId: "human",
      currentPrimaryAttributes: { strength: 7, constitution: 5, spirit: 5, agility: 5, insight: 5 },
      attributeModifiers: [],
      levelProgression: { currentLevel: 1, currentExperience: 0 },
    };
    const snapshot = createCombatAttributeSnapshot({
      character,
      equipment: createEmptyEquipmentLoadout(PLAYER_ID),
      equipmentDefinitions: EQUIPMENT,
      statuses: createCharacterStatusState(PLAYER_ID),
      statusDefinitions: STATUSES,
      derivedAttributeConfigs: FORMULAS,
    });

    expect(snapshot.attributes.derivedAttributes.physicalAttack).toBe(7);
    expect(snapshot.equipmentModifiers).toEqual([]);
    expect(snapshot.statusModifiers).toEqual([]);
  });
});
