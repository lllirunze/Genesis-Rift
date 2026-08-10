import { describe, expect, it } from "vitest";

import {
  createCharacter,
  createCharacterAttributeSnapshot,
  type AttributeModifier,
} from "@genesis-rift/game-core";
import {
  DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
  IDENTITY_CONFIGS,
  RACE_CONFIGS,
} from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

const PLAYER_ID = "player-1" as PlayerId;

const ATTRIBUTE_MODIFIERS: readonly AttributeModifier[] = [
  {
    modifierId: "equipment.guard.constitution",
    sourceId: "equipment.guard",
    sourceType: "equipment",
    targetType: "primary",
    targetAttribute: "constitution",
    value: 2,
  },
  {
    modifierId: "equipment.boots.movementRange",
    sourceId: "equipment.boots",
    sourceType: "equipment",
    targetType: "derived",
    targetAttribute: "movementRange",
    value: 2,
  },
  {
    modifierId: "status.exhaustion.healthRegeneration",
    sourceId: "status.exhaustion",
    sourceType: "status",
    targetType: "derived",
    targetAttribute: "healthRegeneration",
    value: -1,
  },
];

describe("character attribute aggregation", () => {
  it("builds a complete snapshot from identity, race, modifiers, and formula configs", () => {
    const createdCharacter = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY_CONFIGS.mage,
      race: RACE_CONFIGS.divine,
    });
    const character = {
      ...createdCharacter,
      attributeModifiers: ATTRIBUTE_MODIFIERS,
    };
    const snapshot = createCharacterAttributeSnapshot(character, DERIVED_ATTRIBUTE_FORMULA_CONFIGS);

    expect(snapshot.currentPrimaryAttributes).toEqual({
      strength: 2,
      constitution: 3,
      spirit: 10,
      agility: 3,
      insight: 7,
    });
    expect(snapshot.primaryDynamicOffset).toEqual({
      strength: 0,
      constitution: 2,
      spirit: 0,
      agility: 0,
      insight: 0,
    });
    expect(snapshot.effectivePrimaryAttributes).toEqual({
      strength: 2,
      constitution: 5,
      spirit: 10,
      agility: 3,
      insight: 7,
    });
    expect(snapshot.derivedDynamicOffset).toEqual({
      movementRange: 2,
      healthRegeneration: -1,
    });
    expect(snapshot.derivedAttributes).toEqual({
      maxHealth: 90,
      healthRegeneration: 1,
      movementRange: 4,
      physicalAttack: 7,
      physicalDefense: 7,
      evasionRate: 11,
      criticalRate: 10,
      criticalDamage: 112,
      armorPenetration: 0,
    });
  });

  it("rejects a derived modifier that has no formula config", () => {
    const createdCharacter = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY_CONFIGS.mage,
      race: RACE_CONFIGS.human,
    });
    const character = {
      ...createdCharacter,
      attributeModifiers: [
        {
          modifierId: "test.unknown",
          sourceId: "test",
          sourceType: "test",
          targetType: "derived" as const,
          targetAttribute: "unknownAttribute",
          value: 1,
        },
      ],
    };

    expect(() =>
      createCharacterAttributeSnapshot(character, DERIVED_ATTRIBUTE_FORMULA_CONFIGS),
    ).toThrow("Missing derived attribute config: unknownAttribute");
  });
});
