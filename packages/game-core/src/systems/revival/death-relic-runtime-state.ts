import {
  advanceDeathRelicDurationAtGlobalTurnEnd,
  type AdvanceDeathRelicDurationResult,
} from "./advance-death-relic-duration.ts";
import { validateDeathRelicState, type DeathRelicState } from "./death-relic-state.ts";

/** 描述死亡遗物包模块需要持久化、同步与回放的运行时容器。 */
export interface DeathRelicRuntimeState {
  readonly relics: readonly DeathRelicState[];
  readonly lastGlobalTurnSequence: number;
}

/** 描述在全局回合结束时推进所有死亡遗物包后的统一结果。 */
export interface AdvanceDeathRelicRuntimeStateResult {
  readonly state: DeathRelicRuntimeState;
  readonly updatedRelics: readonly DeathRelicState[];
  readonly expiredRelics: readonly DeathRelicState[];
}

/**
 * 方法名：createDeathRelicRuntimeState
 * 作用：创建不包含任何地图遗物包的初始运行时容器。
 * @returns 可安全用于同步、持久化和回放的空遗物包容器。
 */
export function createDeathRelicRuntimeState(): DeathRelicRuntimeState {
  return freezeState({
    relics: [],
    lastGlobalTurnSequence: 0,
  });
}

/**
 * 方法名：addDeathRelic
 * 作用：将角色正式死亡时新创建的遗物包加入地图公共交互状态。
 * @param state 当前死亡遗物运行时容器。
 * @param relic 需要加入地图的新死亡遗物包。
 * @returns 包含新遗物包的不可变运行时状态。
 * @throws 遗物状态非法或遗物标识重复时抛出错误。
 */
export function addDeathRelic(
  state: DeathRelicRuntimeState,
  relic: DeathRelicState,
): DeathRelicRuntimeState {
  validateDeathRelicState(relic);

  if (state.relics.some((candidate) => candidate.deathRelicId === relic.deathRelicId)) {
    throw new Error(`Duplicate death relic id: ${relic.deathRelicId}`);
  }

  return freezeState({
    ...state,
    relics: [...state.relics, relic],
  });
}

/**
 * 方法名：replaceDeathRelic
 * 作用：以拾取后或其他合法交互后的最新遗物包状态替换容器内旧状态。
 * @param state 当前死亡遗物运行时容器。
 * @param relic 已更新且需要写回容器的死亡遗物包。
 * @returns 使用新遗物包替换旧遗物包后的不可变运行时状态。
 * @throws 遗物不存在或状态非法时抛出错误。
 */
export function replaceDeathRelic(
  state: DeathRelicRuntimeState,
  relic: DeathRelicState,
): DeathRelicRuntimeState {
  validateDeathRelicState(relic);
  const index = state.relics.findIndex(
    (candidate) => candidate.deathRelicId === relic.deathRelicId,
  );

  if (index < 0) {
    throw new Error(`Unknown death relic id: ${relic.deathRelicId}`);
  }

  const relics = [...state.relics];
  relics[index] = relic;

  return freezeState({ ...state, relics });
}

/**
 * 方法名：advanceDeathRelicRuntimeStateAtGlobalTurnEnd
 * 作用：在一个完整全局回合结束时统一推进遗物包倒计时，并从交互状态移除到期遗物。
 * @param state 当前死亡遗物运行时容器。
 * @param globalTurnSequence 本次全局回合结束的严格递增顺序值。
 * @returns 最新运行时状态、仍存在的更新遗物与已消失的遗物内容。
 * @throws 顺序值不递增或容器内遗物状态非法时抛出错误。
 */
export function advanceDeathRelicRuntimeStateAtGlobalTurnEnd(
  state: DeathRelicRuntimeState,
  globalTurnSequence: number,
): AdvanceDeathRelicRuntimeStateResult {
  assertPositiveSafeInteger(globalTurnSequence, "globalTurnSequence");

  if (globalTurnSequence <= state.lastGlobalTurnSequence) {
    throw new Error("Death relic global turn sequence must increase");
  }

  const activeRelics: DeathRelicState[] = [];
  const updatedRelics: DeathRelicState[] = [];
  const expiredRelics: DeathRelicState[] = [];

  for (const relic of state.relics) {
    const result: AdvanceDeathRelicDurationResult = advanceDeathRelicDurationAtGlobalTurnEnd(relic);

    if (result.outcome === "EXPIRED") {
      expiredRelics.push(result.expiredRelic);
      continue;
    }

    activeRelics.push(result.state);
    updatedRelics.push(result.state);
  }

  return Object.freeze({
    state: freezeState({
      relics: activeRelics,
      lastGlobalTurnSequence: globalTurnSequence,
    }),
    updatedRelics: Object.freeze(updatedRelics),
    expiredRelics: Object.freeze(expiredRelics),
  });
}

/** 冻结容器与遗物数组，避免外部直接修改运行时状态。 */
function freezeState(state: DeathRelicRuntimeState): DeathRelicRuntimeState {
  return Object.freeze({
    relics: Object.freeze([...state.relics]),
    lastGlobalTurnSequence: state.lastGlobalTurnSequence,
  });
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}
