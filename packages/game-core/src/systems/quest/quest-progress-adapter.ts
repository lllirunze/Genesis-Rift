import type { BattleSettlement } from "../battle/settlement/battle-settlement.ts";
import type { ResolvedEventInstance } from "../event/event-instance.ts";
import type { SuccessfulTileEntryResult } from "../map/exploration/player-exploration-state.ts";
import type { ReceiveItemResult } from "../inventory/receive-item.ts";

import type { QuestProgressEvent } from "./quest-runtime-state.ts";

/**
 * 方法名：createQuestProgressEventFromBattleDefeat
 * 作用：在目标已正式死亡时，将战斗结算转换为击败类任务进度事件。
 * @param settlement 已完成的战斗结算。
 * @param defeatedTargetId 被击败对象对应的静态或运行时目标标识。
 * @returns 目标正式死亡时返回击败进度事件，否则返回 null。
 * @throws 目标标识为空时抛出错误。
 */
export function createQuestProgressEventFromBattleDefeat(
  settlement: BattleSettlement,
  defeatedTargetId: string,
): QuestProgressEvent | null {
  assertNonEmptyString(defeatedTargetId, "defeatedTargetId");

  if (settlement.defenderSurvival.status !== "DEAD") {
    return null;
  }

  return Object.freeze({ type: "DEFEAT", targetId: defeatedTargetId, count: 1 });
}

/**
 * 方法名：createQuestProgressEventFromItemReceipt
 * 作用：将成功进入背包或临时拾取区的物品数量转换为收集类任务进度事件。
 * @param definitionId 已获得物品的静态资源 ID。
 * @param receipt 物品接收流程的最终结果。
 * @returns 存放成功数量大于零时返回收集进度事件，否则返回 null。
 * @throws 物品资源标识为空时抛出错误。
 */
export function createQuestProgressEventFromItemReceipt(
  definitionId: string,
  receipt: ReceiveItemResult,
): QuestProgressEvent | null {
  assertNonEmptyString(definitionId, "definitionId");
  const count = receipt.backpackQuantityAdded + receipt.temporaryQuantityAdded;

  if (count === 0) {
    return null;
  }

  return Object.freeze({ type: "COLLECT", targetId: definitionId, count });
}

/**
 * 方法名：createQuestProgressEventFromFirstExploration
 * 作用：仅在玩家首次成功进入地图单元时生成探索类任务进度事件。
 * @param result 地图探索状态记录的结果。
 * @returns 首次探索时返回探索进度事件，重复进入时返回 null。
 */
export function createQuestProgressEventFromFirstExploration(
  result: SuccessfulTileEntryResult,
): QuestProgressEvent | null {
  if (!result.isFirstExploration) {
    return null;
  }

  return Object.freeze({ type: "EXPLORE", targetId: result.enteredTileId, count: 1 });
}

/**
 * 方法名：createQuestProgressEventFromResolvedEvent
 * 作用：将已完成结算的事件转换为调查类任务进度事件，未结算事件不产生任务进度。
 * @param event 已完成结算的事件实例。
 * @returns 指向对应事件资源的调查进度事件。
 */
export function createQuestProgressEventFromResolvedEvent(
  event: ResolvedEventInstance,
): QuestProgressEvent {
  return Object.freeze({ type: "INVESTIGATE", targetId: event.eventId, count: 1 });
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是非空字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非空字符串时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
