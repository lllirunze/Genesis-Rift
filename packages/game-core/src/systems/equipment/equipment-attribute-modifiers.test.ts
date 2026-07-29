import type { DerivedAttributeFormulaConfig, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import type { CharacterState } from "../character/index.ts";
import {
  aggregateEquipmentAttributeModifiers,
  createCharacterAttributeSnapshotWithEquipment,
} from "./equipment-attribute-modifiers.ts";
import type { EquipmentDefinition } from "./equipment-definition.ts";
import { createEquipmentInstance } from "./equipment-instance.ts";
import { createEmptyEquipmentLoadout, equipEquipment } from "./equipment-loadout.ts";

const PLAYER_ID = "player-1" as PlayerId;

const ZERO_PRIMARY_ATTRIBUTES = {
  strength: 0,
  constitution: 0,
  spirit: 0,
  agility: 0,
  insight: 0,
} as const;

const WIND_BOOTS: EquipmentDefinition = {
  definitionId: "equipment.wind-boots",
  name: "Wind Boots",
  type: "shoes",
  quality: "rare",
  corePosition: "Improves agility and movement range.",
  allowDuplicateEquipping: false,
  attributeEffects: [
    {
      effectId: "agility",
      targetType: "primary",
      targetAttribute: "agility",
      value: 1,
    },
    {
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      value: 2,
    },
  ],
};

describe("equipment attribute modifiers", () => {
  it("aggregates active equipment effects with instance-scoped modifier ids", () => {
    const boots = createEquipmentInstance({
      instanceId: "instance.wind-boots-1",
      definitionId: WIND_BOOTS.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const loadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "shoes",
      boots,
      WIND_BOOTS,
    ).loadout;

    expect(
      aggregateEquipmentAttributeModifiers(loadout, {
        [WIND_BOOTS.definitionId]: WIND_BOOTS,
      }),
    ).toEqual({
      primaryDynamicOffset: {
        strength: 0,
        constitution: 0,
        spirit: 0,
        agility: 1,
        insight: 0,
      },
      derivedDynamicOffset: {
        movementRange: 2,
      },
    });
  });

  it("rejects equipped instances whose definitions are unavailable", () => {
    const boots = createEquipmentInstance({
      instanceId: "instance.wind-boots-1",
      definitionId: WIND_BOOTS.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const loadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "shoes",
      boots,
      WIND_BOOTS,
    ).loadout;

    expect(() => aggregateEquipmentAttributeModifiers(loadout, {})).toThrow(
      "Missing equipment definition",
    );
  });

  it("feeds equipped effects into the character attribute snapshot", () => {
    const character: CharacterState = {
      playerId: PLAYER_ID,
      identityId: "identity.test",
      raceId: "race.test",
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      attributeModifiers: [],
    };
    const movementRangeConfig: DerivedAttributeFormulaConfig = {
      coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, agility: 0.5 },
      primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
      derivedStaticOffset: 0,
      roundingMode: "floor",
      minimum: 0,
      maximum: null,
    };
    const boots = createEquipmentInstance({
      instanceId: "instance.wind-boots-1",
      definitionId: WIND_BOOTS.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const loadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "shoes",
      boots,
      WIND_BOOTS,
    ).loadout;

    const snapshot = createCharacterAttributeSnapshotWithEquipment(
      character,
      { movementRange: movementRangeConfig },
      loadout,
      { [WIND_BOOTS.definitionId]: WIND_BOOTS },
    );

    expect(snapshot.effectivePrimaryAttributes.agility).toBe(6);
    expect(snapshot.derivedAttributes.movementRange).toBe(5);
  });
});
