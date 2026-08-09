import type { TileId } from "@genesis-rift/shared";

/** 描述统一抵达结算中可依次执行的阶段。 */
export const MOVEMENT_ARRIVAL_PHASES = [
  "REGION",
  "TILE_EVENT",
  "FORCED_DISPLACEMENT",
  "FINAL",
] as const;
/** 描述抵达结算阶段。 */
export type MovementArrivalPhase = (typeof MOVEMENT_ARRIVAL_PHASES)[number];
/** 描述一次抵达结算期间可被后续阶段更新的位置状态。 */
export interface MovementArrivalState {
  readonly tileId: TileId;
  readonly triggeredSourceIds: readonly string[];
}
/** 描述一个由区域、地块或事件系统实现的抵达处理器。 */
export interface MovementArrivalHandler {
  readonly phase: Exclude<MovementArrivalPhase, "FINAL">;
  readonly handlerId: string;
  settle(state: MovementArrivalState): MovementArrivalState;
}
/** 描述统一抵达结算完成后的可追溯结果。 */
export interface MovementArrivalSettlementResult {
  readonly state: MovementArrivalState;
  readonly processedHandlerIds: readonly string[];
}

/**
 * 方法名：settleMovementArrival
 * 作用：按区域、地块事件、强制位移和最终确认的固定顺序完成一次位置抵达结算。
 * @param initialTileId 普通移动、连接或强制位移后抵达的初始地块。
 * @param handlers 已按业务注册的区域、事件和强制位移处理器。
 * @returns 最终位置、已触发来源与实际执行的处理器标识。
 * @throws 处理器标识重复或返回空位置时抛出错误。
 */
export function settleMovementArrival(
  initialTileId: TileId,
  handlers: readonly MovementArrivalHandler[],
): MovementArrivalSettlementResult {
  assertNonEmptyString(initialTileId, "initialTileId");
  const handlerIds = new Set<string>();
  let state: MovementArrivalState = Object.freeze({
    tileId: initialTileId,
    triggeredSourceIds: [],
  });
  const processedHandlerIds: string[] = [];
  for (const phase of MOVEMENT_ARRIVAL_PHASES) {
    if (phase === "FINAL") continue;
    for (const handler of handlers) {
      if (handler.phase !== phase) continue;
      assertNonEmptyString(handler.handlerId, "handlerId");
      if (handlerIds.has(handler.handlerId))
        throw new Error(`Duplicate movement arrival handler: ${handler.handlerId}`);
      handlerIds.add(handler.handlerId);
      if (state.triggeredSourceIds.includes(handler.handlerId)) continue;
      const next = handler.settle(state);
      assertNonEmptyString(next.tileId, "handler result tileId");
      state = Object.freeze({
        tileId: next.tileId,
        triggeredSourceIds: Object.freeze([...state.triggeredSourceIds, handler.handlerId]),
      });
      processedHandlerIds.push(handler.handlerId);
    }
  }
  return Object.freeze({ state, processedHandlerIds: Object.freeze(processedHandlerIds) });
}

/** 校验字符串为非空标识。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new TypeError(`${field} must be a non-empty string`);
}
