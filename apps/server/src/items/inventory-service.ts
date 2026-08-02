import {
  abandonTemporaryPickup,
  advanceTemporaryPickupOwnerTurn,
  consumeBackpackItemQuantity,
  mergeBackpackItemStacks,
  moveBackpackItem,
  placeItemInBackpack,
  receiveItem,
  removeBackpackItem,
  splitBackpackItemStack,
  storeTemporaryPickupInBackpack,
  upgradeBackpack,
  type BackpackPosition,
  type ItemInstance,
  type PlayerInventoryState,
  type ReceiveItemInput,
  type ReceiveItemResult,
  type TemporaryPickup,
} from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";
import type { ItemServiceContext } from "./item-service-context.ts";

interface InventoryRequest extends ItemServiceContext {
  readonly inventory: PlayerInventoryState;
}

/** 描述一次业务请求所需的输入数据。 */
export interface ReceiveInventoryItemRequest extends InventoryRequest {
  readonly input: ReceiveItemInput;
}

/** 描述一次业务请求所需的输入数据。 */
export interface PlaceInventoryItemRequest extends InventoryRequest {
  readonly item: ItemInstance;
  readonly position: BackpackPosition;
}

/** 描述一次业务请求所需的输入数据。 */
export interface MoveInventoryItemRequest extends InventoryRequest {
  readonly itemInstanceId: string;
  readonly targetPosition: BackpackPosition;
}

/** 描述一次业务请求所需的输入数据。 */
export interface MergeInventoryItemStacksRequest extends InventoryRequest {
  readonly sourceItemInstanceId: string;
  readonly targetItemInstanceId: string;
}

/** 描述一次业务请求所需的输入数据。 */
export interface SplitInventoryItemStackRequest extends InventoryRequest {
  readonly sourceItemInstanceId: string;
  readonly splitQuantity: number;
  readonly newItemInstanceId: string;
  readonly targetPosition: BackpackPosition;
}

/** 描述一次业务请求所需的输入数据。 */
export interface RemoveInventoryItemRequest extends InventoryRequest {
  readonly itemInstanceId: string;
  readonly reason: string;
}

/** 描述一次业务请求所需的输入数据。 */
export interface ConsumeInventoryItemRequest extends InventoryRequest {
  readonly definitionId: string;
  readonly quantity: number;
  readonly reason: string;
}

/** 描述一次业务请求所需的输入数据。 */
export interface StoreTemporaryPickupRequest extends InventoryRequest {
  readonly targetPosition?: BackpackPosition;
}

/** 描述业务操作完成后返回的结果。 */
export interface InventoryStateResult {
  readonly inventory: PlayerInventoryState;
}

/** 描述业务操作完成后返回的结果。 */
export interface MergeInventoryItemStacksResult extends InventoryStateResult {
  readonly transferredQuantity: number;
}

/** 描述业务操作完成后返回的结果。 */
export interface RemoveInventoryItemResult extends InventoryStateResult {
  readonly item: ItemInstance;
}

/** 描述业务操作完成后返回的结果。 */
export interface ConsumeInventoryItemResult extends InventoryStateResult {
  readonly remainingDefinitionQuantity: number;
  readonly consumedItemInstanceIds: readonly string[];
}

/** 描述业务操作完成后返回的结果。 */
export interface AdvanceTemporaryPickupResult extends InventoryStateResult {
  readonly expiredPickup: TemporaryPickup | null;
}

/** 封装该模块的状态与操作入口。 */
export class InventoryService {
  readonly #definitions: ItemDefinitionCatalog;
  readonly #logger: Logger;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param definitions 方法所需的 definitions 参数。
   * @param logger 方法所需的 logger 参数。
   * @returns 无返回值。
   */
  constructor(definitions: ItemDefinitionCatalog, logger: Logger) {
    this.#definitions = definitions;
    this.#logger = logger;
  }

