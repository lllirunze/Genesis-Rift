import {
  receiveItem,
  type ItemDefinitionCatalog,
  type PlayerInventoryState,
  type UnresolvedReceivedItem,
} from "../../inventory/index.ts";
import type { HandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateHandCardItemInstanceIdsInput {
  readonly context: HandCardEffectExecutionContext;
  readonly targetPlayerId: string;
  readonly itemDefinitionId: string;
  readonly quantity: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface ItemObtainEffectHandlerDependencies {
  readonly definitions: ItemDefinitionCatalog;
  readonly getPlayerInventoryState: (targetPlayerId: string) => PlayerInventoryState | null;
  readonly savePlayerInventoryState: (inventory: PlayerInventoryState) => void;
  readonly createItemInstanceIds: (input: CreateHandCardItemInstanceIdsInput) => readonly string[];
}

/** 描述业务操作完成后返回的结果。 */
export interface ItemObtainTargetResult {
  readonly targetPlayerId: string;
  readonly inventory: PlayerInventoryState;
  readonly backpackQuantityAdded: number;
  readonly temporaryQuantityAdded: number;
  readonly unresolvedItems: readonly UnresolvedReceivedItem[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface ItemObtainEffectOutput {
  readonly targets: readonly ItemObtainTargetResult[];
}

/**
 * 方法名：createItemObtainEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createItemObtainEffectHandler(
  dependencies: ItemObtainEffectHandlerDependencies,
): HandCardEffectHandler<"item.obtain", ItemObtainEffectOutput> {
  return {
    effectId: "item.obtain",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      const targetResults: ItemObtainTargetResult[] = [];

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const inventory = dependencies.getPlayerInventoryState(targetPlayerId);

        if (inventory === null) {
          continue;
        }

        if (inventory.backpack.playerId !== targetPlayerId) {
          throw new Error(
            `player inventory state does not belong to target player: ${targetPlayerId}`,
          );
        }

        const result = receiveItem(
          inventory,
          {
            definitionId: effect.parameters.itemDefinitionId,
            quantity: effect.parameters.quantity,
            sourceId: context.executionId,
            newItemInstanceIds: dependencies.createItemInstanceIds({
              context,
              targetPlayerId,
              itemDefinitionId: effect.parameters.itemDefinitionId,
              quantity: effect.parameters.quantity,
            }),
          },
          dependencies.definitions,
        );

        targetResults.push({
          targetPlayerId,
          inventory: result.inventory,
          backpackQuantityAdded: result.backpackQuantityAdded,
          temporaryQuantityAdded: result.temporaryQuantityAdded,
          unresolvedItems: result.unresolvedItems,
        });
      }

      if (targetResults.length === 0) {
        return { effectId: "item.obtain", outcome: "skipped", output: null };
      }

      for (const targetResult of targetResults) {
        if (targetResult.backpackQuantityAdded > 0 || targetResult.temporaryQuantityAdded > 0) {
          dependencies.savePlayerInventoryState(targetResult.inventory);
        }
      }

      return {
        effectId: "item.obtain",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}
