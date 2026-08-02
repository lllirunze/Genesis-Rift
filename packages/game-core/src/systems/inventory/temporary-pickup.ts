import {
  findFirstAvailableBackpackPosition,
  getItemDefinition,
  isBackpackPositionAvailable,
} from "./backpack-geometry.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { fillCompatibleBackpackStacks } from "./backpack-stack-receipt.ts";
import type { BackpackPosition } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS } from "./inventory-config.ts";
import type { PlayerInventoryState, TemporaryPickup } from "./player-inventory-state.ts";

/** 描述业务操作完成后返回的结果。 */
export interface RemoveTemporaryPickupResult {
  readonly inventory: PlayerInventoryState;
  readonly removedPickup: TemporaryPickup;
}

/** 描述业务操作完成后返回的结果。 */
export interface AdvanceTemporaryPickupResult {
  readonly inventory: PlayerInventoryState;
  readonly expiredPickup: TemporaryPickup | null;
}

/**
 * 方法名：storeTemporaryPickupInBackpack
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @param targetPosition 方法所需的 targetPosition 参数。
 * @returns 本次处理得到的结果。
 */
export function storeTemporaryPickupInBackpack(
  inventory: PlayerInventoryState,
  definitions: ItemDefinitionCatalog,
  targetPosition?: BackpackPosition,
): PlayerInventoryState {
  const pickup = requireTemporaryPickup(inventory);
  const definition = getItemDefinition(definitions, pickup.item.definitionId);
  const filled = fillCompatibleBackpackStacks(
    inventory.backpack,
    pickup.item,
    pickup.item.quantity,
    definition.maximumStack,
  );

  if (filled.remainingQuantity === 0) {
    return {
      ...inventory,
      backpack: filled.backpack,
      temporaryPickup: null,
    };
  }

  const remainingItem = {
    ...pickup.item,
    quantity: filled.remainingQuantity,
  };
  const position =
    targetPosition ?? findFirstAvailableBackpackPosition(filled.backpack, definition, definitions);

  if (
    position === null ||
    !isBackpackPositionAvailable(filled.backpack, definition, position, definitions)
  ) {
    throw new Error(`Temporary item cannot be placed in the backpack: ${pickup.item.instanceId}`);
  }

  return {
    ...inventory,
    backpack: placeItemInBackpack(filled.backpack, remainingItem, position, definitions),
    temporaryPickup: null,
  };
}

/**
 * 方法名：abandonTemporaryPickup
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @returns 本次处理得到的结果。
 */
export function abandonTemporaryPickup(
  inventory: PlayerInventoryState,
): RemoveTemporaryPickupResult {
  const removedPickup = requireTemporaryPickup(inventory);

  return {
    inventory: {
      ...inventory,
      temporaryPickup: null,
    },
    removedPickup,
  };
}

/**
 * 方法名：advanceTemporaryPickupOwnerTurn
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @returns 本次处理得到的结果。
 */
export function advanceTemporaryPickupOwnerTurn(
  inventory: PlayerInventoryState,
): AdvanceTemporaryPickupResult {
  const pickup = inventory.temporaryPickup;

  if (pickup === null) {
    return { inventory, expiredPickup: null };
  }

  assertRemainingOwnerTurns(pickup.remainingOwnerTurns);

  if (pickup.remainingOwnerTurns === 1) {
    return {
      inventory: {
        ...inventory,
        temporaryPickup: null,
      },
      expiredPickup: pickup,
    };
  }

  return {
    inventory: {
      ...inventory,
      temporaryPickup: {
        ...pickup,
        remainingOwnerTurns: pickup.remainingOwnerTurns - 1,
      },
    },
    expiredPickup: null,
  };
}

/**
 * 方法名：requireTemporaryPickup
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @returns 本次处理得到的结果。
 */
function requireTemporaryPickup(inventory: PlayerInventoryState): TemporaryPickup {
  if (inventory.temporaryPickup === null) {
    throw new Error("Temporary pickup is empty");
  }

  return inventory.temporaryPickup;
}

/**
 * 方法名：assertRemainingOwnerTurns
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertRemainingOwnerTurns(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS
  ) {
    throw new RangeError(
      `remainingOwnerTurns must be between 1 and ${TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS}`,
    );
  }
}
