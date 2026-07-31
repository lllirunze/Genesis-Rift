import type { PlayerId, PrimaryAttributes } from "@genesis-rift/shared";

import type { AttributeModifier } from "../attribute/attribute-modifier.ts";
import type { LevelProgressionState } from "../level/level-progression-state.ts";

export interface CharacterState {
  readonly playerId: PlayerId;
  readonly identityId: string;
  readonly raceId: string;
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly attributeModifiers: readonly AttributeModifier[];
  readonly levelProgression: LevelProgressionState;
}
