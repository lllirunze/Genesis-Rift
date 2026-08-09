import type { PlayerId, TileId } from "@genesis-rift/shared";

import type { ItemInstance } from "../inventory/index.ts";

import {
  getDeathRelicPickedUnitCount,
  validateDeathRelicState,
  type DeathRelicState,
} from "./death-relic-state.ts";
import { MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER } from "./revival-config.ts";

/** 描述死亡遗物包中可被玩家选择的内容类型。 */
export const DEATH_RELIC_CONTENT_KINDS = ["COIN", "ITEM"] as const;

/** 描述死亡遗物包中一个可被选择的内容单位。 */
export type DeathRelicContent =
  | {
      readonly kind: "COIN";
      readonly quantity: number;
    }
  | {
      readonly kind: "ITEM";
      readonly item: ItemInstance;
    };

/** 描述玩家检视死亡遗物包时需要提供的位置上下文。 */
export interface InspectDeathRelicInput {
  readonly relic: DeathRelicState;
  readonly playerId: PlayerId;
  readonly currentTileId: TileId;
}

/** 描述死亡遗物包无法被当前玩家检视的原因。 */
export type DeathRelicInspectionFailureReason = "NOT_ON_RELIC_TILE";

/** 描述死亡遗物包检视成功后可供界面展示的公开信息。 */
export interface DeathRelicInspection {
  readonly deathRelicId: string;
  readonly ownerPlayerId: PlayerId;
  readonly tileId: TileId;
  readonly remainingGlobalTurns: number;
  readonly contents: readonly DeathRelicContent[];
  readonly pickedUnitCount: number;
  readonly remainingPickupUnitCount: number;
}

/** 描述死亡遗物包检视的成功或失败结果。 */
export type InspectDeathRelicResult =
  | {
      readonly outcome: "INSPECTED";
      readonly inspection: DeathRelicInspection;
    }
  | {
      readonly outcome: "REJECTED";
      readonly reason: DeathRelicInspectionFailureReason;
    };

/**
 * 方法名：inspectDeathRelic
 * 作用：校验角色已进入死亡遗物所在格，并返回可供界面展示的公开遗物内容与个人拾取额度。
 * @param input 当前遗物状态、检视玩家与玩家所在地图格。
 * @returns 检视成功时返回遗物公开信息；不在遗物格时返回拒绝原因。
 * @throws 遗物状态或玩家、格子标识非法时抛出错误。
 */
export function inspectDeathRelic(input: InspectDeathRelicInput): InspectDeathRelicResult {
  validateDeathRelicState(input.relic);
  assertNonEmptyString(input.playerId, "playerId");
  assertNonEmptyString(input.currentTileId, "currentTileId");

  if (input.currentTileId !== input.relic.tileId) {
    return {
      outcome: "REJECTED",
      reason: "NOT_ON_RELIC_TILE",
    };
  }

  const pickedUnitCount = getDeathRelicPickedUnitCount(input.relic, input.playerId);

  return {
    outcome: "INSPECTED",
    inspection: {
      deathRelicId: input.relic.deathRelicId,
      ownerPlayerId: input.relic.ownerPlayerId,
      tileId: input.relic.tileId,
      remainingGlobalTurns: input.relic.remainingGlobalTurns,
      contents: createDeathRelicContents(input.relic),
      pickedUnitCount,
      remainingPickupUnitCount: MAX_DEATH_RELIC_PICKUP_UNITS_PER_PLAYER - pickedUnitCount,
    },
  };
}

/**
 * 方法名：createDeathRelicContents
 * 作用：将遗物包内部存储的元宝与物品转换为统一的公开内容列表。
 * @param relic 已通过校验的死亡遗物包状态。
 * @returns 保持当前遗物内容顺序的只读公开内容列表。
 */
function createDeathRelicContents(relic: DeathRelicState): readonly DeathRelicContent[] {
  const contents: DeathRelicContent[] = [];

  if (relic.coinQuantity > 0) {
    contents.push({
      kind: "COIN",
      quantity: relic.coinQuantity,
    });
  }

  for (const item of relic.items) {
    contents.push({
      kind: "ITEM",
      item,
    });
  }

  return Object.freeze(contents);
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
