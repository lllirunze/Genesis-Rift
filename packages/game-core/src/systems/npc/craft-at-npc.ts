import type { ItemDefinitionCatalog, TileId } from "@genesis-rift/shared";

import {
  craftItem,
  type BlueprintDefinition,
  type CraftItemInput,
  type CraftItemResult,
  type PlayerBlueprintState,
} from "../crafting/index.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { getNpcServiceDefinition, type NpcDefinition } from "./npc-definition.ts";
import {
  evaluateNpcInteractionEligibility,
  type NpcInteractionEligibilityResult,
} from "./npc-interaction.ts";
import type { NpcRuntimeState } from "./npc-runtime-state.ts";

/** 描述在铁匠等制造 NPC 处执行图纸制造所需的完整输入。 */
export interface CraftAtNpcInput {
  readonly playerTileId: TileId;
  readonly environmentTags: readonly string[];
  readonly npcDefinition: NpcDefinition;
  readonly npcState: NpcRuntimeState;
  readonly inventory: PlayerInventoryState;
  readonly blueprints: PlayerBlueprintState;
  readonly blueprint: BlueprintDefinition;
  readonly craftInput: CraftItemInput;
  readonly itemDefinitions: ItemDefinitionCatalog;
}

/** 描述 NPC 服务或制造条件不满足时保持原背包的结果。 */
export interface CraftAtNpcFailureResult {
  readonly interacted: false;
  readonly interaction: NpcInteractionEligibilityResult;
  readonly inventory: PlayerInventoryState;
  readonly reason: "npc-interaction-unavailable" | "unmet-service-condition";
  readonly missingConditionIds: readonly string[];
}

/** 描述成功进入 NPC 制造服务后的图纸制造结果。 */
export interface CraftAtNpcSuccessResult {
  readonly interacted: true;
  readonly interaction: NpcInteractionEligibilityResult & { readonly allowed: true };
  readonly craft: CraftItemResult;
}

/** 描述 NPC 制造服务返回的完整结果。 */
export type CraftAtNpcResult = CraftAtNpcFailureResult | CraftAtNpcSuccessResult;

/**
 * 方法名：craftAtNpc
 * 作用：在同地块可用 NPC 的制造服务中检查服务条件，并复用图纸系统完成原子制造。
 * @param input 玩家位置、NPC、图纸、背包、条件与物品定义输入。
 * @returns NPC 服务不可用时保持原背包的失败结果，或已进入服务后的制造结果。
 * @throws NPC 未声明制造服务或配置之间存在不一致时抛出错误。
 */
export function craftAtNpc(input: CraftAtNpcInput): CraftAtNpcResult {
  const interaction = evaluateNpcInteractionEligibility(input.npcDefinition, input.npcState, {
    playerTileId: input.playerTileId,
    serviceType: "crafting",
    environmentTags: input.environmentTags,
  });

  if (!interaction.allowed) {
    return Object.freeze({
      interacted: false,
      interaction,
      inventory: input.inventory,
      reason: "npc-interaction-unavailable",
      missingConditionIds: Object.freeze([]),
    });
  }

  const service = getNpcServiceDefinition(input.npcDefinition, "crafting");

  if (service === null) {
    throw new Error("Allowed NPC interaction must provide the requested crafting service");
  }

  const satisfiedConditionIds = new Set(input.craftInput.satisfiedConditionIds);
  const missingConditionIds = service.requiredConditionIds.filter(
    (conditionId) => !satisfiedConditionIds.has(conditionId),
  );

  if (missingConditionIds.length > 0) {
    return Object.freeze({
      interacted: false,
      interaction,
      inventory: input.inventory,
      reason: "unmet-service-condition",
      missingConditionIds: Object.freeze(missingConditionIds),
    });
  }

  return Object.freeze({
    interacted: true,
    interaction,
    craft: craftItem(
      input.inventory,
      input.blueprints,
      input.blueprint,
      input.craftInput,
      input.itemDefinitions,
    ),
  });
}
