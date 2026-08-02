import type { PlayerId } from "@genesis-rift/shared";

import type { SpecialConnectionDefinition } from "./special-connection-definition.ts";

/** 描述一条特殊连接在当前对局中的启用与发现状态。 */
export interface SpecialConnectionState {
  readonly connectionId: string;
  readonly enabled: boolean;
  readonly discoveredByPlayerIds: readonly PlayerId[];
}

/**
 * 方法名：createSpecialConnectionState
 * 作用：根据静态定义创建一条尚未被任何玩家发现的连接运行时状态。
 * @param definition 需要初始化状态的特殊连接定义。
 * @param enabled 连接在对局开始时是否启用。
 * @returns 不可变的特殊连接运行时状态。
 */
export function createSpecialConnectionState(
  definition: SpecialConnectionDefinition,
  enabled = true,
): SpecialConnectionState {
  return Object.freeze({
    connectionId: definition.connectionId,
    enabled,
    discoveredByPlayerIds: Object.freeze([]),
  });
}

/**
 * 方法名：discoverSpecialConnection
 * 作用：为指定玩家永久记录隐藏特殊连接的发现结果。
 * @param state 当前特殊连接运行时状态。
 * @param playerId 完成连接发现的玩家标识。
 * @returns 包含新发现记录的不可变运行时状态。
 */
export function discoverSpecialConnection(
  state: SpecialConnectionState,
  playerId: PlayerId,
): SpecialConnectionState {
  if (String(playerId).trim().length === 0) {
    throw new TypeError("playerId must not be empty");
  }

  if (state.discoveredByPlayerIds.includes(playerId)) {
    return state;
  }

  return Object.freeze({
    ...state,
    discoveredByPlayerIds: Object.freeze([...state.discoveredByPlayerIds, playerId]),
  });
}

/**
 * 方法名：setSpecialConnectionEnabled
 * 作用：更新特殊连接在当前对局中的启用状态。
 * @param state 当前特殊连接运行时状态。
 * @param enabled 是否允许继续使用该连接。
 * @returns 更新后的不可变运行时状态。
 */
export function setSpecialConnectionEnabled(
  state: SpecialConnectionState,
  enabled: boolean,
): SpecialConnectionState {
  return state.enabled === enabled ? state : Object.freeze({ ...state, enabled });
}
