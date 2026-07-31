import { describe, expect, it } from "vitest";

import type { LevelSystemConfig, PlayerId } from "@genesis-rift/shared";

import { createCharacter } from "../character/create-character.ts";
import { grantCharacterExperience } from "./grant-character-experience.ts";
import { applyCharacterLevelUp, getLevelUpEligibility } from "./level-up.ts";

const PLAYER_ID = "player-1" as PlayerId;

const LEVEL_CONFIG = {
  initialLevel: 1,
  maximumLevel: 3,
  levels: [
    { level: 1, experienceRequired: 0, freePrimaryAttributePoints: 0 },
    { level: 2, experienceRequired: 20, freePrimaryAttributePoints: 3 },
    { level: 3, experienceRequired: 30, freePrimaryAttributePoints: 3 },
  ],
} as const satisfies LevelSystemConfig;

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
    strength: 0,
    constitution: 0,
    spirit: 0,
    agility: 0,
    insight: 0,
  },
} as const;

describe("level progression", () => {
  it("grants non-negative integer experience without mutating the character", () => {
    const character = createTestCharacter();
    const updatedCharacter = grantCharacterExperience(character, 20);

    expect(updatedCharacter.levelProgression.currentExperience).toBe(20);
    expect(character.levelProgression.currentExperience).toBe(0);
    expect(() => grantCharacterExperience(character, -1)).toThrow(TypeError);
    expect(() => grantCharacterExperience(character, 0.5)).toThrow(TypeError);
  });

  it("reports the missing experience and the available level-up reward", () => {
    const character = createTestCharacter();

    expect(getLevelUpEligibility(character, LEVEL_CONFIG)).toEqual({
      canLevelUp: false,
      reason: "insufficient-experience",
      targetLevel: 2,
      experienceRequired: 20,
      missingExperience: 20,
    });

    expect(getLevelUpEligibility(grantCharacterExperience(character, 20), LEVEL_CONFIG)).toEqual({
      canLevelUp: true,
      targetLevel: 2,
      experienceRequired: 20,
      freePrimaryAttributePoints: 3,
    });
  });

  it("atomically consumes experience, advances one level, and applies permanent growth", () => {
    const character = grantCharacterExperience(createTestCharacter(), 50);
    const leveledCharacter = applyCharacterLevelUp(character, LEVEL_CONFIG, {
      spirit: 2,
      insight: 1,
    });

    expect(leveledCharacter.levelProgression).toEqual({
      currentLevel: 2,
      currentExperience: 30,
    });
    expect(leveledCharacter.currentPrimaryAttributes.spirit).toBe(7);
    expect(leveledCharacter.currentPrimaryAttributes.insight).toBe(6);
    expect(character.levelProgression).toEqual({ currentLevel: 1, currentExperience: 50 });
    expect(character.currentPrimaryAttributes.spirit).toBe(5);

    // Enough surplus experience remains, but one invocation still advances only one level.
    expect(getLevelUpEligibility(leveledCharacter, LEVEL_CONFIG).canLevelUp).toBe(true);
  });

  it("rejects incomplete, excessive, fractional, and negative allocations", () => {
    const character = grantCharacterExperience(createTestCharacter(), 20);

    expect(() => applyCharacterLevelUp(character, LEVEL_CONFIG, {})).toThrow(
      "attribute allocation must contain exactly 3 points",
    );
    expect(() => applyCharacterLevelUp(character, LEVEL_CONFIG, { strength: 4 })).toThrow(
      "attribute allocation must contain exactly 3 points",
    );
    expect(() => applyCharacterLevelUp(character, LEVEL_CONFIG, { strength: 0.5 })).toThrow(
      TypeError,
    );
    expect(() => applyCharacterLevelUp(character, LEVEL_CONFIG, { strength: -1 })).toThrow(
      TypeError,
    );
    expect(() =>
      applyCharacterLevelUp(character, LEVEL_CONFIG, {
        unknown: 1,
      } as never),
    ).toThrow("Unknown primary attribute: unknown");

    expect(character.levelProgression).toEqual({ currentLevel: 1, currentExperience: 20 });
    expect(character.currentPrimaryAttributes.strength).toBe(5);
  });

  it("blocks level-up when experience is insufficient or maximum level is reached", () => {
    const character = createTestCharacter();

    expect(() => applyCharacterLevelUp(character, LEVEL_CONFIG, { strength: 3 })).toThrow(
      "Character cannot level up: insufficient-experience",
    );

    const maximumLevelCharacter = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY,
      race: RACE,
      levelProgression: { currentLevel: 3, currentExperience: 100 },
    });

    expect(getLevelUpEligibility(maximumLevelCharacter, LEVEL_CONFIG)).toEqual({
      canLevelUp: false,
      reason: "maximum-level-reached",
      targetLevel: null,
      experienceRequired: null,
      missingExperience: 0,
    });
  });
});

function createTestCharacter() {
  return createCharacter({
    playerId: PLAYER_ID,
    identity: IDENTITY,
    race: RACE,
  });
}
