import { describe, expect, it } from "vitest";

import {
  createEmptyEquipmentLoadout,
  createEquipmentInstance,
  createItemInstance,
  createPlayerInventory,
  equipEquipment,
  getBackpackEntry,
  placeItemInBackpack,
  type EquipmentDefinitionCatalog,
  type EquipmentInventoryState,
} from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { EquipmentService } from "./equipment-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

const ITEM_DEFINITIONS = {
  "item.sword": {
    definitionId: "item.sword",
    name: "Training Sword",
    category: "equipment",
    quality: "common",
    width: 2,
    height: 4,
    maximumStack: 1,
  },
  "item.axe": {
    definitionId: "item.axe",
    name: "Battle Axe",
    category: "equipment",
    quality: "excellent",
    width: 2,
    height: 3,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

const EQUIPMENT_DEFINITIONS = {
  "item.sword": {
    definitionId: "item.sword",
    name: "Training Sword",
    type: "weapon",
    quality: "common",
    corePosition: "A basic physical weapon.",
    allowDuplicateEquipping: false,
    attributeEffects: [],
  },
  "item.axe": {
    definitionId: "item.axe",
    name: "Battle Axe",
    type: "weapon",
    quality: "excellent",
    corePosition: "A heavy physical weapon.",
    allowDuplicateEquipping: false,
    attributeEffects: [],
  },
} as const satisfies EquipmentDefinitionCatalog;

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  /**
   * 方法名：write
   * 作用：按指定等级和格式记录日志。
   * @param line 方法所需的 line 参数。
   * @returns 本次处理得到的结果。
   */
  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  async close(): Promise<void> {}
}

/**
 * 方法名：createFixture
 * 作用：创建并校验该方法所负责的业务对象。
 * @param state 当前业务状态。
 * @returns 本次处理得到的结果。
 */
function createFixture(state = createStateWithBackpackItem("item.sword", "sword-1")) {
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return {
    state,
    logger,
    service: new EquipmentService(ITEM_DEFINITIONS, EQUIPMENT_DEFINITIONS, logger),
    writer,
  };
}

describe("EquipmentService", () => {
  it("equips and unequips an item while recording both confirmed operations", async () => {
    const { state, logger, service, writer } = createFixture();

    const equipped = service.equipItem({
      state,
      playerName: "Runze",
      itemInstanceId: "sword-1",
      slot: "weapon",
    }).state;
    const unequipResult = service.unequipItem({
      state: equipped,
      playerName: "Runze",
      slot: "weapon",
      targetPosition: { x: 2, y: 1 },
    });
    const unequipped = unequipResult.state;
    await logger.flush();

    expect(state.loadout.slots.weapon).toBeNull();
    expect(equipped.loadout.slots.weapon?.instanceId).toBe("sword-1");
    expect(equipped.inventory.backpack.entries).toEqual([]);
    expect(unequipped.loadout.slots.weapon).toBeNull();
    expect(unequipResult.unequippedItemInstanceId).toBe("sword-1");
    expect(getBackpackEntry(unequipped.inventory.backpack, "sword-1").position).toEqual({
      x: 2,
      y: 1,
    });
    expect(writer.lines[0]).toContain("Player equipped item sword-1 in slot weapon.");
    expect(writer.lines[1]).toContain("Player unequipped item sword-1 from slot weapon.");
  });

  it("atomically replaces equipment and reports the replaced instance", async () => {
    const oldEquipment = createEquipmentInstance({
      instanceId: "sword-1",
      definitionId: "item.sword",
      ownerPlayerId: PLAYER_ID,
    });
    const state = createStateWithBackpackItem("item.axe", "axe-1");
    const equippedState = {
      ...state,
      loadout: equipEquipment(
        state.loadout,
        "weapon",
        oldEquipment,
        EQUIPMENT_DEFINITIONS["item.sword"],
      ).loadout,
    };
    const { logger, service, writer } = createFixture(equippedState);

    const result = service.equipItem({
      state: equippedState,
      playerName: "Runze",
      itemInstanceId: "axe-1",
      slot: "weapon",
      replacedEquipmentPosition: { x: 0, y: 0 },
    });
    await logger.flush();

    expect(result.replacedItemInstanceId).toBe("sword-1");
    expect(result.state.loadout.slots.weapon?.instanceId).toBe("axe-1");
    expect(getBackpackEntry(result.state.inventory.backpack, "sword-1").position).toEqual({
      x: 0,
      y: 0,
    });
    expect(equippedState.loadout.slots.weapon?.instanceId).toBe("sword-1");
    expect(writer.lines).toHaveLength(1);
  });

  it("records failed operations without changing inventory or loadout", async () => {
    const { state, logger, service, writer } = createFixture();

    expect(() =>
      service.equipItem({
        state,
        playerName: "Runze",
        itemInstanceId: "sword-1",
        slot: "armor",
      }),
    ).toThrow("cannot be equipped");
    expect(() =>
      service.unequipItem({
        state,
        playerName: "Runze",
        slot: "weapon",
        targetPosition: { x: 0, y: 0 },
      }),
    ).toThrow("Equipment slot is empty");
    await logger.flush();

    expect(state.loadout.slots.weapon).toBeNull();
    expect(getBackpackEntry(state.inventory.backpack, "sword-1").position).toEqual({ x: 0, y: 0 });
    expect(writer.lines).toHaveLength(2);
    expect(writer.lines.every((line) => line.includes("[WARN ]"))).toBe(true);
  });
});

/**
 * 方法名：createStateWithBackpackItem
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitionId 目标配置定义标识。
 * @param instanceId 方法所需的 instanceId 参数。
 * @returns 本次处理得到的结果。
 */
function createStateWithBackpackItem(
  definitionId: keyof typeof ITEM_DEFINITIONS,
  instanceId: string,
): EquipmentInventoryState {
  const inventory = createPlayerInventory(PLAYER_ID);
  const item = createItemInstance(
    {
      instanceId,
      definitionId,
      ownerPlayerId: PLAYER_ID,
    },
    ITEM_DEFINITIONS[definitionId],
  );

  return {
    inventory: {
      ...inventory,
      backpack: placeItemInBackpack(inventory.backpack, item, { x: 0, y: 0 }, ITEM_DEFINITIONS),
    },
    loadout: createEmptyEquipmentLoadout(PLAYER_ID),
  };
}
