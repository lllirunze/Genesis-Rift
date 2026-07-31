import {
  PRIMARY_ATTRIBUTE_KEYS,
  type PlayerId,
  type PrimaryAttributes,
} from "@genesis-rift/shared";

import type { CharacterState } from "./character-state.ts";
import type { LevelProgressionState } from "../level/level-progression-state.ts";

export interface CharacterIdentitySource {
  readonly id: string;
  readonly initialPrimaryAttributes: PrimaryAttributes;
}

export interface CharacterRaceSource {
  readonly id: string;
  readonly initialPrimaryAttributeOffset: PrimaryAttributes;
}

export interface CreateCharacterInput {
  readonly playerId: PlayerId;
  readonly identity: CharacterIdentitySource;
  readonly race: CharacterRaceSource;
  readonly levelProgression?: LevelProgressionState;
}

export function createCharacter(input: CreateCharacterInput): CharacterState {
  const currentPrimaryAttributes = {} as Record<keyof PrimaryAttributes, number>;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const identityValue = input.identity.initialPrimaryAttributes[attribute];
    const raceOffset = input.race.initialPrimaryAttributeOffset[attribute];

    assertInteger(identityValue, `identity.${attribute}`);
    assertInteger(raceOffset, `race.${attribute}`);

    const currentValue = identityValue + raceOffset;

    if (currentValue < 0) {
      throw new RangeError(`currentPrimaryAttributes.${attribute} must not be negative`);
    }

    currentPrimaryAttributes[attribute] = currentValue;
  }

  return {
    playerId: input.playerId,
    identityId: input.identity.id,
    raceId: input.race.id,
    currentPrimaryAttributes,
    attributeModifiers: [],
    levelProgression: input.levelProgression ?? {
      currentLevel: 1,
      currentExperience: 0,
    },
  };
}

function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer`);
  }
}
