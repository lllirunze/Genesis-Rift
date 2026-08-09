/** 描述任务触发、领取与其他条件检查所需的公共上下文。 */
export interface QuestConditionContext {
  readonly ownerId: string;
  readonly currentTurn: number;
}

/** 为外部系统提供任务条件的统一判断入口。 */
export interface QuestConditionEvaluator {
  /** 根据条件资源标识判断当前上下文是否满足对应任务条件。 */
  isSatisfied(conditionId: string, context: QuestConditionContext): boolean;
}

/** 未配置条件时使用的默认条件判断器。 */
export const ALWAYS_SATISFIED_QUEST_CONDITION_EVALUATOR: QuestConditionEvaluator = Object.freeze({
  isSatisfied: () => true,
});

/**
 * 方法名：areQuestConditionsSatisfied
 * 作用：依次检查任务条件引用，任意条件不满足时立即返回失败。
 * @param conditionIds 需要同时满足的任务条件资源标识。
 * @param evaluator 负责读取外部世界状态的条件判断器。
 * @param context 当前任务所属玩家与回合上下文。
 * @returns 所有条件满足时返回 true，否则返回 false。
 * @throws 条件标识或回合上下文非法时抛出错误。
 */
export function areQuestConditionsSatisfied(
  conditionIds: readonly string[],
  evaluator: QuestConditionEvaluator,
  context: QuestConditionContext,
): boolean {
  assertNonEmptyString(context.ownerId, "context.ownerId");
  assertNonNegativeSafeInteger(context.currentTurn, "context.currentTurn");

  for (const conditionId of conditionIds) {
    assertResourceId(conditionId, "condition");

    if (!evaluator.isSatisfied(conditionId, context)) {
      return false;
    }
  }

  return true;
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
import { assertResourceId } from "@genesis-rift/shared";
