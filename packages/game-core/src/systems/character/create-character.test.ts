import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { createCharacter } from "./create-character.ts";
import { applyPermanentPrimaryAttributeChange } from "./update-primary-attributes.ts";

const PLAYER_ID = "player-1" as PlayerId;

const IDENTITY = {
  id: "identity.test",
  initialPrimaryAttributes: {
    strength: 5,
    constitution: 5,
    spirit: 5,
    agility: 5,
    insight: 5,
  },
} as const;

const RACE = {
  id: "race.test",
  initialPrimaryAttributeOffset: {
    strength: 1,
    constitution: -1,
    spirit: 0,
    agility: 1,
    insight: -1,
  },
} as const;

describe("createCharacter", () => {
  it("combines identity attributes and race offsets into authoritative current attributes", () => {
    const character = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY,
      race: RACE,
    });

    expect(character).toEqual({
      playerId: PLAYER_ID,
      identityId: "identity.test",
      raceId: "race.test",
      currentPrimaryAttributes: {
        strength: 6,
        constitution: 4,
        spirit: 5,
        agility: 6,
        insight: 4,
      },
      attributeModifiers: [],
    });
  });

  it("applies permanent growth without mutating the previous character state", () => {
    const character = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY,
      race: RACE,
    });
    const updatedCharacter = applyPermanentPrimaryAttributeChange(character, {
      constitution: 2,
      insight: 1,
    });

    expect(updatedCharacter.currentPrimaryAttributes.constitution).toBe(6);
    expect(updatedCharacter.currentPrimaryAttributes.insight).toBe(5);
    expect(character.currentPrimaryAttributes.constitution).toBe(4);
  });

  it("rejects fractional growth and negative resulting attributes", () => {
    const character = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY,
      race: RACE,
    });

    expect(() => applyPermanentPrimaryAttributeChange(character, { strength: 0.5 })).toThrow(
      TypeError,
    );
    expect(() => applyPermanentPrimaryAttributeChange(character, { insight: -5 })).toThrow(
      RangeError,
    );
  });
});
