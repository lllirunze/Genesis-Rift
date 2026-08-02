import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { EQUIPMENT_SLOTS } from "../equipment/equipment-config.ts";
import type { EquipmentLoadout, EquipmentSlot } from "../equipment/equipment-loadout.ts";
import type { EquipmentInstance } from "../equipment/equipment-instance.ts";
import {
  createBackpackView,
  type BackpackRevealGrant,
  type BackpackView,
} from "./inventory-visibility.ts";
import type { PlayerInventoryState } from "./player-inventory-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface PublicEquipmentSlotView {
  readonly slot: EquipmentSlot;
  readonly equipment: EquipmentInstance | null;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface PublicEquipmentView {
  readonly visibility: "public";
  readonly ownerPlayerId: PlayerId;
  readonly slots: readonly PublicEquipmentSlotView[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface PlayerItemView {
  readonly ownerPlayerId: PlayerId;
  readonly backpack: BackpackView;
  readonly equipment: PublicEquipmentView;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreatePlayerItemViewInput {
  readonly inventory: PlayerInventoryState;
  readonly equipmentLoadout: EquipmentLoadout;
  readonly viewerPlayerId: PlayerId;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly currentSequence: number;
  readonly revealGrants?: readonly BackpackRevealGrant[];
}

/**
 * 方法名：createPlayerItemView
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function createPlayerItemView(input: CreatePlayerItemViewInput): PlayerItemView {
  const ownerPlayerId = input.inventory.backpack.playerId;

  if (input.equipmentLoadout.playerId !== ownerPlayerId) {
    throw new Error("Inventory and equipment loadout must belong to the same player");
  }

  return Object.freeze({
    ownerPlayerId,
    backpack: createBackpackView({
      backpack: input.inventory.backpack,
      viewerPlayerId: input.viewerPlayerId,
      itemDefinitions: input.itemDefinitions,
      currentSequence: input.currentSequence,
      ...(input.revealGrants === undefined ? {} : { revealGrants: input.revealGrants }),
    }),
    equipment: createPublicEquipmentView(input.equipmentLoadout),
  });
}

/**
 * 方法名：createPublicEquipmentView
 * 作用：创建并校验该方法所负责的业务对象。
 * @param loadout 方法所需的 loadout 参数。
 * @returns 本次处理得到的结果。
 */
export function createPublicEquipmentView(loadout: EquipmentLoadout): PublicEquipmentView {
  return Object.freeze({
    visibility: "public",
    ownerPlayerId: loadout.playerId,
    slots: Object.freeze(
      EQUIPMENT_SLOTS.map((slot) => {
        const equipment = loadout.slots[slot];

        if (equipment !== null && equipment.ownerPlayerId !== loadout.playerId) {
          throw new Error(
            `Equipped item does not belong to loadout owner: ${equipment.instanceId}`,
          );
        }

        return Object.freeze({
          slot,
          equipment: equipment === null ? null : Object.freeze({ ...equipment }),
        });
      }),
    ),
  });
}
