import type { HandCardEffectExecutionContext } from "../hand-card-effect-context.ts";

/**
 * 方法名：getPlayerEffectTargetIds
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param context 本次操作所需的上下文。
 * @returns 本次处理得到的结果。
 */
export function getPlayerEffectTargetIds(
  context: HandCardEffectExecutionContext,
): readonly string[] {
  return context.targets
    .filter((target) => target.type === "player")
    .map((target) => target.targetId);
}
