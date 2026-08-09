import type { EquipmentDefinitionCatalog } from "./equipment-attribute-modifiers.ts";
import type { EquipmentActiveAbilityDefinition } from "./equipment-active-ability-definition.ts";
import {
  type EquipmentActiveEffectExecutionContext,
  type EquipmentActiveEffectExecutionResult,
  EquipmentActiveEffectHandlerRegistry,
} from "./equipment-active-effect-handler.ts";
import {
  commitEquipmentActiveAbilityUse,
  getEquipmentActiveAbility,
  getEquipmentActiveAbilityRuntimeEntry,
  type EquipmentActiveAbilityState,
} from "./equipment-active-ability-runtime.ts";
import { getEquippedEquipment, type EquipmentLoadout } from "./equipment-loadout.ts";

/** 描述装备主动能力资格检查所需的外部业务事实。 */
export interface EquipmentActiveAbilityEligibilityInput {
  readonly conditionsSatisfied: boolean;
  readonly targetIsValid: boolean;
  readonly targetIsInRange: boolean;
}

/** 描述装备主动能力无法使用时的稳定原因。 */
export type EquipmentActiveAbilityIneligibilityReason =
  | "NOT_EQUIPPED"
  | "NO_ACTIVE_ABILITY"
  | "ON_COOLDOWN"
  | "USAGE_LIMIT_REACHED"
  | "CONDITION_UNMET"
  | "INVALID_TARGET"
  | "OUT_OF_RANGE";

/** 描述装备主动能力资格检查结果。 */
export type EquipmentActiveAbilityEligibilityResult =
  | { readonly allowed: true; readonly reason: null }
  | { readonly allowed: false; readonly reason: EquipmentActiveAbilityIneligibilityReason };

/** 描述主动能力使用成功后的状态和按序效果结果。 */
export interface UseEquipmentActiveAbilityResult {
  readonly eligibility: EquipmentActiveAbilityEligibilityResult & { readonly allowed: true };
  readonly abilityState: EquipmentActiveAbilityState;
  readonly effectResults: readonly EquipmentActiveEffectExecutionResult[];
}

/**
 * 方法名：useEquipmentActiveAbility
 * 作用：校验装备栏、冷却、外部条件和效果处理器后，提交主动能力并按配置执行效果。
 * @param abilityState 当前装备主动能力运行时状态。
 * @param loadout 当前角色装备栏。
 * @param equipmentInstanceId 需要使用主动能力的装备实例标识。
 * @param eligibilityInput 由目标、地图和规则系统提供的资格事实。
 * @param context 本次能力执行上下文。
 * @param definitions 装备静态定义注册表。
 * @param registry 已注册的装备主动效果处理器集合。
 * @returns 更新后的主动能力状态与每项效果执行结果。
 * @throws 所属者不一致、处理器缺失或能力不满足使用条件时抛出错误。
 */
export function useEquipmentActiveAbility(
  abilityState: EquipmentActiveAbilityState,
  loadout: EquipmentLoadout,
  equipmentInstanceId: string,
  eligibilityInput: EquipmentActiveAbilityEligibilityInput,
  context: EquipmentActiveEffectExecutionContext,
  definitions: EquipmentDefinitionCatalog,
  registry: EquipmentActiveEffectHandlerRegistry,
): UseEquipmentActiveAbilityResult {
  assertOwners(abilityState, loadout, context);
  const equipment = getEquippedEquipment(loadout).find(
    (candidate) => candidate.instanceId === equipmentInstanceId,
  );

  if (equipment === undefined) {
    throw new Error("Equipment active ability cannot be used: NOT_EQUIPPED");
  }

  const ability = getEquipmentActiveAbility(definitions, equipment.definitionId);

  if (ability === null) {
    throw new Error("Equipment active ability cannot be used: NO_ACTIVE_ABILITY");
  }

  const eligibility = evaluateEquipmentActiveAbilityEligibility(
    abilityState,
    equipmentInstanceId,
    ability,
    eligibilityInput,
  );

  if (!eligibility.allowed) {
    throw new Error(`Equipment active ability cannot be used: ${eligibility.reason}`);
  }

  preflightEffectHandlers(ability, registry);
  const committed = commitEquipmentActiveAbilityUse(abilityState, equipmentInstanceId, ability);
  const effectResults = executeEquipmentActiveAbilityEffects(ability, context, registry);

  return Object.freeze({ eligibility, abilityState: committed.state, effectResults });
}