  /**
   * 方法名：receiveItem
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  receiveItem(request: ReceiveInventoryItemRequest): ReceiveItemResult {
    return this.#run(request, "receiveItem", () => {
      const result = receiveItem(request.inventory, request.input, this.#definitions);
      const unresolvedQuantity = result.unresolvedItems.reduce(
        (total, unresolved) => total + unresolved.item.quantity,
        0,
      );

      this.#info(
        request,
        `Player received ${request.input.quantity} units of item ${request.input.definitionId}.`,
        {
          definitionId: request.input.definitionId,
          sourceId: request.input.sourceId,
          requestedQuantity: request.input.quantity,
          backpackQuantityAdded: result.backpackQuantityAdded,
          temporaryQuantityAdded: result.temporaryQuantityAdded,
          unresolvedQuantity,
        },
      );

      if (result.temporaryQuantityAdded > 0) {
        this.#info(
          request,
          `Player stored ${result.temporaryQuantityAdded} item units in temporary pickup.`,
          {
            definitionId: request.input.definitionId,
            temporaryQuantityAdded: result.temporaryQuantityAdded,
          },
        );
      }

      if (unresolvedQuantity > 0) {
        this.#warn(request, "Some received item units could not be stored.", {
          definitionId: request.input.definitionId,
          unresolvedQuantity,
          unresolvedItemInstanceIds: result.unresolvedItems.map(
            (unresolved) => unresolved.item.instanceId,
          ),
        });
      }

      return result;
    });
  }

  /**
   * 方法名：placeItem
   * 作用：按位置与空间约束移动目标对象。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  placeItem(request: PlaceInventoryItemRequest): InventoryStateResult {
    return this.#run(request, "placeItem", () => {
      const backpack = placeItemInBackpack(
        request.inventory.backpack,
        request.item,
        request.position,
        this.#definitions,
      );
      this.#info(request, `Player placed item ${request.item.instanceId} in the backpack.`, {
        itemInstanceId: request.item.instanceId,
        definitionId: request.item.definitionId,
        quantity: request.item.quantity,
        position: request.position,
      });
      return { inventory: { ...request.inventory, backpack } };
    });
  }

  /**
   * 方法名：moveItem
   * 作用：按位置与空间约束移动目标对象。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  moveItem(request: MoveInventoryItemRequest): InventoryStateResult {
    return this.#run(request, "moveItem", () => {
      const backpack = moveBackpackItem(
        request.inventory.backpack,
        request.itemInstanceId,
        request.targetPosition,
        this.#definitions,
      );
      this.#info(request, `Player moved item ${request.itemInstanceId} in the backpack.`, {
        itemInstanceId: request.itemInstanceId,
        targetPosition: request.targetPosition,
      });
      return { inventory: { ...request.inventory, backpack } };
    });
  }

  /**
   * 方法名：mergeItemStacks
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  mergeItemStacks(request: MergeInventoryItemStacksRequest): MergeInventoryItemStacksResult {
    return this.#run(request, "mergeItemStacks", () => {
      const result = mergeBackpackItemStacks(
        request.inventory.backpack,
        request.sourceItemInstanceId,
        request.targetItemInstanceId,
        this.#definitions,
      );
      this.#info(request, `Player merged ${result.transferredQuantity} item units.`, {
        sourceItemInstanceId: request.sourceItemInstanceId,
        targetItemInstanceId: request.targetItemInstanceId,
        transferredQuantity: result.transferredQuantity,
      });
      return {
        inventory: { ...request.inventory, backpack: result.backpack },
        transferredQuantity: result.transferredQuantity,
      };
    });
  }

  /**
   * 方法名：splitItemStack
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  splitItemStack(request: SplitInventoryItemStackRequest): InventoryStateResult {
    return this.#run(request, "splitItemStack", () => {
      const backpack = splitBackpackItemStack(
        request.inventory.backpack,
        request.sourceItemInstanceId,
        request.splitQuantity,
        request.newItemInstanceId,
        request.targetPosition,
        this.#definitions,
      );
      this.#info(request, `Player split ${request.splitQuantity} item units into a new stack.`, {
        sourceItemInstanceId: request.sourceItemInstanceId,
        newItemInstanceId: request.newItemInstanceId,
        splitQuantity: request.splitQuantity,
        targetPosition: request.targetPosition,
      });
      return { inventory: { ...request.inventory, backpack } };
    });
  }

  /**
   * 方法名：removeItem
   * 作用：移除目标数据，并返回更新后的状态。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  removeItem(request: RemoveInventoryItemRequest): RemoveInventoryItemResult {
    return this.#run(request, "removeItem", () => {
      this.#assertReason(request.reason);
      const result = removeBackpackItem(request.inventory.backpack, request.itemInstanceId);
      this.#info(request, `Player removed item ${result.item.instanceId} from the backpack.`, {
        itemInstanceId: result.item.instanceId,
        definitionId: result.item.definitionId,
        quantity: result.item.quantity,
        reason: request.reason,
      });
      return {
        inventory: { ...request.inventory, backpack: result.backpack },
        item: result.item,
      };
    });
  }

  /**
   * 方法名：consumeItem
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  consumeItem(request: ConsumeInventoryItemRequest): ConsumeInventoryItemResult {
    return this.#run(request, "consumeItem", () => {
      this.#assertReason(request.reason);
      const result = consumeBackpackItemQuantity(
        request.inventory.backpack,
        request.definitionId,
        request.quantity,
      );
      this.#info(
        request,
        `Player consumed ${request.quantity} units of item ${request.definitionId}.`,
        {
          definitionId: request.definitionId,
          quantity: request.quantity,
          reason: request.reason,
          remainingDefinitionQuantity: result.remainingDefinitionQuantity,
          consumedItemInstanceIds: result.consumedItemInstanceIds,
        },
      );
      return {
        inventory: { ...request.inventory, backpack: result.backpack },
        remainingDefinitionQuantity: result.remainingDefinitionQuantity,
        consumedItemInstanceIds: result.consumedItemInstanceIds,
      };
    });
  }

  /**
   * 方法名：upgradeBackpack
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  upgradeBackpack(request: InventoryRequest): InventoryStateResult {
    return this.#run(request, "upgradeBackpack", () => {
      const previousLevel = request.inventory.backpack.level;
      const backpack = upgradeBackpack(request.inventory.backpack);
      this.#info(request, `Player upgraded the backpack to level ${backpack.level}.`, {
        previousLevel,
        currentLevel: backpack.level,
      });
      return { inventory: { ...request.inventory, backpack } };
    });
  }

  /**
   * 方法名：storeTemporaryPickup
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  storeTemporaryPickup(request: StoreTemporaryPickupRequest): InventoryStateResult {
    return this.#run(request, "storeTemporaryPickup", () => {
      const pickup = request.inventory.temporaryPickup;
      const inventory = storeTemporaryPickupInBackpack(
        request.inventory,
        this.#definitions,
        request.targetPosition,
      );
      this.#info(request, `Player stored temporary item ${pickup?.item.instanceId ?? "unknown"}.`, {
        itemInstanceId: pickup?.item.instanceId ?? null,
        definitionId: pickup?.item.definitionId ?? null,
        quantity: pickup?.item.quantity ?? null,
        targetPosition: request.targetPosition ?? null,
      });
      return { inventory };
    });
  }

  /**
   * 方法名：abandonTemporaryPickup
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  abandonTemporaryPickup(request: InventoryRequest): RemoveInventoryItemResult {
    return this.#run(request, "abandonTemporaryPickup", () => {
      const result = abandonTemporaryPickup(request.inventory);
      this.#warn(
        request,
        `Player abandoned temporary item ${result.removedPickup.item.instanceId}.`,
        {
          itemInstanceId: result.removedPickup.item.instanceId,
          definitionId: result.removedPickup.item.definitionId,
          quantity: result.removedPickup.item.quantity,
          sourceId: result.removedPickup.sourceId,
        },
      );
      return { inventory: result.inventory, item: result.removedPickup.item };
    });
  }

  /**
   * 方法名：advanceTemporaryPickup
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  advanceTemporaryPickup(request: InventoryRequest): AdvanceTemporaryPickupResult {
    return this.#run(request, "advanceTemporaryPickup", () => {
      const result = advanceTemporaryPickupOwnerTurn(request.inventory);

      if (result.expiredPickup !== null) {
        this.#warn(request, `Temporary item ${result.expiredPickup.item.instanceId} expired.`, {
          itemInstanceId: result.expiredPickup.item.instanceId,
          definitionId: result.expiredPickup.item.definitionId,
          quantity: result.expiredPickup.item.quantity,
          sourceId: result.expiredPickup.sourceId,
        });
      } else if (result.inventory.temporaryPickup !== null) {
        this.#logger.debug({
          action: "Item",
          module: "InventoryService",
          message: `Temporary pickup has ${result.inventory.temporaryPickup.remainingOwnerTurns} owner turns remaining.`,
          target: this.#createTarget(request),
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            itemInstanceId: result.inventory.temporaryPickup.item.instanceId,
            remainingOwnerTurns: result.inventory.temporaryPickup.remainingOwnerTurns,
          },
        });
      }

      return result;
    });
  }

  #run<Result>(request: InventoryRequest, operation: string, execute: () => Result): Result {
    try {
      return execute();
    } catch (error) {
      this.#warn(request, `Inventory operation ${operation} failed.`, {
        operation,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw error;
    }
  }

  #info(
    request: InventoryRequest,
    message: string,
    context: Readonly<Record<string, unknown>>,
  ): void {
    this.#logger.info({
      action: "Item",
      module: "InventoryService",
      message,
      target: this.#createTarget(request),
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context,
    });
  }

  #warn(
    request: InventoryRequest,
    message: string,
    context: Readonly<Record<string, unknown>>,
  ): void {
    this.#logger.warn({
      action: "Item",
      module: "InventoryService",
      message,
      target: this.#createTarget(request),
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context,
    });
  }

  #createTarget(request: InventoryRequest): LogTarget {
    return {
      kind: "player",
      playerId: request.inventory.backpack.playerId,
      displayName: request.playerName,
    };
  }

  #assertReason(reason: string): void {
    if (reason.trim().length === 0) {
      throw new TypeError("Item operation reason cannot be empty.");
    }
  }
}
