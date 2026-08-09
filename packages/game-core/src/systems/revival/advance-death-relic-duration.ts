import { validateDeathRelicState, type DeathRelicState } from "./death-relic-state.ts";

/** 描述一个完整全局回合结束后的死亡遗物包倒计时结果。 */
export type AdvanceDeathRelicDurationResult =
  | { readonly outcome: "TICKED"; readonly state: DeathRelicState }
  | { readonly outcome: "EXPIRED"; readonly expiredRelic: DeathRelicState };

/**
 * 方法名：advanceDeathRelicDurationAtGlobalTurnEnd
 * 作用：在完整全局回合结束时减少死亡遗物包开放时间，并在归零后使遗物包消失。
 * @param state 当前地图上的死亡遗物包状态。
 * @returns 仍可开放的遗物包状态，或包含全部未拾取内容的到期消失结果。
 * @throws 遗物包状态非法时抛出错误。
 */
export function advanceDeathRelicDurationAtGlobalTurnEnd(
  state: DeathRelicState,
): AdvanceDeathRelicDurationResult {
  validateDeathRelicState(state);
  const remainingGlobalTurns = state.remainingGlobalTurns - 1;

  if (remainingGlobalTurns === 0) {
    return Object.freeze({ outcome: "EXPIRED", expiredRelic: state });
  }

  return Object.freeze({
    outcome: "TICKED",
    state: Object.freeze({ ...state, remainingGlobalTurns }),
  });
}
