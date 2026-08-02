import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import {
  createCharacterStatusState,
  type StatusDefinitionCatalog,
} from "../battle/status/index.ts";
import type { CharacterResourceState } from "../character/index.ts";
import type { ConsumableUsageCatalog } from "./consumable-definition.ts";
import { createCoreConsumableEffectHandlerRegistry } from "./consumable-effect-handlers.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { createItemInstance } from "./item-instance.ts";
import { createPlayerInventory } from "./player-inventory-state.ts";
import { useConsumableItem } from "./use-consumable-item.ts";

const PLAYER_ID = "player-1" as PlayerId;
const HEALING_POTION_ID = "item.consumable.healing-potion";
const TONIC_ID = "item.consumable.wind-tonic";
const ANTIDOTE_ID = "item.consumable.antidote";
const POISON_STATUS_ID = "status.poisoned";
const WIND_STATUS_ID = "status.wind-blessing";

const ITEM_DEFINITIONS = {
  [HEALING_POTION_ID]: createConsumableDefinition(HEALING_POTION_ID, "Healing Potion"),
  [TONIC_ID]: createConsumableDefinition(TONIC_ID, "Wind Tonic"),
  [ANTIDOTE_ID]: createConsumableDefinition(ANTIDOTE_ID, "Antidote"),
} as const satisfies ItemDefinitionCatalog;

const STATUS_DEFINITIONS = {
  [POISON_STATUS_ID]: createStatusDefinition(POISON_STATUS_ID, "Poisoned", "debuff"),
  [WIND_STATUS_ID]: createStatusDefinition(WIND_STATUS_ID, "Wind Blessing", "buff"),
} as const satisfies StatusDefinitionCatalog;

const USAGE_CATALOG = {
  [HEALING_POTION_ID]: {
    itemDefinitionId: HEALING_POTION_ID,
    effects: [{ effectId: "resource.restore", parameters: { resourceId: "health", amount: 25 } }],
  },
  [TONIC_ID]: {
    itemDefinitionId: TONIC_ID,
    effects: [{ effectId: "status.add", parameters: { statusDefinitionId: WIND_STATUS_ID } }],
  },
  [ANTIDOTE_ID]: {
    itemDefinitionId: ANTIDOTE_ID,
    effects: [{ effectId: "status.remove", parameters: { statusDefinitionId: POISON_STATUS_ID } }],
  },
} as const satisfies ConsumableUsageCatalog;

describe("useConsumableItem", () => {
  it("restores a resource and consumes exactly one item after the effect succeeds", () => {
    const inventory = createInventoryWithItem(HEALING_POTION_ID, 2);
    const resourceState = createResourceState(40);
    const result = useConsumableItem(
      inventory,
      resourceState,
      createCharacterStatusState(PLAYER_ID),
      ITEM_DEFINITIONS,
      USAGE_CATALOG,
      createCoreConsumableEffectHandlerRegistry(STATUS_DEFINITIONS),
      createUseInput(HEALING_POTION_ID),
    );

    expect(result.outcome).toBe("used");
    expect(result.resourceState.resources.health?.current).toBe(65);
    expect(result.remainingItemQuantity).toBe(1);
    expect(result.inventory.backpack.entries[0]?.item.quantity).toBe(1);
    expect(inventory.backpack.entries[0]?.item.quantity).toBe(2);
  });

  it("does not consume an item when every configured effect is skipped", () => {
    const inventory = createInventoryWithItem(HEALING_POTION_ID, 2);
    const result = useConsumableItem(
      inventory,
      createResourceState(100),
      createCharacterStatusState(PLAYER_ID),
      ITEM_DEFINITIONS,
      USAGE_CATALOG,
      createCoreConsumableEffectHandlerRegistry(STATUS_DEFINITIONS),
      createUseInput(HEALING_POTION_ID),
    );

    expect(result.outcome).toBe("no_effect");
    expect(result.inventory).toBe(inventory);
    expect(result.remainingItemQuantity).toBe(2);
    expect(result.consumedItemInstanceIds).toEqual([]);
  });

  it("adds and removes statuses through the same extensible effect registry", () => {
    const registry = createCoreConsumableEffectHandlerRegistry(STATUS_DEFINITIONS);
    const baseResources = createResourceState(100);
    const tonicResult = useConsumableItem(
      createInventoryWithItem(TONIC_ID, 1),
      baseResources,
      createCharacterStatusState(PLAYER_ID),
      ITEM_DEFINITIONS,
      USAGE_CATALOG,
      registry,
      createUseInput(TONIC_ID),
    );
    const poisonedState = {
      ...tonicResult.statusState,
      instances: [
        ...tonicResult.statusState.instances,
        {
          instanceId: "status-instance.poison",
          definitionId: POISON_STATUS_ID,
          sourceId: "event.poison-cloud",
          targetId: PLAYER_ID,
          currentStacks: 1,
          remainingTurns: 3,
          createdAtSequence: 1,
        },
      ],
    };
    const antidoteResult = useConsumableItem(
      createInventoryWithItem(ANTIDOTE_ID, 1),
      baseResources,
      poisonedState,
      ITEM_DEFINITIONS,
      USAGE_CATALOG,
      registry,
      createUseInput(ANTIDOTE_ID),
    );

    expect(tonicResult.statusState.instances[0]).toMatchObject({
      definitionId: WIND_STATUS_ID,
      currentStacks: 1,
    });
    expect(antidoteResult.statusState.instances.map((instance) => instance.definitionId)).toEqual([
      WIND_STATUS_ID,
    ]);
  });

  it("leaves every input state unchanged when a later effect fails", () => {
    const inventory = createInventoryWithItem(HEALING_POTION_ID, 1);
    const resourceState = createResourceState(40);
    const invalidCatalog = {
      [HEALING_POTION_ID]: {
        itemDefinitionId: HEALING_POTION_ID,
        effects: [
          { effectId: "resource.restore", parameters: { resourceId: "health", amount: 25 } },
          {
            effectId: "status.add",
            parameters: { statusDefinitionId: "status.missing" },
          },
        ],
      },
    } as const satisfies ConsumableUsageCatalog;

    expect(() =>
      useConsumableItem(
        inventory,
        resourceState,
        createCharacterStatusState(PLAYER_ID),
        ITEM_DEFINITIONS,
        invalidCatalog,
        createCoreConsumableEffectHandlerRegistry(STATUS_DEFINITIONS),
        createUseInput(HEALING_POTION_ID),
      ),
    ).toThrow("Missing status definition");
    expect(resourceState.resources.health?.current).toBe(40);
    expect(inventory.backpack.entries[0]?.item.quantity).toBe(1);
  });
});

