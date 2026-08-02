import { describe, expect, it } from "vitest";

import {
  createCharacterStatusState,
  createItemInstance,
  createPlayerInventory,
  placeItemInBackpack,
  type CharacterResourceState,
} from "@genesis-rift/game-core";
import {
  CHARACTER_RESOURCE_DEFINITIONS,
  CONSUMABLE_USAGE_CATALOG,
  HEALING_POTION_ITEM_DEFINITION,
  ITEM_DEFINITION_CATALOG,
  STATUS_DEFINITION_CATALOG,
} from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { ConsumableService } from "./consumable-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  async close(): Promise<void> {}
}

describe("ConsumableService", () => {
  it("uses a healing potion and records a structured business log", async () => {
    const fixture = createFixture(40);
    const result = fixture.service.useItem(createRequest(fixture, 2));
    await fixture.logger.flush();

    expect(result.outcome).toBe("used");
    expect(result.resourceState.resources.health?.current).toBe(65);
    expect(result.remainingItemQuantity).toBe(1);
    expect(fixture.writer.lines).toHaveLength(1);
    expect(fixture.writer.lines[0]).toContain(
      "Player used consumable item item.consumable.healing-potion.",
    );
  });

  it("does not consume a healing potion when health is already full", async () => {
    const fixture = createFixture(100);
    const result = fixture.service.useItem(createRequest(fixture, 2));
    await fixture.logger.flush();

    expect(result.outcome).toBe("no_effect");
    expect(result.inventory.backpack.entries[0]?.item.quantity).toBe(2);
    expect(fixture.writer.lines[0]).toContain("produced no applicable effect");
  });

  it("logs a rejected use without mutating the provided inventory", async () => {
    const fixture = createFixture(40);
    const request = {
      ...createRequest(fixture, 1),
      itemDefinitionId: "item.consumable.missing",
    };

    expect(() => fixture.service.useItem(request)).toThrow("Missing item definition");
    await fixture.logger.flush();

    expect(request.inventory.backpack.entries[0]?.item.quantity).toBe(1);
    expect(fixture.writer.lines[0]).toContain("could not be used");
  });
});

function createFixture(currentHealth: number) {
  const writer = new MemoryLogWriter();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => new Date(2026, 7, 1).getTime() }),
  });
  const service = new ConsumableService(
    ITEM_DEFINITION_CATALOG,
    CONSUMABLE_USAGE_CATALOG,
    STATUS_DEFINITION_CATALOG,
    logger,
  );
  const emptyInventory = createPlayerInventory(PLAYER_ID);
  const item = createItemInstance(
    {
      instanceId: "item-instance.healing-potion",
      definitionId: HEALING_POTION_ITEM_DEFINITION.definitionId,
      ownerPlayerId: PLAYER_ID,
      quantity: 2,
    },
    HEALING_POTION_ITEM_DEFINITION,
  );
  const inventory = {
    ...emptyInventory,
    backpack: placeItemInBackpack(
      emptyInventory.backpack,
      item,
      { x: 0, y: 0 },
      ITEM_DEFINITION_CATALOG,
    ),
  };
  const resourceState: CharacterResourceState<string> = {
    playerId: PLAYER_ID,
    resources: {
      [CHARACTER_RESOURCE_DEFINITIONS.health.resourceId]: {
        current: currentHealth,
        minimum: 0,
        maximum: 100,
      },
    },
  };

  return { inventory, logger, resourceState, service, writer };
}

function createRequest(fixture: ReturnType<typeof createFixture>, itemQuantity: number) {
  return {
    playerId: PLAYER_ID,
    playerName: "Runze",
    inventory: {
      ...fixture.inventory,
      backpack: {
        ...fixture.inventory.backpack,
        entries: fixture.inventory.backpack.entries.map((entry) => ({
          ...entry,
          item: { ...entry.item, quantity: itemQuantity },
        })),
      },
    },
    resourceState: fixture.resourceState,
    statusState: createCharacterStatusState(PLAYER_ID),
    itemDefinitionId: HEALING_POTION_ITEM_DEFINITION.definitionId,
    createdAtSequence: 1,
    createStatusInstanceId: (effectIndex: number) => `status-instance.${effectIndex}`,
  };
}
