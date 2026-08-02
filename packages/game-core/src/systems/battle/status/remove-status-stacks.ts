import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type StatusStackRemovalOutcome = "unchanged" | "reduced" | "removed";

/** 描述业务操作完成后返回的结果。 */
export interface StatusStackRemovalResult {
  readonly instance: StatusInstance | null;
  readonly outcome: StatusStackRemovalOutcome;
  readonly previousStacks: number;
  readonly removedStacks: number;
}

/**
 * 方法名：removeStatusStacks
 * 作用：移除目标数据，并返回更新后的状态。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function removeStatusStacks(
  instance: StatusInstance,
  definition: StatusDefinition,
  amount: number,
): StatusStackRemovalResult {
  validateStatusInstance(instance, definition);
  assertPositiveSafeInteger(amount, "amount");

  const previousStacks = instance.currentStacks;

  if (previousStacks === 0) {
    return {
      instance,
      outcome: "unchanged",
      previousStacks,
      removedStacks: 0,
    };
  }

  const removedStacks = Math.min(previousStacks, amount);
  const currentStacks = previousStacks - removedStacks;

  if (currentStacks === 0) {
    return {
      instance: null,
      outcome: "removed",
      previousStacks,
      removedStacks,
    };
  }

  return {
    instance: {
      ...instance,
      currentStacks,
    },
    outcome: "reduced",
    previousStacks,
    removedStacks,
  };
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
