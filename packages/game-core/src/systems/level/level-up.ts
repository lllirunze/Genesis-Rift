import {
  PRIMARY_ATTRIBUTE_KEYS,
  type LevelDefinition,
  type LevelSystemConfig,
  type PrimaryAttributeOffset,
} from "@genesis-rift/shared";

import type { CharacterState } from "../character/character-state.ts";
import { applyPermanentPrimaryAttributeChange } from "../character/update-primary-attributes.ts";
import { validateLevelProgressionState } from "./level-progression-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type LevelUpBlockedReason = "maximum-level-reached" | "insufficient-experience";

/** 描述当前模块对外公开的业务数据契约。 */
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

/**
 * 方法名：getLevelUpEligibility
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param character 方法所需的 character 参数。
 * @param config 待使用或校验的配置。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：applyCharacterLevelUp
 * 作用：执行该方法负责的业务规则并返回结算结果。
 * @param character 方法所需的 character 参数。
 * @param config 待使用或校验的配置。
 * @param allocation 方法所需的 allocation 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：validateAttributePointAllocation
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param allocation 方法所需的 allocation 参数。
 * @param expectedPoints 方法所需的 expectedPoints 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：getTargetLevelDefinition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param targetLevel 方法所需的 targetLevel 参数。
 * @param config 待使用或校验的配置。
 * @returns 本次处理得到的结果。
 */
function getTargetLevelDefinition(targetLevel: number, config: LevelSystemConfig): LevelDefinition {
  const definition = config.levels.find((candidate) => candidate.level === targetLevel);

  if (definition === undefined) {
    throw new Error(`Missing level definition: ${targetLevel}`);
  }

  return definition;
}
