import { describe, expect, it } from "vitest";
import type { TileId } from "@genesis-rift/shared";

import { calculateNormalMovementCost } from "../../map/movement/movement-cost-policy.ts";
import type { HexTile } from "../../map/model/hex-tile.ts";
import type { TerrainDefinitionCatalog } from "../../map/model/terrain-definition.ts";
import type { WeatherEffectDefinitionCatalog } from "./weather-effect-definition.ts";
import type { WeatherDefinitionCatalog } from "./weather-definition.ts";
import {
  calculateWeatherAdjustedVisionRange,
  createWeatherMovementRuleResolver,
  resolveActiveWeatherEffectsForTile,
} from "./resolve-active-weather-effects.ts";
import { applyWeather, createWeatherRuntimeState } from "./weather-runtime-state.ts";

const WEATHER_DEFINITIONS = {
  weather_000101: {
    weatherId: "weather_000101",
    name: "Test Blizzard",
    description: "A test blizzard with movement and vision effects.",
    category: "EXTREME",
    durationRounds: 2,
    scopeType: "WORLD",
    coexistencePolicy: "REPLACE",
    tags: ["snow"],
    hasNumericEffect: true,
    avoidanceTypes: ["building"],
    effectIds: ["weather.test-movement", "weather.test-vision"],
  },
  weather_000102: {
    weatherId: "weather_000102",
    name: "Test Regional Rain",
    description: "Regional rain only makes suitable terrain muddy.",
    category: "EXTREME",
    durationRounds: 2,
    scopeType: "REGION",
    coexistencePolicy: "COEXIST",
    tags: ["rain"],
    hasNumericEffect: true,
    avoidanceTypes: ["building"],
    effectIds: ["weather.test-mud"],
  },
} as const satisfies WeatherDefinitionCatalog;

const EFFECT_DEFINITIONS = {
  "weather.test-movement": {
    effectId: "weather.test-movement",
    effectType: "MOVEMENT_COST",
    description: "Adds two movement points on every terrain.",
    movementCostModifier: 2,
    targetTerrainTagsAny: [],
  },
  "weather.test-vision": {
    effectId: "weather.test-vision",
    effectType: "VISION_RANGE",
    description: "Reduces vision by one tile.",
    visionRangeModifier: -1,
  },
  "weather.test-mud": {
    effectId: "weather.test-mud",
    effectType: "MOVEMENT_COST",
    description: "Adds one movement point on open or vegetated terrain.",
    movementCostModifier: 1,
    targetTerrainTagsAny: ["open", "vegetation"],
  },
} as const satisfies WeatherEffectDefinitionCatalog;

const TERRAIN_DEFINITIONS = {
  terrain_000101: {
    definitionId: "terrain_000101",
    name: "Open Plain",
    tags: ["land", "open"],
    movementCostModifier: 0,
  },
  terrain_000102: {
    definitionId: "terrain_000102",
    name: "Rock Mountain",
    tags: ["land", "highland"],
    movementCostModifier: 2,
  },
} as const satisfies TerrainDefinitionCatalog;

const DEPENDENCIES = {
  weatherDefinitions: WEATHER_DEFINITIONS,
  disasterDefinitions: {},
  effectDefinitions: EFFECT_DEFINITIONS,
} as const;

describe("active weather map effects", () => {
  it("applies blizzard movement and vision modifiers through reusable map interfaces", () => {
    const state = applyWeather(createWeatherRuntimeState(), WEATHER_DEFINITIONS.weather_000101, {
      instanceId: "weather-instance-1",
      sourceType: "CARD",
      sourceId: "SPADE_9",
      startedRound: 1,
    });
    const resolver = createWeatherMovementRuleResolver(state, TERRAIN_DEFINITIONS, DEPENDENCIES);
    const origin = createTile("origin", "terrain_000101", "region_000101");
    const target = createTile("target", "terrain_000101", "region_000101");

    expect(
      calculateNormalMovementCost(origin, target, TERRAIN_DEFINITIONS, resolver),
    ).toMatchObject({
      baseCost: 1,
      terrainCost: 0,
      environmentCost: 2,
      totalCost: 3,
    });
    expect(
      calculateWeatherAdjustedVisionRange(
        3,
        state,
        {
          regionDefinitionId: target.regionDefinitionId,
          terrainDefinitionId: target.terrainDefinitionId,
          terrainTags: TERRAIN_DEFINITIONS.terrain_000101.tags,
        },
        DEPENDENCIES,
      ),
    ).toBe(2);
  });

  it("applies regional muddy movement only to matching regions and terrain tags", () => {
    const state = applyWeather(createWeatherRuntimeState(), WEATHER_DEFINITIONS.weather_000102, {
      instanceId: "weather-instance-2",
      sourceType: "CARD",
      sourceId: "DIAMOND_8",
      startedRound: 1,
      scopeTargetId: "region_000101",
    });

    expect(resolveFor(state, "region_000101", "terrain_000101").movementCostModifier).toBe(1);
    expect(resolveFor(state, "region_000101", "terrain_000102").movementCostModifier).toBe(0);
    expect(resolveFor(state, "region_000102", "terrain_000101").movementCostModifier).toBe(0);
  });

  it("never reduces a weather-adjusted vision range below zero", () => {
    const state = applyWeather(createWeatherRuntimeState(), WEATHER_DEFINITIONS.weather_000101, {
      instanceId: "weather-instance-3",
      sourceType: "CARD",
      sourceId: "SPADE_9",
      startedRound: 1,
    });

    expect(
      calculateWeatherAdjustedVisionRange(
        0,
        state,
        {
          regionDefinitionId: "region_000101",
          terrainDefinitionId: "terrain_000101",
          terrainTags: TERRAIN_DEFINITIONS.terrain_000101.tags,
        },
        DEPENDENCIES,
      ),
    ).toBe(0);
  });
});

/** 解析指定区域与地形位置当前受到的天气效果。 */
function resolveFor(
  state: ReturnType<typeof createWeatherRuntimeState>,
  regionDefinitionId: string,
  terrainDefinitionId: keyof typeof TERRAIN_DEFINITIONS,
) {
  return resolveActiveWeatherEffectsForTile(
    state,
    {
      regionDefinitionId,
      terrainDefinitionId,
      terrainTags: TERRAIN_DEFINITIONS[terrainDefinitionId].tags,
    },
    DEPENDENCIES,
  );
}

/** 创建天气地图效果测试所需的最小合法地块。 */
function createTile(
  tileId: string,
  terrainDefinitionId: string,
  regionDefinitionId: string,
): HexTile {
  return {
    tileId: tileId as TileId,
    coordinate: { x: 0, y: 0, z: 0 },
    ring: 0,
    elevation: 0,
    terrainDefinitionId,
    regionDefinitionId,
    passability: "passable",
    features: [],
  };
}
