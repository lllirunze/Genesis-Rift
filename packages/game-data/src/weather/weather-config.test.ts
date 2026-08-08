import {
  STANDARD_WEATHER_CARD_IDS,
  validateWeatherCardMappings,
  validateWeatherDefinitionCatalog,
  validateWeatherDisasterDefinition,
} from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import {
  REGIONAL_TYPHOON_DISASTER_DEFINITION,
  SUPER_TYPHOON_DISASTER_DEFINITION,
  WEATHER_CARD_MAPPING_CATALOG,
  WEATHER_DEFINITION_CATALOG,
  WEATHER_DISASTER_DEFINITION_CATALOG,
} from "./weather-config.ts";

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
