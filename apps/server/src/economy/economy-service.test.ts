import { describe, expect, it } from "vitest";

import {
  createItemInstance,
  createPlayerInventory,
  getBackpackEntry,
  placeItemInBackpack,
  type PlayerInventoryState,
} from "@genesis-rift/game-core";
import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { EconomyService } from "./economy-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

const DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: {
    definitionId: COIN_ITEM_DEFINITION_ID,
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

  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  async close(): Promise<void> {}
}

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
    service: new EconomyService(DEFINITIONS, logger),
    writer,
  };
}

describe("EconomyService", () => {
  it("receives Coin as backpack items and derives the balance from their stacks", async () => {
    const { inventory, logger, service, writer } = createFixture();

    const result = service.receiveCoins({
      inventory,
      playerName: "Runze",
      quantity: 12,
      sourceId: "quest.reward",
      newItemInstanceIds: ["coin-1", "coin-2", "coin-3"],
    });
    await logger.flush();

    expect(result.previousBalance).toBe(0);
    expect(result.currentBalance).toBe(12);
    expect(result.inventory.backpack.entries.map((entry) => entry.item.quantity)).toEqual([
      5, 5, 2,
    ]);
    expect(service.getBalance(result.inventory)).toBe(12);
    expect(service.canAfford(result.inventory, 12)).toBe(true);
    expect(service.canAfford(result.inventory, 13)).toBe(false);
    expect(inventory.backpack.entries).toEqual([]);
    expect(writer.lines[0]).toContain("Player added 12 Coin to the backpack.");
  });

  it("pays from backpack stacks and returns an auditable payment result", async () => {
    const fixture = createFixture();
    const inventory = fixture.service.receiveCoins({
      inventory: fixture.inventory,
      playerName: "Runze",
      quantity: 12,
      sourceId: "event.reward",
      newItemInstanceIds: ["coin-1", "coin-2", "coin-3"],
    }).inventory;
    await fixture.logger.flush();

    const paymentFixture = createFixture(inventory);
    const result = paymentFixture.service.payCoins({
      inventory,
      playerName: "Runze",
      coinQuantity: 7,
      reasonId: "blacksmith.craft-fee",
    });
    await paymentFixture.logger.flush();

    expect(result.paid).toBe(true);
    if (!result.paid) {
      throw new Error("Expected payment to succeed");
    }
    expect(result.previousBalance).toBe(12);
    expect(result.currentBalance).toBe(5);
    expect(result.payment.consumedItemInstanceIds).toEqual(["coin-1", "coin-2"]);
    expect(getBackpackEntry(result.inventory.backpack, "coin-2").item.quantity).toBe(3);
    expect(paymentFixture.service.getBalance(inventory)).toBe(12);
    expect(paymentFixture.writer.lines[0]).toContain("Player paid 7 Coin.");
  });

  it("returns an insufficient balance result without modifying inventory", async () => {
    const fixture = createFixture();
    const inventory = fixture.service.receiveCoins({
      inventory: fixture.inventory,
      playerName: "Runze",
      quantity: 4,
      sourceId: "battle.reward",
      newItemInstanceIds: ["coin-1"],
    }).inventory;
    await fixture.logger.flush();

    const paymentFixture = createFixture(inventory);
    const result = paymentFixture.service.payCoins({
      inventory,
      playerName: "Runze",
      coinQuantity: 5,
      reasonId: "shop.purchase",
    });
    await paymentFixture.logger.flush();

    expect(result).toMatchObject({
      paid: false,
      inventory,
      reason: "insufficient-coin",
      requiredCoinQuantity: 5,
      currentBalance: 4,
      missingCoinQuantity: 1,
    });
    expect(getBackpackEntry(inventory.backpack, "coin-1").item.quantity).toBe(4);
    expect(paymentFixture.writer.lines[0]).toContain("balance was insufficient");
  });

  it("does not count temporary or unresolved Coin as spendable balance", async () => {
    const inventory = createFullInventory();
    const { logger, service, writer } = createFixture(inventory);

    const result = service.receiveCoins({
      inventory,
      playerName: "Runze",
      quantity: 7,
      sourceId: "event.reward",
      newItemInstanceIds: ["coin-temp", "coin-unresolved"],
    });
    await logger.flush();

    expect(result.backpackQuantityAdded).toBe(0);
    expect(result.temporaryQuantityAdded).toBe(5);
    expect(result.unresolvedItems[0]?.item.quantity).toBe(2);
    expect(result.currentBalance).toBe(0);
    expect(service.canAfford(result.inventory, 1)).toBe(false);
    expect(writer.lines).toHaveLength(3);
  });

  it("records invalid payment input and preserves the original inventory", async () => {
    const { inventory, logger, service, writer } = createFixture();

    expect(() =>
      service.payCoins({
        inventory,
        playerName: "Runze",
        coinQuantity: -1,
        reasonId: "shop.invalid",
      }),
    ).toThrow(TypeError);
    expect(() =>
      service.payCoins({
        inventory,
        playerName: "Runze",
        coinQuantity: 0,
        reasonId: "",
      }),
    ).toThrow(TypeError);
    await logger.flush();

    expect(inventory.backpack.entries).toEqual([]);
    expect(writer.lines).toHaveLength(2);
    expect(writer.lines.every((line) => line.includes("[ERROR]"))).toBe(true);
  });
});

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
