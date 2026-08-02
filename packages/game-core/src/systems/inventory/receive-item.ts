import { findFirstAvailableBackpackPosition, getItemDefinition } from "./backpack-geometry.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { fillCompatibleBackpackStacks } from "./backpack-stack-receipt.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance, type ItemInstance, validateItemInstance } from "./item-instance.ts";
import { TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS } from "./inventory-config.ts";
import type { PlayerInventoryState } from "./player-inventory-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface ReceiveItemInput {
  readonly definitionId: string;
  readonly quantity: number;
  readonly sourceId: string;
  readonly newItemInstanceIds: readonly string[];
  readonly stackCompatibilityKey?: string;
  readonly allowTemporaryStorage?: boolean;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface UnresolvedReceivedItem {
  readonly item: ItemInstance;
  readonly sourceId: string;
}

/** 描述业务操作完成后返回的结果。 */
export interface ReceiveItemResult {
  readonly inventory: PlayerInventoryState;
  readonly backpackQuantityAdded: number;
  readonly temporaryQuantityAdded: number;
  readonly unresolvedItems: readonly UnresolvedReceivedItem[];
}

/**
 * 方法名：receiveItem
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param input 本次处理的输入数据。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function receiveItem(
  inventory: PlayerInventoryState,
  input: ReceiveItemInput,
  definitions: ItemDefinitionCatalog,
): ReceiveItemResult {
  assertPositiveSafeInteger(input.quantity, "quantity");
  assertNonEmptyString(input.sourceId, "sourceId");

  const definition = getItemDefinition(definitions, input.definitionId);
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";
  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");

  const incomingIdentity = {
    definitionId: definition.definitionId,
    ownerPlayerId: inventory.backpack.playerId,
    stackCompatibilityKey,
  };
  const availableExistingCapacity = inventory.backpack.entries.reduce(
    (capacity, entry) =>
      entry.item.definitionId === incomingIdentity.definitionId &&
      entry.item.ownerPlayerId === incomingIdentity.ownerPlayerId &&
      entry.item.stackCompatibilityKey === incomingIdentity.stackCompatibilityKey
        ? capacity + Math.max(0, definition.maximumStack - entry.item.quantity)
        : capacity,
    0,
  );
  const newQuantity = Math.max(0, input.quantity - availableExistingCapacity);
  const requiredInstanceCount = Math.ceil(newQuantity / definition.maximumStack);
  const instanceIds = input.newItemInstanceIds.slice(0, requiredInstanceCount);

  if (instanceIds.length < requiredInstanceCount) {
    throw new RangeError(
      `receiveItem requires ${requiredInstanceCount} new item instance ids, received ${instanceIds.length}`,
    );
  }

  validateNewInstanceIds(inventory, instanceIds);

  const newItems = createNormalizedItems(incomingIdentity, newQuantity, instanceIds, definition);
  const filled = fillCompatibleBackpackStacks(
    inventory.backpack,
    incomingIdentity,
    input.quantity,
    definition.maximumStack,
  );
  let currentInventory: PlayerInventoryState = {
    ...inventory,
    backpack: filled.backpack,
  };
  let backpackQuantityAdded = filled.addedQuantity;
  let temporaryQuantityAdded = 0;
  const unresolvedItems: UnresolvedReceivedItem[] = [];

  for (const item of newItems) {
    const position = findFirstAvailableBackpackPosition(
      currentInventory.backpack,
      definition,
      definitions,
    );

    if (position !== null) {
      currentInventory = {
        ...currentInventory,
        backpack: placeItemInBackpack(currentInventory.backpack, item, position, definitions),
      };
      backpackQuantityAdded += item.quantity;
      continue;
    }

    if ((input.allowTemporaryStorage ?? true) && currentInventory.temporaryPickup === null) {
      currentInventory = enterTemporaryPickupFromAcquisition(
        currentInventory,
        item,
        input.sourceId,
        definitions,
      );
      temporaryQuantityAdded += item.quantity;
      continue;
    }

    unresolvedItems.push({ item, sourceId: input.sourceId });
  }

  return {
    inventory: currentInventory,
    backpackQuantityAdded,
    temporaryQuantityAdded,
    unresolvedItems,
  };
}

// 该入口有意保持私有，只有物品获取流程可以向临时拾取区写入内容。
/**
 * 方法名：enterTemporaryPickupFromAcquisition
 * 作用：执行该方法负责的单一业务操作。
 * @param inventory 方法所需的 inventory 参数。
 * @param item 方法所需的 item 参数。
 * @param sourceId 方法所需的 sourceId 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
function enterTemporaryPickupFromAcquisition(
  inventory: PlayerInventoryState,
  item: ItemInstance,
  sourceId: string,
  definitions: ItemDefinitionCatalog,
): PlayerInventoryState {
  if (inventory.temporaryPickup !== null) {
    throw new Error("Temporary pickup is already occupied");
  }

  if (item.ownerPlayerId !== inventory.backpack.playerId) {
    throw new Error(`Item ${item.instanceId} is owned by another player`);
  }

  if (inventory.backpack.entries.some((entry) => entry.item.instanceId === item.instanceId)) {
    throw new Error(`Item is already stored in the backpack: ${item.instanceId}`);
  }

  validateItemInstance(item, getItemDefinition(definitions, item.definitionId));

  return {
    ...inventory,
    temporaryPickup: {
      item,
      sourceId,
      remainingOwnerTurns: TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS,
    },
  };
}

/**
 * 方法名：createNormalizedItems
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createNormalizedItems(
  incoming: {
    readonly definitionId: string;
    readonly ownerPlayerId: ItemInstance["ownerPlayerId"];
    readonly stackCompatibilityKey: string;
  },
  quantity: number,
  instanceIds: readonly string[],
  definition: Parameters<typeof createItemInstance>[1],
): readonly ItemInstance[] {
  const items: ItemInstance[] = [];
  let remainingQuantity = quantity;

  for (const instanceId of instanceIds) {
    const itemQuantity = Math.min(remainingQuantity, definition.maximumStack);

    items.push(
      createItemInstance(
        {
          instanceId,
          definitionId: incoming.definitionId,
          ownerPlayerId: incoming.ownerPlayerId,
          quantity: itemQuantity,
          stackCompatibilityKey: incoming.stackCompatibilityKey,
        },
        definition,
      ),
    );
    remainingQuantity -= itemQuantity;
  }

  return items;
}

/**
 * 方法名：validateNewInstanceIds
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param inventory 方法所需的 inventory 参数。
 * @param instanceIds 方法所需的 instanceIds 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateNewInstanceIds(
  inventory: PlayerInventoryState,
  instanceIds: readonly string[],
): void {
  const existingIds = new Set(inventory.backpack.entries.map((entry) => entry.item.instanceId));

  if (inventory.temporaryPickup !== null) {
    existingIds.add(inventory.temporaryPickup.item.instanceId);
  }

  for (const instanceId of instanceIds) {
    assertNonEmptyString(instanceId, "newItemInstanceIds");

    if (existingIds.has(instanceId)) {
      throw new Error(`Duplicate inventory item instance: ${instanceId}`);
    }

    existingIds.add(instanceId);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
