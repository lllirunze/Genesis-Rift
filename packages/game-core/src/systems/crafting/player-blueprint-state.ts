import { assertResourceId } from "@genesis-rift/shared";

/** 描述玩家永久掌握的图纸知识。 */
export interface PlayerBlueprintState {
  readonly knownBlueprintIds: readonly string[];
}

/**
 * 方法名：createPlayerBlueprintState
 * 作用：创建不包含任何已掌握图纸的初始状态。
 * @returns 新建的玩家图纸状态。
 */
export function createPlayerBlueprintState(): PlayerBlueprintState {
  return Object.freeze({ knownBlueprintIds: Object.freeze([]) });
}

/**
 * 方法名：knowsBlueprint
 * 作用：判断玩家是否已经永久掌握指定图纸。
 * @param state 玩家图纸状态。
 * @param blueprintId 待查询的图纸资源 ID。
 * @returns 已掌握时返回 true。
 */
export function knowsBlueprint(state: PlayerBlueprintState, blueprintId: string): boolean {
  assertResourceId(blueprintId, "blueprint");
  return state.knownBlueprintIds.includes(blueprintId);
}

/**
 * 方法名：learnBlueprint
 * 作用：将图纸永久写入玩家知识状态，重复学习不会产生重复记录。
 * @param state 原玩家图纸状态。
 * @param blueprintId 需要掌握的图纸资源 ID。
 * @returns 更新后的玩家图纸状态。
 */
export function learnBlueprint(
  state: PlayerBlueprintState,
  blueprintId: string,
): PlayerBlueprintState {
  assertResourceId(blueprintId, "blueprint");

  if (knowsBlueprint(state, blueprintId)) {
    return state;
  }

  return Object.freeze({
    knownBlueprintIds: Object.freeze([...state.knownBlueprintIds, blueprintId].toSorted()),
  });
}
