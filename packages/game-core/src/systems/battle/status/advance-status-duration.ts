import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type StatusDurationAdvanceOutcome = "unchanged" | "ticked" | "expired";

/** 描述业务操作完成后返回的结果。 */
export interface StatusDurationAdvanceResult {
  readonly instance: StatusInstance | null;
  readonly outcome: StatusDurationAdvanceOutcome;
  readonly previousRemainingTurns: number;
}

/**
 * 方法名：advanceStatusDurationAtTurnEnd
 * 作用：执行该方法负责的单一业务操作。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @param turnOwnerId 方法所需的 turnOwnerId 参数。
 * @returns 本次处理得到的结果。
 */
export function advanceStatusDurationAtTurnEnd(
  instance: StatusInstance,
  definition: StatusDefinition,
  turnOwnerId: string,
): StatusDurationAdvanceResult {
  validateStatusInstance(instance, definition);

  if (instance.currentStacks === 0 || instance.targetId !== turnOwnerId) {
    return {
      instance,
      outcome: "unchanged",
      previousRemainingTurns: instance.remainingTurns,
    };
  }

  if (instance.remainingTurns <= 1) {
    return {
      instance: null,
      outcome: "expired",
      previousRemainingTurns: instance.remainingTurns,
    };
  }

  return {
    instance: {
      ...instance,
      remainingTurns: instance.remainingTurns - 1,
    },
    outcome: "ticked",
    previousRemainingTurns: instance.remainingTurns,
  };
}
