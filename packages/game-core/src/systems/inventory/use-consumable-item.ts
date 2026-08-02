import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import type { CharacterStatusState } from "../battle/status/index.ts";
import type { CharacterResourceState } from "../character/index.ts";
import { consumeBackpackItemQuantity } from "./consume-backpack-item.ts";
import type {
  ConsumableEffectDefinition,
  ConsumableUsageCatalog,
} from "./consumable-definition.ts";
import { validateConsumableUsageDefinition } from "./consumable-definition.ts";
import type {
  ConsumableEffectExecutionResult,
  ConsumableEffectState,
} from "./consumable-effect-handler.ts";
import type { ConsumableEffectHandlerRegistry } from "./consumable-effect-handler-registry.ts";
import { getItemDefinition } from "./backpack-geometry.ts";
import type { PlayerInventoryState } from "./player-inventory-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface UseConsumableItemInput {
  readonly playerId: PlayerId;
  readonly itemDefinitionId: string;
  readonly createdAtSequence: number;
  readonly createStatusInstanceId: (effectIndex: number, statusDefinitionId: string) => string;
}

/** 描述业务操作完成后返回的结果。 */
export type UseConsumableItemResult =
  | {
      readonly outcome: "used";
      readonly inventory: PlayerInventoryState;
      readonly resourceState: CharacterResourceState<string>;
      readonly statusState: CharacterStatusState;
      readonly effectResults: readonly ConsumableEffectExecutionResult[];
      readonly consumedItemInstanceIds: readonly string[];
      readonly remainingItemQuantity: number;
    }
  | {
      readonly outcome: "no_effect";
      readonly inventory: PlayerInventoryState;
      readonly resourceState: CharacterResourceState<string>;
      readonly statusState: CharacterStatusState;
      readonly effectResults: readonly ConsumableEffectExecutionResult[];
      readonly consumedItemInstanceIds: readonly [];
      readonly remainingItemQuantity: number;
    };

/**
 * 方法名：useConsumableItem
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param resourceState 方法所需的 resourceState 参数。
 * @param statusState 方法所需的 statusState 参数。
 * @param itemDefinitions 方法所需的 itemDefinitions 参数。
 * @param usageCatalog 方法所需的 usageCatalog 参数。
 * @param registry 方法所需的 registry 参数。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function useConsumableItem(
  inventory: PlayerInventoryState,
  resourceState: CharacterResourceState<string>,
  statusState: CharacterStatusState,
  itemDefinitions: ItemDefinitionCatalog,
  usageCatalog: ConsumableUsageCatalog,
  registry: ConsumableEffectHandlerRegistry,
  input: UseConsumableItemInput,
): UseConsumableItemResult {
  validateInput(input);
  validateOwners(inventory, resourceState, statusState, input.playerId);
  const itemDefinition = getItemDefinition(itemDefinitions, input.itemDefinitionId);

  if (itemDefinition.category !== "consumable") {
    throw new Error(`Item is not consumable: ${input.itemDefinitionId}`);
  }

  const usage = usageCatalog[input.itemDefinitionId];

  if (usage === undefined) {
    throw new Error(`Missing consumable usage definition: ${input.itemDefinitionId}`);
  }

  validateConsumableUsageDefinition(usage);
  preflightHandlers(usage.effects, registry);

  // 先计算消耗结果，但只有至少一个效果成功时才对外提交该结果。
  const consumption = consumeBackpackItemQuantity(inventory.backpack, input.itemDefinitionId, 1);
  let state: ConsumableEffectState = { resourceState, statusState };
  const effectResults: ConsumableEffectExecutionResult[] = [];

  for (let effectIndex = 0; effectIndex < usage.effects.length; effectIndex += 1) {
    const effect = usage.effects[effectIndex]!;
    const result = registry.execute(effect, {
      playerId: input.playerId,
      itemDefinitionId: input.itemDefinitionId,
      effectIndex,
      state,
      createdAtSequence: input.createdAtSequence,
      createStatusInstanceId: input.createStatusInstanceId,
    });
    effectResults.push(result);
    state = result.state;
  }

  const frozenResults = Object.freeze([...effectResults]);

  if (!effectResults.some((result) => result.outcome === "applied")) {
    return Object.freeze({
      outcome: "no_effect",
      inventory,
      resourceState,
      statusState,
      effectResults: frozenResults,
      consumedItemInstanceIds: Object.freeze([]) as readonly [],
      remainingItemQuantity: consumption.remainingDefinitionQuantity + 1,
    });
  }

  return Object.freeze({
    outcome: "used",
    inventory: { ...inventory, backpack: consumption.backpack },
    resourceState: state.resourceState,
    statusState: state.statusState,
    effectResults: frozenResults,
    consumedItemInstanceIds: Object.freeze([...consumption.consumedItemInstanceIds]),
    remainingItemQuantity: consumption.remainingDefinitionQuantity,
  });
}

/**
 * 方法名：preflightHandlers
 * 作用：执行该方法负责的单一业务操作。
 * @param effects 方法所需的 effects 参数。
 * @param registry 方法所需的 registry 参数。
 * @returns 无返回值。
 */
function preflightHandlers(
  effects: readonly ConsumableEffectDefinition[],
  registry: ConsumableEffectHandlerRegistry,
): void {
  for (const effect of effects) {
    registry.get(effect.effectId);
  }
}

/**
 * 方法名：validateOwners
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param inventory 方法所需的 inventory 参数。
 * @param resourceState 方法所需的 resourceState 参数。
 * @param statusState 方法所需的 statusState 参数。
 * @param playerId 目标玩家标识。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateOwners(
  inventory: PlayerInventoryState,
  resourceState: CharacterResourceState<string>,
  statusState: CharacterStatusState,
  playerId: PlayerId,
): void {
  if (inventory.backpack.playerId !== playerId) {
    throw new Error("Consumable inventory does not belong to the player");
  }

  if (resourceState.playerId !== playerId) {
    throw new Error("Consumable resource state does not belong to the player");
  }

  if (statusState.targetId !== playerId) {
    throw new Error("Consumable status state does not belong to the player");
  }
}

/**
 * 方法名：validateInput
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param input 本次处理的输入数据。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateInput(input: UseConsumableItemInput): void {
  if (input.itemDefinitionId.trim().length === 0) {
    throw new TypeError("itemDefinitionId must not be empty");
  }

  if (!Number.isSafeInteger(input.createdAtSequence) || input.createdAtSequence < 0) {
    throw new RangeError("createdAtSequence must be a non-negative safe integer");
  }
}
