import {
  PRIMARY_ATTRIBUTE_KEYS,
  type PlayerId,
  type PrimaryAttributes,
} from "@genesis-rift/shared";

import type { CharacterState } from "./character-state.ts";
import type { LevelProgressionState } from "../level/level-progression-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CharacterIdentitySource {
  readonly id: string;
  readonly initialPrimaryAttributes: PrimaryAttributes;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CharacterRaceSource {
  readonly id: string;
  readonly initialPrimaryAttributeOffset: PrimaryAttributes;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateCharacterInput {
  readonly playerId: PlayerId;
  readonly identity: CharacterIdentitySource;
  readonly race: CharacterRaceSource;
  readonly levelProgression?: LevelProgressionState;
}

/**
 * 方法名：createCharacter
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：assertInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer`);
  }
}
