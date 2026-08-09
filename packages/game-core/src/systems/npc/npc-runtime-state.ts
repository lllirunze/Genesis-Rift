import type { TileId } from "@genesis-rift/shared";

/** 描述一个已生成 NPC 的动态位置与可交互状态。 */
export interface NpcRuntimeState {
  readonly npcId: string;
  readonly definitionId: string;
  readonly currentTileId: TileId;
  readonly available: boolean;
}

/**
 * 方法名：createNpcRuntimeState
 * 作用：创建一个位于指定地块且默认可交互的 NPC 运行时状态。
 * @param input NPC 实例标识、静态定义标识、当前位置与可用状态。
 * @returns 已校验的 NPC 运行时状态。
 * @throws NPC 实例标识或静态定义标识为空时抛出错误。
 */
export function createNpcRuntimeState(input: NpcRuntimeState): NpcRuntimeState {
  assertNonEmptyString(input.npcId, "npcId");
  assertNonEmptyString(input.definitionId, "definitionId");

  if (typeof input.available !== "boolean") {
    throw new TypeError("available must be a boolean");
  }

  return Object.freeze({ ...input });
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入为包含有效内容的字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空白时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
