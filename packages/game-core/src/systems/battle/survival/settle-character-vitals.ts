import {
  getCharacterResource,
  increaseCharacterResource,
  setCharacterResourceCurrentValue,
  type CharacterResourceState,
} from "../../character/index.ts";
import {
  settleDamageToVitals,
  type DamageToVitalsInput,
  type DamageToVitalsResult,
} from "../damage/index.ts";

import {
  enterDownedIfNeeded,
  recoverDownedCharacter,
  validateCharacterSurvivalState,
  type CharacterSurvivalState,
  type EnterDownedResult,
} from "./character-survival-state.ts";

/** 描述将一次最终伤害同步至角色资源和生存状态所需的输入。 */
export interface SettleCharacterDamageInput<ResourceId extends string> {
  readonly resources: CharacterResourceState<ResourceId>;
  readonly healthResourceId: ResourceId;
  readonly currentShield: number;
  readonly survival: CharacterSurvivalState;
  readonly damage: Omit<DamageToVitalsInput, "currentHealth" | "currentShield">;
}

/** 描述一次伤害同步后的角色资源、护盾和击倒状态。 */
export interface SettleCharacterDamageResult<ResourceId extends string> {
  readonly resources: CharacterResourceState<ResourceId>;
  readonly currentShield: number;
  readonly vitals: DamageToVitalsResult;
  readonly survival: CharacterSurvivalState;
  readonly survivalTransition: EnterDownedResult["outcome"];
}

/** 描述自救、队友救援或其他恢复效果解除击倒所需的输入。 */
export interface RecoverCharacterFromDownedInput<ResourceId extends string> {
  readonly resources: CharacterResourceState<ResourceId>;
  readonly healthResourceId: ResourceId;
  readonly survival: CharacterSurvivalState;
  readonly recoveredHealth: number;
}

/** 描述解除击倒后同步得到的角色资源和生存状态。 */
export interface RecoverCharacterFromDownedResult<ResourceId extends string> {
  readonly resources: CharacterResourceState<ResourceId>;
  readonly restoredHealth: number;
  readonly survival: CharacterSurvivalState;
}

/**
 * 方法名：settleCharacterDamage
 * 作用：将已经计算完成的最终伤害依次同步至护盾、生命资源与击倒状态。
 * @param input 角色资源、生命资源标识、护盾、生存状态和最终伤害结算输入。
 * @returns 包含更新后资源、护盾、伤害明细和生存状态的不可变结果。
 * @throws 生命资源不存在、归属不一致或生命资源边界不符合生命结算要求时抛出错误。
 */
export function settleCharacterDamage<ResourceId extends string>(
  input: SettleCharacterDamageInput<ResourceId>,
): SettleCharacterDamageResult<ResourceId> {
  assertSurvivalOwnership(input.resources, input.survival);
  const health = getHealthResource(input.resources, input.healthResourceId);
  const vitals = settleDamageToVitals({
    ...input.damage,
    currentShield: input.currentShield,
    currentHealth: health.current,
  });
  const resources = setCharacterResourceCurrentValue(
    input.resources,
    input.healthResourceId,
    vitals.healthAfter,
  ).state;
  const transition = enterDownedIfNeeded(input.survival, vitals.healthDepleted);

  return Object.freeze({
    resources,
    currentShield: vitals.shieldAfter,
    vitals,
    survival: transition.state,
    survivalTransition: transition.outcome,
  });
}

/**
 * 方法名：recoverCharacterFromDowned
 * 作用：将生命恢复量写入角色资源，并在生命恢复为正数后解除击倒状态。
 * @param input 角色资源、生命资源标识、当前击倒状态和本次恢复量。
 * @returns 包含恢复后资源、实际生命值和正常行动状态的不可变结果。
 * @throws 角色未处于击倒状态、恢复量非法或资源归属不一致时抛出错误。
 */
export function recoverCharacterFromDowned<ResourceId extends string>(
  input: RecoverCharacterFromDownedInput<ResourceId>,
): RecoverCharacterFromDownedResult<ResourceId> {
  assertSurvivalOwnership(input.resources, input.survival);
  getHealthResource(input.resources, input.healthResourceId);
  const change = increaseCharacterResource(
    input.resources,
    input.healthResourceId,
    input.recoveredHealth,
  );
  const survival = recoverDownedCharacter(input.survival, change.resource.current);

  return Object.freeze({
    resources: change.state,
    restoredHealth: change.resource.current,
    survival,
  });
}

/** 校验生存状态与角色资源均归属于同一参与者。 */
function assertSurvivalOwnership<ResourceId extends string>(
  resources: CharacterResourceState<ResourceId>,
  survival: CharacterSurvivalState,
): void {
  validateCharacterSurvivalState(survival);

  if (resources.playerId !== survival.participantId) {
    throw new Error("Character resources and survival state must belong to the same participant");
  }
}

/** 读取并验证用于生命结算的通用角色资源。 */
function getHealthResource<ResourceId extends string>(
  resources: CharacterResourceState<ResourceId>,
  healthResourceId: ResourceId,
) {
  const health = getCharacterResource(resources, healthResourceId);

  if (health.minimum !== 0) {
    throw new RangeError("Health resource minimum must be zero");
  }

  return health;
}
