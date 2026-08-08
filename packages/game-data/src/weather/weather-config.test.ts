import {
  STANDARD_WEATHER_CARD_IDS,
  validateWeatherCardMappings,
  validateWeatherDefinitionCatalog,
  validateWeatherDisasterDefinition,
  validateWeatherEffectReferences,
} from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import {
  REGIONAL_TYPHOON_DISASTER_DEFINITION,
  SUPER_TYPHOON_DISASTER_DEFINITION,
  WEATHER_CARD_MAPPING_CATALOG,
  WEATHER_DEFINITION_CATALOG,
  WEATHER_DISASTER_DEFINITION_CATALOG,
} from "./weather-config.ts";
import { WEATHER_EFFECT_DEFINITION_CATALOG } from "./weather-effect-config.ts";

describe("weather configuration", () => {
  it("maps all 54 standard cards to valid weather or disaster resources", () => {
    expect(() => validateWeatherDefinitionCatalog(WEATHER_DEFINITION_CATALOG)).not.toThrow();
    expect(() =>
      validateWeatherCardMappings(
        WEATHER_CARD_MAPPING_CATALOG,
        WEATHER_DEFINITION_CATALOG,
        WEATHER_DISASTER_DEFINITION_CATALOG,
      ),
    ).not.toThrow();
    expect(Object.keys(WEATHER_CARD_MAPPING_CATALOG)).toHaveLength(
      STANDARD_WEATHER_CARD_IDS.length,
    );
    expect(() =>
      validateWeatherEffectReferences(
        WEATHER_DEFINITION_CATALOG,
        WEATHER_DISASTER_DEFINITION_CATALOG,
        WEATHER_EFFECT_DEFINITION_CATALOG,
      ),
    ).not.toThrow();
  });

  it("configures executable map effects for heavy rain, dense fog and blizzard", () => {
    expect(WEATHER_EFFECT_DEFINITION_CATALOG["weather.muddy-movement"]).toMatchObject({
      effectType: "MOVEMENT_COST",
      movementCostModifier: 1,
    });
    expect(WEATHER_EFFECT_DEFINITION_CATALOG["weather.vision-minus-one"]).toMatchObject({
      effectType: "VISION_RANGE",
      visionRangeModifier: -1,
    });
    expect(WEATHER_EFFECT_DEFINITION_CATALOG["weather.blizzard-movement"]).toMatchObject({
      effectType: "MOVEMENT_COST",
      movementCostModifier: 2,
    });
  });

  it("keeps the event weather id aligned with the blizzard card configuration", () => {
    expect(WEATHER_CARD_MAPPING_CATALOG.SPADE_9).toMatchObject({
      weatherId: "weather_000004",
      kind: "WEATHER",
    });
    expect(WEATHER_DEFINITION_CATALOG.weather_000004?.name).toBe("Blizzard");
  });

  it("defines ordered three-stage disasters for both jokers", () => {
    expect(() =>
      validateWeatherDisasterDefinition(REGIONAL_TYPHOON_DISASTER_DEFINITION),
    ).not.toThrow();
    expect(() =>
      validateWeatherDisasterDefinition(SUPER_TYPHOON_DISASTER_DEFINITION),
    ).not.toThrow();
    expect(SUPER_TYPHOON_DISASTER_DEFINITION.phases.map((phase) => phase.phase)).toEqual([
      "WARNING",
      "DISASTER",
      "RECOVERY",
    ]);
  });
});