/**
 * 方法名：evaluateEquipmentActiveAbilityEligibility
 * 作用：按固定顺序判断装备主动能力的冷却、次数与外部条件是否允许使用。
 * @param abilityState 当前装备主动能力运行时状态。
 * @param equipmentInstanceId 对应装备实例标识。
 * @param ability 已读取的装备主动能力定义。
 * @param input 外部资格事实。
 * @returns 允许使用或首个稳定失败原因。
 * @throws 资格事实不是布尔值或运行时条目不存在时抛出错误。
 */
export function evaluateEquipmentActiveAbilityEligibility(
  abilityState: EquipmentActiveAbilityState,
  equipmentInstanceId: string,
  ability: EquipmentActiveAbilityDefinition,
  input: EquipmentActiveAbilityEligibilityInput,
): EquipmentActiveAbilityEligibilityResult {
  validateEligibilityInput(input);
  const entry = getEquipmentActiveAbilityRuntimeEntry(abilityState, equipmentInstanceId);

  if (entry.abilityId !== ability.abilityId) {
    return { allowed: false, reason: "NO_ACTIVE_ABILITY" };
  }

  if (entry.remainingCooldownTurns > 0) {
    return { allowed: false, reason: "ON_COOLDOWN" };
  }

  if (entry.usesThisTurn >= ability.maxUsesPerTurn) {
    return { allowed: false, reason: "USAGE_LIMIT_REACHED" };
  }

  if (!input.conditionsSatisfied) {
    return { allowed: false, reason: "CONDITION_UNMET" };
  }

  if (!input.targetIsValid) {
    return { allowed: false, reason: "INVALID_TARGET" };
  }

  if (!input.targetIsInRange) {
    return { allowed: false, reason: "OUT_OF_RANGE" };
  }

  return { allowed: true, reason: null };
}

/** 按配置顺序执行所有装备主动效果。 */
function executeEquipmentActiveAbilityEffects(
  ability: EquipmentActiveAbilityDefinition,
  context: EquipmentActiveEffectExecutionContext,
  registry: EquipmentActiveEffectHandlerRegistry,
): readonly EquipmentActiveEffectExecutionResult[] {
  const results: EquipmentActiveEffectExecutionResult[] = [];

  for (const effect of ability.effects) {
    const handler = registry.get(effect.effectType);

    if (handler === null) {
      throw new Error(`Equipment active effect handler not registered: ${effect.effectType}`);
    }

    results.push(handler.execute(effect, context));
  }

  return Object.freeze(results);
}

/** 在提交冷却前确认所有配置效果都有处理器，保持操作原子性。 */
function preflightEffectHandlers(
  ability: EquipmentActiveAbilityDefinition,
  registry: EquipmentActiveEffectHandlerRegistry,
): void {
  for (const effect of ability.effects) {
    if (registry.get(effect.effectType) === null) {
      throw new Error(`Equipment active effect handler not registered: ${effect.effectType}`);
    }
  }
}

/** 校验主动能力状态、装备栏和执行上下文属于同一角色。 */
function assertOwners(
  abilityState: EquipmentActiveAbilityState,
  loadout: EquipmentLoadout,
  context: EquipmentActiveEffectExecutionContext,
): void {
  if (abilityState.ownerId !== loadout.playerId || abilityState.ownerId !== context.ownerId) {
    throw new Error("Equipment active ability state, loadout, and context must share the same owner");
  }
}

/** 校验外部资格事实均为明确布尔值。 */
function validateEligibilityInput(input: EquipmentActiveAbilityEligibilityInput): void {
  for (const [field, value] of Object.entries(input)) {
    if (typeof value !== "boolean") {
      throw new TypeError(`${field} must be a boolean`);
    }
  }
}
