import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";
import { COIN_ITEM_DEFINITION_ID } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { createCharacterStatusState } from "../battle/status/character-status-state.ts";
import type { StatusDefinitionCatalog } from "../battle/status/status-definition.ts";
import { createCharacterResourceState } from "../character/character-resource-state.ts";
import { createPlayerInventory } from "../inventory/player-inventory-state.ts";
import { createWeatherRuntimeState } from "../environment/weather/weather-runtime-state.ts";
import { createPlayerExplorationState } from "../map/exploration/player-exploration-state.ts";
import { getCubeCoordinateKey } from "../map/geometry/cube-coordinate-key.ts";
import { generateBaseMapCoordinates } from "../map/generation/generate-base-map-coordinates.ts";
import { HexMap } from "../map/model/hex-map.ts";
import { createHexTile } from "../map/model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../map/model/map-content-definition-catalog.ts";
import { EventGameplayEffectStateAdapter } from "./event-gameplay-effect-adapter.ts";
import { createGameplayEventEffectHandlerRegistry } from "./event-effect-handlers.ts";
import type { EventEffectDefinition, EventEffectId } from "./event-effect-definition.ts";

const PLAYER_ID = "player-1" as PlayerId;
const RESOURCE_DEFINITIONS = {
  health: {
    resourceId: "health",
    maximumDerivedAttribute: "maxHealth",
    minimum: 0,
    initialValue: { kind: "fixed", value: 50 },
  },
} as const;
const ITEM_DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: {
    definitionId: COIN_ITEM_DEFINITION_ID,
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
  item_000002: {
    definitionId: "item_000002",
    name: "Linen Cloth",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const satisfies ItemDefinitionCatalog;
const STATUS_DEFINITIONS = {
  buff_000001: {
    definitionId: "buff_000001",
    name: "Test Blessing",
    description: "A stackable status used by the event adapter test.",
    kind: "buff",
    tags: ["test"],
    duration: { turns: 3 },
    maxStacks: 2,
    removal: { dispellable: true, removeOnDeath: true },
    effects: [],
  },
} as const satisfies StatusDefinitionCatalog;
const MAP_DEFINITIONS = {
  terrains: {
    terrain_000001: {
      definitionId: "terrain_000001",
      name: "Plain",
      tags: [],
      movementCostModifier: 0,
    },
  },
  regions: {
    region_000001: {
      definitionId: "region_000001",
      name: "Wilderness",
      category: "wilderness",
      tags: [],
    },
  },
} as const satisfies MapContentDefinitionCatalog;
const WEATHER_DEFINITIONS = {
  weather_000004: {
    weatherId: "weather_000004",
    name: "Blizzard",
    description: "A regional blizzard used by the event adapter test.",
    category: "EXTREME",
    durationRounds: 2,
    scopeType: "WORLD",
    coexistencePolicy: "REPLACE",
    tags: ["snow", "storm"],
    hasNumericEffect: true,
    avoidanceTypes: ["building"],
    effectIds: ["weather.blizzard-movement"],
  },
} as const;

/**
 * 方法名：createTestMap
 * 作用：创建事件传送效果测试使用的完整十环地图。
 * @returns 包含稳定地块标识的六边形地图。
 */
function createTestMap(): HexMap {
  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) =>
      createHexTile(
        {
          tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
          coordinate,
          elevation: 0,
          terrainDefinitionId: "terrain_000001",
          regionDefinitionId: "region_000001",
          passability: "passable",
        },
        MAP_DEFINITIONS,
      ),
    ),
    MAP_DEFINITIONS,
  );
}

/**
 * 方法名：createEffect
 * 作用：为注册表执行创建带有稳定局部标识的事件效果。
 * @param effectId 标准事件效果标识。
 * @param targetType 当前效果目标。
 * @param parameters 当前效果参数。
 * @returns 类型安全的事件效果定义。
 */
function createEffect<Id extends EventEffectId>(
  effectId: Id,
  targetType: Extract<EventEffectDefinition, { readonly effectId: Id }>["targetType"],
  parameters: Extract<EventEffectDefinition, { readonly effectId: Id }>["parameters"],
): Extract<EventEffectDefinition, { readonly effectId: Id }> {
  return {
    effectKey: `apply-${effectId}`,
    effectId,
    targetType,
    parameters,
    failurePolicy: "STOP",
  } as Extract<EventEffectDefinition, { readonly effectId: Id }>;
}

