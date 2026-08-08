import { assertResourceId } from "@genesis-rift/shared";

import type { HandCardId } from "./hand-card-definition.ts";

/**
 * 方法名：createTestHandCardId
 * 作用：将测试中的顺序数字转换为符合规范的六位手牌资源 ID。
 * @param sequence 测试手牌使用的顺序编号。
 * @returns 对应的手牌资源 ID。
 * @throws 编号不在资源 ID 有效范围内时抛出错误。
 */
export function createTestHandCardId(sequence: number): HandCardId {
  const cardId = `card_${String(sequence).padStart(6, "0")}`;
  assertResourceId(cardId, "card");
  return cardId as HandCardId;
}
