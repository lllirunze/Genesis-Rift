import type { ItemDefinitionCatalog, TileId } from "@genesis-rift/shared";

import type { PlayerInventoryState } from "../inventory/index.ts";

import {
  pickDeathRelicContent,
  type DeathRelicPickupFailureReason,
  type DeathRelicPickupTarget,
} from "./pick-death-relic-content.ts";
import { replaceDeathRelic, type DeathRelicRuntimeState } from "./death-relic-runtime-state.ts";

/** 描述运行时容器中不存在指定死亡遗物包时的失败原因。 */
export type PickDeathRelicFromRuntimeFailureReason =
  "RELIC_NOT_FOUND" | DeathRelicPickupFailureReason;

/** 描述从死亡遗物运行时容器中拾取内容所需的完整输入。 */
export interface PickDeathRelicFromRuntimeInput {
  readonly runtimeState: DeathRelicRuntimeState;
  readonly deathRelicId: string;
  readonly inventory: PlayerInventoryState;
  readonly currentTileId: TileId;
  readonly target: DeathRelicPickupTarget;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly newItemInstanceIds: readonly string[];
}

/** 描述从死亡遗物运行时容器拾取内容后的统一结果。 */
export type PickDeathRelicFromRuntimeResult =
  | {
      readonly outcome: "PICKED";
      readonly runtimeState: DeathRelicRuntimeState;
      readonly inventory: PlayerInventoryState;
      readonly deathRelicId: string;
      readonly target: DeathRelicPickupTarget;
    }
  | {
      readonly outcome: "REJECTED";
      readonly reason: PickDeathRelicFromRuntimeFailureReason;
      readonly runtimeState: DeathRelicRuntimeState;
      readonly inventory: PlayerInventoryState;
    };

/**
 * 方法名：pickDeathRelicFromRuntime
 * 作用：从公共遗物包容器查找目标遗物，并将内容接收与遗物状态回写组织为一个原子业务入口。
 * @param input 遗物包运行时容器、目标遗物、玩家背包、位置、选择内容与静态物品定义。
 * @returns 成功时返回同步更新后的容器和背包；失败时返回完全保持不变的原状态。
 * @throws 静态物品定义、实例标识或已存储遗物状态非法时抛出错误。
 */
export function pickDeathRelicFromRuntime(
  input: PickDeathRelicFromRuntimeInput,
): PickDeathRelicFromRuntimeResult {
  const relic = input.runtimeState.relics.find(
    (candidate) => candidate.deathRelicId === input.deathRelicId,
  );

  if (relic === undefined) {
    return {
      outcome: "REJECTED",
      reason: "RELIC_NOT_FOUND",
      runtimeState: input.runtimeState,
      inventory: input.inventory,
    };
  }

  const result = pickDeathRelicContent({
    relic,
    inventory: input.inventory,
    currentTileId: input.currentTileId,
    target: input.target,
    itemDefinitions: input.itemDefinitions,
    newItemInstanceIds: input.newItemInstanceIds,
  });

  if (result.outcome === "REJECTED") {
    return {
      outcome: "REJECTED",
      reason: result.reason,
      runtimeState: input.runtimeState,
      inventory: input.inventory,
    };
  }

  return {
    outcome: "PICKED",
    runtimeState: replaceDeathRelic(input.runtimeState, result.relic),
    inventory: result.inventory,
    deathRelicId: result.relic.deathRelicId,
    target: result.pickedTarget,
  };
}
