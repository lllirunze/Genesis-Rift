import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type StatusApplicationOutcome = "applied" | "stacked" | "refreshed";

/** 描述业务操作完成后返回的结果。 */
export interface StatusApplicationResult {
  readonly instance: StatusInstance;
  readonly outcome: StatusApplicationOutcome;
  readonly previousStacks: number;
  readonly addedStacks: 0 | 1;
}

/**
 * 方法名：applyStatus
 * 作用：执行该方法负责的业务规则并返回结算结果。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 本次处理得到的结果。
 */
export function applyStatus(
  instance: StatusInstance,
  definition: StatusDefinition,
): StatusApplicationResult {
  validateStatusInstance(instance, definition);

  const previousStacks = instance.currentStacks;
  const currentStacks = Math.min(previousStacks + 1, definition.maxStacks);
  const addedStacks: 0 | 1 = currentStacks > previousStacks ? 1 : 0;

  return {
    instance: {
      ...instance,
      currentStacks,
      remainingTurns: definition.duration.turns,
    },
    outcome: getApplicationOutcome(previousStacks, addedStacks),
    previousStacks,
    addedStacks,
  };
}

/**
 * 方法名：getApplicationOutcome
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param previousStacks 方法所需的 previousStacks 参数。
 * @param addedStacks 方法所需的 addedStacks 参数。
 * @returns 本次处理得到的结果。
 */
function getApplicationOutcome(
  previousStacks: number,
  addedStacks: 0 | 1,
): StatusApplicationOutcome {
  if (previousStacks === 0) {
    return "applied";
  }

  if (addedStacks === 1) {
    return "stacked";
  }

  return "refreshed";
}