/**
 * 方法名：createInventoryWithItem
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitionId 目标配置定义标识。
 * @param quantity 方法所需的 quantity 参数。
 * @returns 本次处理得到的结果。
 */
function createInventoryWithItem(definitionId: keyof typeof ITEM_DEFINITIONS, quantity: number) {
  const definition = ITEM_DEFINITIONS[definitionId]!;
  const inventory = createPlayerInventory(PLAYER_ID);
  const item = createItemInstance(
    {
      instanceId: `instance.${definitionId}`,
      definitionId,
      ownerPlayerId: PLAYER_ID,
      quantity,
    },
    definition,
  );

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, item, { x: 0, y: 0 }, ITEM_DEFINITIONS),
  };
}

/**
 * 方法名：createResourceState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param currentHealth 方法所需的 currentHealth 参数。
 * @returns 本次处理得到的结果。
 */
function createResourceState(currentHealth: number): CharacterResourceState<string> {
  return {
    playerId: PLAYER_ID,
    resources: {
      health: { current: currentHealth, minimum: 0, maximum: 100 },
    },
  };
}

/**
 * 方法名：createUseInput
 * 作用：创建并校验该方法所负责的业务对象。
 * @param itemDefinitionId 方法所需的 itemDefinitionId 参数。
 * @returns 本次处理得到的结果。
 */
function createUseInput(itemDefinitionId: string) {
  return {
    playerId: PLAYER_ID,
    itemDefinitionId,
    createdAtSequence: 2,
    createStatusInstanceId: (effectIndex: number) => `status-instance.${effectIndex}`,
  };
}

/**
 * 方法名：createConsumableDefinition
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitionId 目标配置定义标识。
 * @param name 方法所需的 name 参数。
 * @returns 本次处理得到的结果。
 */
function createConsumableDefinition(definitionId: string, name: string) {
  return {
    definitionId,
    name,
    category: "consumable",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 3,
  } as const;
}

/**
 * 方法名：createStatusDefinition
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitionId 目标配置定义标识。
 * @param name 方法所需的 name 参数。
 * @param kind 方法所需的 kind 参数。
 * @returns 本次处理得到的结果。
 */
function createStatusDefinition(definitionId: string, name: string, kind: "buff" | "debuff") {
  return {
    definitionId,
    name,
    description: `${name} status.`,
    kind,
    tags: [],
    duration: { turns: 3 },
    maxStacks: 1,
    removal: { dispellable: true, removeOnDeath: true },
    effects: [],
  } as const;
}
