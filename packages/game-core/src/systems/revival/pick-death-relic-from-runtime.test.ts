import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import { createPlayerInventory } from "../inventory/index.ts";

import { createDeathRelicState } from "./death-relic-state.ts";
import { addDeathRelic, createDeathRelicRuntimeState } from "./death-relic-runtime-state.ts";
import { pickDeathRelicFromRuntime } from "./pick-death-relic-from-runtime.ts";

const OWNER_ID = "player_a" as PlayerId;
const VISITOR_ID = "player_b" as PlayerId;
const TILE_ID = "tile_000001" as TileId;

const DEFINITIONS = {
  item_000002: {
    definitionId: "item_000002",
    name: "Linen",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const satisfies ItemDefinitionCatalog;

describe("pickDeathRelicFromRuntime", () => {
  it("成功拾取后会将最新遗物状态写回公共运行时容器", () => {
    const relic = createDeathRelicState({
      deathRelicId: "death-relic-1",
      ownerPlayerId: OWNER_ID,
      tileId: TILE_ID,
      coinQuantity: 0,
      items: [
        {
          instanceId: "relic-item-1",
          definitionId: "item_000002",
          ownerPlayerId: OWNER_ID,
          quantity: 1,
          stackCompatibilityKey: "default",
        },
      ],
    });
    const runtimeState = addDeathRelic(createDeathRelicRuntimeState(), relic);

    const result = pickDeathRelicFromRuntime({
      runtimeState,
      deathRelicId: relic.deathRelicId,
      inventory: createPlayerInventory(VISITOR_ID),
      currentTileId: TILE_ID,
      target: { kind: "ITEM", itemInstanceId: "relic-item-1" },
      itemDefinitions: DEFINITIONS,
      newItemInstanceIds: ["visitor-item-1"],
    });

    expect(result).toMatchObject({
      outcome: "PICKED",
      runtimeState: { relics: [{ items: [], pickupRecords: [{ playerId: VISITOR_ID }] }] },
    });
  });

  it("拒绝从不存在或已到期移除的遗物包拾取内容", () => {
    const runtimeState = createDeathRelicRuntimeState();

    expect(
      pickDeathRelicFromRuntime({
        runtimeState,
        deathRelicId: "death-relic-missing",
        inventory: createPlayerInventory(VISITOR_ID),
        currentTileId: TILE_ID,
        target: { kind: "ITEM", itemInstanceId: "relic-item-1" },
        itemDefinitions: DEFINITIONS,
        newItemInstanceIds: ["visitor-item-1"],
      }),
    ).toMatchObject({ outcome: "REJECTED", reason: "RELIC_NOT_FOUND" });
  });
});