describe("event gameplay effect adapter", () => {
  it("applies resource, coin, item, status and teleport effects through existing systems", () => {
    const map = createTestMap();
    const origin = map.getTileAt({ x: 0, y: 0, z: 0 })!;
    const destination = map.getTileAt({ x: 1, y: -1, z: 0 })!;
    const adapter = new EventGameplayEffectStateAdapter(
      {
        map,
        weather: createWeatherRuntimeState(),
        players: [
          {
            playerId: PLAYER_ID,
            resources: createCharacterResourceState(PLAYER_ID, RESOURCE_DEFINITIONS, {
              maxHealth: 100,
            }),
            inventory: createPlayerInventory(PLAYER_ID),
            statuses: createCharacterStatusState(PLAYER_ID),
            currentTileId: origin.tileId,
            exploration: createPlayerExplorationState(PLAYER_ID, origin.tileId, map),
          },
        ],
      },
      {
        itemDefinitions: ITEM_DEFINITIONS,
        statusDefinitions: STATUS_DEFINITIONS,
        createItemInstanceIds: (context, quantity) =>
          Array.from(
            { length: quantity },
            (_, index) => `item-instance-${context.effectIndex}-${index}`,
          ),
        drawItemPool: () => [{ itemDefinitionId: "item_000002", quantity: 1 }],
        createStatusInstanceId: (_, targetPlayerId) => `status-instance-${targetPlayerId}`,
        getUpdateSequence: () => 10,
        weatherDefinitions: WEATHER_DEFINITIONS,
        createWeatherInstanceId: (context) => `weather-instance-${context.effectIndex}`,
      },
    );
    const registry = createGameplayEventEffectHandlerRegistry(adapter);
    const baseContext = {
      instanceId: "event-instance-1",
      eventId: "event_000001",
      triggeringPlayerId: PLAYER_ID,
      selectedOptionId: null,
      resolvedAtTurn: 2,
    } as const;

    registry.execute(
      createEffect("characterResource.modify", "TRIGGER_PLAYER", {
        resourceId: "health",
        amount: 20,
      }),
      { ...baseContext, effectIndex: 0 },
    );
    registry.execute(createEffect("coin.modify", "TRIGGER_PLAYER", { amount: 6 }), {
      ...baseContext,
      effectIndex: 1,
    });
    registry.execute(
      createEffect("item.obtain", "TRIGGER_PLAYER", {
        itemDefinitionId: "item_000002",
        quantity: 2,
      }),
      { ...baseContext, effectIndex: 2 },
    );
    registry.execute(
      createEffect("status.add", "TRIGGER_PLAYER", {
        statusDefinitionId: "buff_000001",
        stacks: 2,
      }),
      { ...baseContext, effectIndex: 3 },
    );
    registry.execute(
      createEffect("movement.teleport", "TRIGGER_PLAYER", {
        destinationTileId: destination.tileId,
      }),
      { ...baseContext, effectIndex: 4 },
    );
    registry.execute(
      createEffect("weather.change", "CURRENT_REGION", {
        weatherId: "weather_000004",
        durationRounds: 3,
      }),
      { ...baseContext, effectIndex: 5 },
    );

    const player = adapter.getState().players[0]!;
    expect(player.resources.resources.health.current).toBe(70);
    expect(player.inventory.backpack.entries).toHaveLength(3);
    expect(player.statuses.instances[0]).toMatchObject({ currentStacks: 2 });
    expect(player.currentTileId).toBe(destination.tileId);
    expect(player.exploration.exploredTileIds).toContain(destination.tileId);
    expect(adapter.getState().weather.activeWeathers[0]).toMatchObject({
      weatherId: "weather_000004",
      scopeType: "REGION",
      scopeTargetId: "region_000001",
      remainingRounds: 3,
    });
  });

  it("applies random item pools and keeps battle as a deferred external instruction", () => {
    const map = createTestMap();
    const origin = map.getTileAt({ x: 0, y: 0, z: 0 })!;
    const adapter = new EventGameplayEffectStateAdapter(
      {
        map,
        weather: createWeatherRuntimeState(),
        players: [
          {
            playerId: PLAYER_ID,
            resources: createCharacterResourceState(PLAYER_ID, RESOURCE_DEFINITIONS, {
              maxHealth: 100,
            }),
            inventory: createPlayerInventory(PLAYER_ID),
            statuses: createCharacterStatusState(PLAYER_ID),
            currentTileId: origin.tileId,
            exploration: createPlayerExplorationState(PLAYER_ID, origin.tileId, map),
          },
        ],
      },
      {
        itemDefinitions: ITEM_DEFINITIONS,
        statusDefinitions: STATUS_DEFINITIONS,
        createItemInstanceIds: (_, quantity) =>
          Array.from({ length: quantity }, (_, index) => `pool-item-instance-${index}`),
        drawItemPool: () => [{ itemDefinitionId: "item_000002", quantity: 1 }],
        createStatusInstanceId: () => "status-instance",
        getUpdateSequence: () => 0,
        weatherDefinitions: WEATHER_DEFINITIONS,
        createWeatherInstanceId: () => "weather-instance",
      },
    );
    const registry = createGameplayEventEffectHandlerRegistry(adapter);
    const poolResult = registry.execute(
      createEffect("item.obtainFromPool", "TRIGGER_PLAYER", {
        itemPoolId: "item-pool.test",
        drawCount: 1,
      }),
      {
        instanceId: "event-instance-1",
        eventId: "event_000001",
        triggeringPlayerId: PLAYER_ID,
        selectedOptionId: null,
        effectIndex: 0,
        resolvedAtTurn: 2,
      },
    );
    const result = registry.execute(
      createEffect("battle.start", "TRIGGER_PLAYER", {
        encounterDefinitionId: "encounter.test",
      }),
      {
        instanceId: "event-instance-1",
        eventId: "event_000001",
        triggeringPlayerId: PLAYER_ID,
        selectedOptionId: null,
        effectIndex: 1,
        resolvedAtTurn: 2,
      },
    );

    expect(poolResult).toMatchObject({ outcome: "APPLIED", effectId: "item.obtainFromPool" });
    expect(adapter.getState().players[0]?.inventory.backpack.entries).toHaveLength(1);
    expect(result).toMatchObject({ outcome: "DEFERRED", effectId: "battle.start" });
  });
});
