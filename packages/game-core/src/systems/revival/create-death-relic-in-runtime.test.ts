import { describe, expect, it } from "vitest";

import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import { createEmptyEquipmentLoadout } from "../equipment/index.ts";
import { createPlayerInventory } from "../inventory/index.ts";
import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import { createDeathRelicInRuntime } from "./create-death-relic-in-runtime.ts";
import { createDeathRelicRuntimeState } from "./death-relic-runtime-state.ts";

const PLAYER_ID = "player_a" as PlayerId;
const TILE_ID = "tile_000001" as TileId;

const DEFINITIONS = {} as const satisfies ItemDefinitionCatalog;

describe("createDeathRelicInRuntime", () => {
  it("创建死亡遗物后立即登记至公共运行时容器", () => {
    const result = createDeathRelicInRuntime({
      deathRelicId: "death-relic-1",
      ownerPlayerId: PLAYER_ID,
      deathTileId: TILE_ID,
      inventory: createPlayerInventory(PLAYER_ID),
      equipmentLoadout: createEmptyEquipmentLoadout(PLAYER_ID),
      itemDefinitions: DEFINITIONS,
      randomStream: RandomStream.create(
        "loot",
        "death-relic-test",
        createRandomStreamSeed("0123456789abcdef"),
      ),
      runtimeState: createDeathRelicRuntimeState(),
    });

    expect(result.runtimeState.relics).toEqual([result.relic]);
  });
});
