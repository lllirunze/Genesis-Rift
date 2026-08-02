import {
  equipItemFromBackpack,
  unequipItemToBackpack,
  type EquipmentDefinitionCatalog,
  type EquipmentInventoryState,
  type EquipmentSlot,
} from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";
import type { ItemServiceContext } from "./item-service-context.ts";

interface EquipmentRequest extends ItemServiceContext {
  readonly state: EquipmentInventoryState;
}

/** 描述一次业务请求所需的输入数据。 */
export interface EquipItemRequest extends EquipmentRequest {
  readonly itemInstanceId: string;
  readonly slot: EquipmentSlot;
  readonly replacedEquipmentPosition?: {
    readonly x: number;
    readonly y: number;
  };
}

/** 描述一次业务请求所需的输入数据。 */
export interface UnequipItemRequest extends EquipmentRequest {
  readonly slot: EquipmentSlot;
  readonly targetPosition: {
    readonly x: number;
    readonly y: number;
  };
}

/** 描述业务操作完成后返回的结果。 */
export interface EquipmentServiceStateResult {
  readonly state: EquipmentInventoryState;
}

/** 描述业务操作完成后返回的结果。 */
export interface EquipItemResult extends EquipmentServiceStateResult {
  readonly replacedItemInstanceId: string | null;
}

/** 描述业务操作完成后返回的结果。 */
export interface UnequipItemResult extends EquipmentServiceStateResult {
  readonly unequippedItemInstanceId: string;
}

/** 封装该模块的状态与操作入口。 */
export class EquipmentService {
  readonly #itemDefinitions: ItemDefinitionCatalog;
  readonly #equipmentDefinitions: EquipmentDefinitionCatalog;
  readonly #logger: Logger;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param itemDefinitions 方法所需的 itemDefinitions 参数。
   * @param equipmentDefinitions 方法所需的 equipmentDefinitions 参数。
   * @param logger 方法所需的 logger 参数。
   * @returns 无返回值。
   */
  constructor(
    itemDefinitions: ItemDefinitionCatalog,
    equipmentDefinitions: EquipmentDefinitionCatalog,
    logger: Logger,
  ) {
    this.#itemDefinitions = itemDefinitions;
    this.#equipmentDefinitions = equipmentDefinitions;
    this.#logger = logger;
  }

  /**
   * 方法名：equipItem
   * 作用：将目标装备放入兼容栏位并更新角色状态。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  equipItem(request: EquipItemRequest): EquipItemResult {
    const target = this.#createTarget(request);
    const previousEquipment = request.state.loadout.slots[request.slot];

    try {
      const state = equipItemFromBackpack(
        request.state,
        {
          itemInstanceId: request.itemInstanceId,
          slot: request.slot,
          ...(request.replacedEquipmentPosition === undefined
            ? {}
            : { replacedEquipmentPosition: request.replacedEquipmentPosition }),
        },
        this.#itemDefinitions,
        this.#equipmentDefinitions,
      );
      const equipment = state.loadout.slots[request.slot];

      this.#logger.info({
        action: "Equip",
        module: "EquipmentService",
        message: `Player equipped item ${request.itemInstanceId} in slot ${request.slot}.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          itemInstanceId: request.itemInstanceId,
          definitionId: equipment?.definitionId ?? null,
          slot: request.slot,
          replacedItemInstanceId: previousEquipment?.instanceId ?? null,
          replacedEquipmentPosition: request.replacedEquipmentPosition ?? null,
        },
      });

      return {
        state,
        replacedItemInstanceId: previousEquipment?.instanceId ?? null,
      };
    } catch (error) {
      this.#logFailure(request, target, "Equipment operation equipItem failed.", error, {
        itemInstanceId: request.itemInstanceId,
        slot: request.slot,
        replacedItemInstanceId: previousEquipment?.instanceId ?? null,
        replacedEquipmentPosition: request.replacedEquipmentPosition ?? null,
      });
      throw error;
    }
  }

  /**
   * 方法名：unequipItem
   * 作用：卸下目标装备并更新角色状态。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  unequipItem(request: UnequipItemRequest): UnequipItemResult {
    const target = this.#createTarget(request);
    const previousEquipment = request.state.loadout.slots[request.slot];

    try {
      const state = unequipItemToBackpack(
        request.state,
        { slot: request.slot, targetPosition: request.targetPosition },
        this.#itemDefinitions,
        this.#equipmentDefinitions,
      );

      this.#logger.info({
        action: "Equip",
        module: "EquipmentService",
        message: `Player unequipped item ${previousEquipment?.instanceId ?? "unknown"} from slot ${request.slot}.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          itemInstanceId: previousEquipment?.instanceId ?? null,
          definitionId: previousEquipment?.definitionId ?? null,
          slot: request.slot,
          targetPosition: request.targetPosition,
        },
      });

      return {
        state,
        unequippedItemInstanceId: previousEquipment!.instanceId,
      };
    } catch (error) {
      this.#logFailure(request, target, "Equipment operation unequipItem failed.", error, {
        itemInstanceId: previousEquipment?.instanceId ?? null,
        slot: request.slot,
        targetPosition: request.targetPosition,
      });
      throw error;
    }
  }

  #logFailure(
    request: EquipmentRequest,
    target: LogTarget,
    message: string,
    error: unknown,
    context: Readonly<Record<string, unknown>>,
  ): void {
    this.#logger.warn({
      action: "Equip",
      module: "EquipmentService",
      message,
      target,
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context: {
        ...context,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });
  }

  #createTarget(request: EquipmentRequest): LogTarget {
    return {
      kind: "player",
      playerId: request.state.inventory.backpack.playerId,
      displayName: request.playerName,
    };
  }
}
