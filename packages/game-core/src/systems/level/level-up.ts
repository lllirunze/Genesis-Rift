import {
  PRIMARY_ATTRIBUTE_KEYS,
  type LevelDefinition,
  type LevelSystemConfig,
  type PrimaryAttributeOffset,
} from "@genesis-rift/shared";

import type { CharacterState } from "../character/character-state.ts";
import { applyPermanentPrimaryAttributeChange } from "../character/update-primary-attributes.ts";
import { validateLevelProgressionState } from "./level-progression-state.ts";

export type LevelUpBlockedReason = "maximum-level-reached" | "insufficient-experience";

export type LevelUpEligibility =
  | {
      readonly canLevelUp: true;
      readonly targetLevel: number;
      readonly experienceRequired: number;
      readonly freePrimaryAttributePoints: number;
    }
  | {
      readonly canLevelUp: false;
      readonly reason: LevelUpBlockedReason;
      readonly targetLevel: number | null;
      readonly experienceRequired: number | null;
      readonly missingExperience: number;
    };

export function getLevelUpEligibility(
  character: CharacterState,
  config: LevelSystemConfig,
): LevelUpEligibility {
  validateLevelProgressionState(character.levelProgression, config);

  if (character.levelProgression.currentLevel >= config.maximumLevel) {
    return {
      canLevelUp: false,
      reason: "maximum-level-reached",
      targetLevel: null,
      experienceRequired: null,
      missingExperience: 0,
    };
  }

  const targetDefinition = getTargetLevelDefinition(
    character.levelProgression.currentLevel + 1,
    config,
  );
  const missingExperience = Math.max(
    0,
    targetDefinition.experienceRequired - character.levelProgression.currentExperience,
  );

  if (missingExperience > 0) {
    return {
      canLevelUp: false,
      reason: "insufficient-experience",
      targetLevel: targetDefinition.level,
      experienceRequired: targetDefinition.experienceRequired,
      missingExperience,
    };
  }

  return {
    canLevelUp: true,
    targetLevel: targetDefinition.level,
    experienceRequired: targetDefinition.experienceRequired,
    freePrimaryAttributePoints: targetDefinition.freePrimaryAttributePoints,
  };
}

export function applyCharacterLevelUp(
  character: CharacterState,
  config: LevelSystemConfig,
  allocation: PrimaryAttributeOffset,
): CharacterState {
  const eligibility = getLevelUpEligibility(character, config);

  if (!eligibility.canLevelUp) {
    throw new Error(`Character cannot level up: ${eligibility.reason}`);
  }

  validateAttributePointAllocation(allocation, eligibility.freePrimaryAttributePoints);

  const characterWithGrowth = applyPermanentPrimaryAttributeChange(character, allocation);

  return {
    ...characterWithGrowth,
    levelProgression: {
      currentLevel: eligibility.targetLevel,
      currentExperience:
        character.levelProgression.currentExperience - eligibility.experienceRequired,
    },
  };
}

export function validateAttributePointAllocation(
  allocation: PrimaryAttributeOffset,
  expectedPoints: number,
): void {
  if (!Number.isSafeInteger(expectedPoints) || expectedPoints < 0) {
    throw new TypeError("expectedPoints must be a non-negative safe integer");
  }

  for (const attribute of Object.keys(allocation)) {
    if (!PRIMARY_ATTRIBUTE_KEYS.some((candidate) => candidate === attribute)) {
      throw new TypeError(`Unknown primary attribute: ${attribute}`);
    }
  }

  let allocatedPoints = 0;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const points = allocation[attribute] ?? 0;

    if (!Number.isSafeInteger(points) || points < 0) {
      throw new TypeError(`allocation.${attribute} must be a non-negative safe integer`);
    }

    allocatedPoints += points;
  }

  if (allocatedPoints !== expectedPoints) {
    throw new RangeError(
      `attribute allocation must contain exactly ${expectedPoints} points, received ${allocatedPoints}`,
    );
  }
}

function getTargetLevelDefinition(targetLevel: number, config: LevelSystemConfig): LevelDefinition {
  const definition = config.levels.find((candidate) => candidate.level === targetLevel);

  if (definition === undefined) {
    throw new Error(`Missing level definition: ${targetLevel}`);
  }

  return definition;
}
