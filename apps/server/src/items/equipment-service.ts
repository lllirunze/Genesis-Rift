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

export interface EquipItemRequest extends EquipmentRequest {
  readonly itemInstanceId: string;
  readonly slot: EquipmentSlot;
  readonly replacedEquipmentPosition?: {
    readonly x: number;
    readonly y: number;
  };
}

export interface UnequipItemRequest extends EquipmentRequest {
  readonly slot: EquipmentSlot;
  readonly targetPosition: {
    readonly x: number;
    readonly y: number;
  };
}

export interface EquipmentServiceStateResult {
  readonly state: EquipmentInventoryState;
}

export interface EquipItemResult extends EquipmentServiceStateResult {
  readonly replacedItemInstanceId: string | null;
}

export interface UnequipItemResult extends EquipmentServiceStateResult {
  readonly unequippedItemInstanceId: string;
}

export class EquipmentService {
  readonly #itemDefinitions: ItemDefinitionCatalog;
  readonly #equipmentDefinitions: EquipmentDefinitionCatalog;
  readonly #logger: Logger;

  constructor(
    itemDefinitions: ItemDefinitionCatalog,
    equipmentDefinitions: EquipmentDefinitionCatalog,
    logger: Logger,
  ) {
    this.#itemDefinitions = itemDefinitions;
    this.#equipmentDefinitions = equipmentDefinitions;
    this.#logger = logger;
  }

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
