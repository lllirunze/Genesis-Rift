import type { CharacterState } from "../character/character-state.ts";
import { grantExperience } from "./level-progression-state.ts";

export function grantCharacterExperience(
  character: CharacterState,
  amount: number,
): CharacterState {
  return {
    ...character,
    levelProgression: grantExperience(character.levelProgression, amount),
  };
}
