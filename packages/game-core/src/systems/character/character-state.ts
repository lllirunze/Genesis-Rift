import type { CharacterGender, PlayerId, PrimaryAttributes } from "@genesis-rift/shared";

import type { AttributeModifier } from "../attribute/attribute-modifier.ts";
import type { LevelProgressionState } from "../level/level-progression-state.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface CharacterState {
  readonly playerId: PlayerId;
  /** 角色展示层使用的性别选择，不参与数值计算。 */
  readonly gender?: CharacterGender;
  readonly identityId: string;
  readonly raceId: string;
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly attributeModifiers: readonly AttributeModifier[];
  readonly levelProgression: LevelProgressionState;
}
