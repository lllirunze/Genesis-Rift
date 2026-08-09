import {
  getCharacterResource,
  spendCharacterResource,
  type CharacterResourceState,
} from "../character/index.ts";

import { executeSkillEffects } from "./execute-skill-effects.ts";
import type { SkillDefinition } from "./skill-definition.ts";
import {
  evaluateSkillEligibility,
  type SkillEligibilityInput,
  type SkillEligibilityResult,
} from "./skill-eligibility.ts";
import {
  type SkillEffectExecutionContext,
  type SkillEffectExecutionResult,
  SkillEffectHandlerRegistry,
} from "./skill-effect-handler.ts";
import { commitSkillUse, type CharacterSkillState } from "./skill-runtime-state.ts";

/** 描述释放主动技能所需的资格事实、资源状态与效果执行上下文。 */
export interface UseActiveSkillInput<ResourceId extends string = string> {
  readonly eligibility: SkillEligibilityInput;
  readonly resourceState: CharacterResourceState<ResourceId>;
  readonly effectContext: SkillEffectExecutionContext;
}

/** 描述一次主动技能释放成功后的状态与效果执行结果。 */
export interface UseActiveSkillResult<ResourceId extends string = string> {
  readonly eligibility: SkillEligibilityResult & { readonly allowed: true };
  readonly skillState: CharacterSkillState;
  readonly resourceState: CharacterResourceState<ResourceId>;
  readonly effectResults: readonly SkillEffectExecutionResult[];
}

/**
 * 方法名：useActiveSkill
 * 作用：完成主动技能的资格校验、资源预检、冷却提交和按序效果执行。
 * @param skillState 施法者当前技能运行时状态。
 * @param definition 准备释放的主动技能定义。
 * @param input 本次释放所需的外部资格事实、资源状态和执行上下文。
 * @param registry 已注册的技能效果处理器集合。
 * @returns 更新后的技能状态、资源状态和每项效果的执行结果。
 * @throws 资格不满足、资源不足、所属者不一致或缺少效果处理器时抛出错误。
 */
export function useActiveSkill<ResourceId extends string>(
  skillState: CharacterSkillState,
  definition: SkillDefinition,
  input: UseActiveSkillInput<ResourceId>,
  registry: SkillEffectHandlerRegistry,
): UseActiveSkillResult<ResourceId> {
  assertStateOwner(skillState.ownerId, input.effectContext.casterId, "skill");
  assertStateOwner(input.resourceState.playerId, input.effectContext.casterId, "resource");
  const eligibility = evaluateSkillEligibility(skillState, definition, input.eligibility);

  if (!eligibility.allowed) {
    throw new Error(`Skill cannot be used: ${eligibility.reason}`);
  }

  preflightResources(input.resourceState, definition);
  preflightEffectHandlers(definition, registry);
  const resourceState = spendSkillResources(input.resourceState, definition);
  const skillCommit = commitSkillUse(skillState, definition);
  const effectResults = executeSkillEffects(definition, input.effectContext, registry);

  return Object.freeze({
    eligibility,
    skillState: skillCommit.state,
    resourceState,
    effectResults,
  });
}

/**
 * 方法名：preflightResources
 * 作用：在修改任何资源前确认技能全部消耗均可由当前资源状态一次性支付。
 * @param state 施法者当前运行时资源状态。
 * @param definition 准备释放的技能定义。
 * @returns 无返回值。
 * @throws 任一资源不存在或可用数量不足时抛出错误。
 */
function preflightResources<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  definition: SkillDefinition,
): void {
  for (const cost of definition.resourceCosts) {
    const resource = getCharacterResource(state, cost.resourceId as ResourceId);
    const available = resource.current - resource.minimum;

    if (available < cost.amount) {
      throw new RangeError(
        `Insufficient character resource ${cost.resourceId}: required ${cost.amount}, available ${available}`,
      );
    }
  }
}

/**
 * 方法名：preflightEffectHandlers
 * 作用：在提交技能状态前确认配置中的每种效果都有可执行处理器。
 * @param definition 准备释放的技能定义。
 * @param registry 已注册的技能效果处理器集合。
 * @returns 无返回值。
 * @throws 任一效果类型未注册处理器时抛出错误。
 */
function preflightEffectHandlers(
  definition: SkillDefinition,
  registry: SkillEffectHandlerRegistry,
): void {
  for (const effect of definition.effects) {
    if (registry.get(effect.effectType) === null) {
      throw new Error(`Skill effect handler not registered: ${effect.effectType}`);
    }
  }
}

/**
 * 方法名：spendSkillResources
 * 作用：在资源预检成功后按技能配置顺序扣除全部资源消耗。
 * @param state 施法者当前运行时资源状态。
 * @param definition 准备释放的技能定义。
 * @returns 已扣除技能消耗后的新资源状态。
 */
function spendSkillResources<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  definition: SkillDefinition,
): CharacterResourceState<ResourceId> {
  let resourceState = state;

  for (const cost of definition.resourceCosts) {
    resourceState = spendCharacterResource(
      resourceState,
      cost.resourceId as ResourceId,
      cost.amount,
    ).state;
  }

  return resourceState;
}

/**
 * 方法名：assertStateOwner
 * 作用：确保技能与资源状态均属于本次效果上下文中的同一施法者。
 * @param actualOwnerId 状态记录的所属者标识。
 * @param expectedOwnerId 技能执行上下文中的施法者标识。
 * @param stateName 用于错误信息的状态名称。
 * @returns 无返回值。
 * @throws 两个所属者标识不一致时抛出错误。
 */
function assertStateOwner(actualOwnerId: string, expectedOwnerId: string, stateName: string): void {
  if (actualOwnerId !== expectedOwnerId) {
    throw new Error(`${stateName} state does not belong to caster: ${expectedOwnerId}`);
  }
}
