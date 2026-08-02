import { describe, expect, it } from "vitest";

import {
  createItemInstance,
  createPlayerInventory,
  getBackpackEntry,
  placeItemInBackpack,
  type PlayerInventoryState,
} from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { InventoryService } from "./inventory-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

const DEFINITIONS = {
  "item.coin": {
    definitionId: "item.coin",
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  "item.blocker": {
    definitionId: "item.blocker",
    name: "Large Blocker",
    category: "special",
    quality: "common",
    width: 4,
    height: 6,
    maximumStack: 1,
  },
} as const satisfies ItemDefinitionCatalog;

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
 * @param inventory 方法所需的 inventory 参数。
 * @returns 本次处理得到的结果。
 */
function createFixture(inventory = createPlayerInventory(PLAYER_ID)) {
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return {
    inventory,
    logger,
    service: new InventoryService(DEFINITIONS, logger),
    writer,
  };
}

describe("InventoryService", () => {
  it("receives items, stacks them, and records temporary and unresolved quantities", async () => {
    const fullInventory = createFullInventory();
    const { logger, service, writer } = createFixture(fullInventory);

    const result = service.receiveItem({
      inventory: fullInventory,
      playerName: "Runze",
      input: {
        definitionId: "item.coin",
        quantity: 7,
        sourceId: "battle.loot",
        newItemInstanceIds: ["coin-1", "coin-2"],
      },
    });
    await logger.flush();

    expect(result.backpackQuantityAdded).toBe(0);
    expect(result.temporaryQuantityAdded).toBe(5);
    expect(result.unresolvedItems[0]?.item.quantity).toBe(2);
    expect(fullInventory.temporaryPickup).toBeNull();
    expect(writer.lines).toHaveLength(3);
    expect(writer.lines[0]).toContain("Player received 7 units of item item.coin.");
    expect(writer.lines[1]).toContain("temporary pickup");
    expect(writer.lines[2]).toContain("could not be stored");
  });

  it("moves, splits, merges, consumes, removes, and upgrades without mutating prior states", async () => {
    const coin = createItemInstance(
      {
        instanceId: "coin-1",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
        quantity: 5,
      },
      DEFINITIONS["item.coin"],
    );
    const initial = createPlayerInventory(PLAYER_ID);
    const inventory = {
      ...initial,
      backpack: placeItemInBackpack(initial.backpack, coin, { x: 0, y: 0 }, DEFINITIONS),
    };
    const { logger, service } = createFixture(inventory);

    const split = service.splitItemStack({
      inventory,
      playerName: "Runze",
      sourceItemInstanceId: "coin-1",
      splitQuantity: 2,
      newItemInstanceId: "coin-2",
      targetPosition: { x: 1, y: 0 },
    }).inventory;
    const moved = service.moveItem({
      inventory: split,
      playerName: "Runze",
      itemInstanceId: "coin-2",
      targetPosition: { x: 2, y: 0 },
    }).inventory;
    const merged = service.mergeItemStacks({
      inventory: moved,
      playerName: "Runze",
      sourceItemInstanceId: "coin-2",
      targetItemInstanceId: "coin-1",
    }).inventory;
    const consumed = service.consumeItem({
      inventory: merged,
      playerName: "Runze",
      definitionId: "item.coin",
      quantity: 2,
      reason: "shop.purchase",
    }).inventory;
    const removed = service.removeItem({
      inventory: consumed,
      playerName: "Runze",
      itemInstanceId: "coin-1",
      reason: "player.discard",
    });
    const upgraded = service.upgradeBackpack({
      inventory: removed.inventory,
      playerName: "Runze",
    }).inventory;
    await logger.flush();

    expect(getBackpackEntry(inventory.backpack, "coin-1").item.quantity).toBe(5);
    expect(split.backpack.entries).toHaveLength(2);
    expect(
      moved.backpack.entries.find((entry) => entry.item.instanceId === "coin-2")?.position,
    ).toEqual({ x: 2, y: 0 });
    expect(merged.backpack.entries).toHaveLength(1);
    expect(getBackpackEntry(consumed.backpack, "coin-1").item.quantity).toBe(3);
    expect(removed.item.quantity).toBe(3);
    expect(upgraded.backpack.level).toBe(2);
  });

  it("advances and expires a temporary pickup after three owner turns", async () => {
    const fullInventory = createFullInventory();
    const fixture = createFixture(fullInventory);
    let inventory = fixture.service.receiveItem({
      inventory: fullInventory,
      playerName: "Runze",
      input: {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "event.reward",
        newItemInstanceIds: ["coin-temp"],
      },
    }).inventory;

    inventory = fixture.service.advanceTemporaryPickup({
      inventory,
      playerName: "Runze",
    }).inventory;
    inventory = fixture.service.advanceTemporaryPickup({
      inventory,
      playerName: "Runze",
    }).inventory;
    const expired = fixture.service.advanceTemporaryPickup({ inventory, playerName: "Runze" });
    await fixture.logger.flush();

    expect(expired.expiredPickup?.item.instanceId).toBe("coin-temp");
    expect(expired.inventory.temporaryPickup).toBeNull();
    expect(
      fixture.writer.lines.some((line) => line.includes("Temporary item coin-temp expired.")),
    ).toBe(true);
  });

  it("places new items and moves temporary pickups into newly unlocked space", async () => {
    const { logger, service } = createFixture();
    const coin = createItemInstance(
      {
        instanceId: "coin-direct",
        definitionId: "item.coin",
        ownerPlayerId: PLAYER_ID,
      },
      DEFINITIONS["item.coin"],
    );
    const placed = service.placeItem({
      inventory: createPlayerInventory(PLAYER_ID),
      playerName: "Runze",
      item: coin,
      position: { x: 0, y: 0 },
    }).inventory;

    expect(getBackpackEntry(placed.backpack, "coin-direct").position).toEqual({ x: 0, y: 0 });

    const fullInventory = createFullInventory();
    const temporary = service.receiveItem({
      inventory: fullInventory,
      playerName: "Runze",
      input: {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "event.reward",
        newItemInstanceIds: ["coin-temp"],
      },
    }).inventory;
    const upgraded = service.upgradeBackpack({
      inventory: temporary,
      playerName: "Runze",
    }).inventory;
    const stored = service.storeTemporaryPickup({
      inventory: upgraded,
      playerName: "Runze",
      targetPosition: { x: 4, y: 0 },
    }).inventory;
    await logger.flush();

    expect(stored.temporaryPickup).toBeNull();
    expect(getBackpackEntry(stored.backpack, "coin-temp").position).toEqual({ x: 4, y: 0 });
  });

  it("abandons a temporary pickup without changing the backpack", async () => {
    const fullInventory = createFullInventory();
    const fixture = createFixture(fullInventory);
    const temporary = fixture.service.receiveItem({
      inventory: fullInventory,
      playerName: "Runze",
      input: {
        definitionId: "item.coin",
        quantity: 1,
        sourceId: "event.reward",
        newItemInstanceIds: ["coin-abandoned"],
      },
    }).inventory;

    const result = fixture.service.abandonTemporaryPickup({
      inventory: temporary,
      playerName: "Runze",
    });
    await fixture.logger.flush();

    expect(result.item.instanceId).toBe("coin-abandoned");
    expect(result.inventory.temporaryPickup).toBeNull();
    expect(result.inventory.backpack).toEqual(fullInventory.backpack);
  });

  it("records failed operations and preserves the original inventory", async () => {
    const inventory = createFullInventory();
    const { logger, service, writer } = createFixture(inventory);

    expect(() =>
      service.moveItem({
        inventory,
        playerName: "Runze",
        itemInstanceId: "blocker-1",
        targetPosition: { x: 1, y: 0 },
      }),
    ).toThrow("cannot be moved");
    await logger.flush();

    expect(getBackpackEntry(inventory.backpack, "blocker-1").position).toEqual({ x: 0, y: 0 });
    expect(writer.lines[0]).toContain("[WARN ]");
    expect(writer.lines[0]).toContain("Inventory operation moveItem failed.");
  });
});

/**
 * 方法名：createFullInventory
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createFullInventory(): PlayerInventoryState {
  const blocker = createItemInstance(
    {
      instanceId: "blocker-1",
      definitionId: "item.blocker",
      ownerPlayerId: PLAYER_ID,
    },
    DEFINITIONS["item.blocker"],
  );
  const inventory = createPlayerInventory(PLAYER_ID);

  return {
    ...inventory,
    backpack: placeItemInBackpack(inventory.backpack, blocker, { x: 0, y: 0 }, DEFINITIONS),
  };
}
