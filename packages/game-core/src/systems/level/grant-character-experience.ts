import type { CharacterState } from "../character/character-state.ts";
import { grantExperience } from "./level-progression-state.ts";

/**
 * 方法名：grantCharacterExperience
 * 作用：在保持既有约束的前提下添加目标数据。
 * @param character 方法所需的 character 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function grantCharacterExperience(
  character: CharacterState,
  amount: number,
): CharacterState {
  return {
    ...character,
    levelProgression: grantExperience(character.levelProgression, amount),
  };
}
