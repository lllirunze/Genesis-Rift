import type { SkillDefinition } from "./skill-definition.ts";
import {
  type SkillEffectExecutionContext,
  type SkillEffectExecutionResult,
  SkillEffectHandlerRegistry,
} from "./skill-effect-handler.ts";

/**
 * 方法名：executeSkillEffects
 * 作用：按配置顺序执行技能效果，并要求每种效果均由对应处理器明确承接。
 * @param definition 已通过资格检查且已提交使用状态的技能定义。
 * @param context 本次技能释放的施法者、目标与执行标识。
 * @param registry 已注册的技能效果处理器集合。
 * @returns 每项效果依次产生的结构化执行结果。
 * @throws 技能效果没有对应处理器或执行上下文不合法时抛出错误。
 */
export function executeSkillEffects(
  definition: SkillDefinition,
  context: SkillEffectExecutionContext,
  registry: SkillEffectHandlerRegistry,
): readonly SkillEffectExecutionResult[] {
  validateSkillEffectExecutionContext(context);
  const results: SkillEffectExecutionResult[] = [];

  for (const effect of definition.effects) {
    const handler = registry.get(effect.effectType);

    if (handler === null) {
      throw new Error(`Skill effect handler not registered: ${effect.effectType}`);
    }

    results.push(handler.execute(effect, context));
  }

  return Object.freeze(results);
}

/**
 * 方法名：validateSkillEffectExecutionContext
 * 作用：校验技能效果执行所需的执行标识、施法者和目标标识均可明确追踪。
 * @param context 需要校验的执行上下文。
 * @returns 无返回值。
 * @throws 执行标识、施法者或目标标识为空时抛出错误。
 */
function validateSkillEffectExecutionContext(context: SkillEffectExecutionContext): void {
  assertNonEmptyString(context.executionId, "executionId");
  assertNonEmptyString(context.casterId, "casterId");

  for (const targetId of context.targetIds) {
    assertNonEmptyString(targetId, "targetIds");
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入为包含有效内容的字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空白时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
