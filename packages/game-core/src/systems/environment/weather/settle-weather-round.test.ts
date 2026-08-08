import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import { STANDARD_WEATHER_CARD_IDS, WEATHER_DECK_VERSION } from "./weather-config.ts";
import type { WeatherDeckState } from "./weather-deck.ts";
import type { WeatherDefinition, WeatherDisasterDefinition } from "./weather-definition.ts";
import { settleWeatherAtRoundStart } from "./settle-weather-round.ts";
import { createWeatherRuntimeState } from "./weather-runtime-state.ts";

const CLEAR_WEATHER: WeatherDefinition = {
  weatherId: "weather_000201",
  name: "Clear",
  description: "Clear weather for scheduled settlement tests.",
  category: "NORMAL",
  durationRounds: 2,
  scopeType: "WORLD",
  coexistencePolicy: "REPLACE",
  tags: ["clear"],
  hasNumericEffect: false,
  avoidanceTypes: [],
  effectIds: [],
};
const DISASTER: WeatherDisasterDefinition = {
  weatherId: "weather_000202",
  name: "Test Disaster",
  description: "A test disaster started by a joker.",
  scopeType: "WORLD",
  tags: ["disaster"],
  phases: [
    { phase: "WARNING", rounds: 1, effectIds: ["warning"] },
    { phase: "DISASTER", rounds: 1, effectIds: ["disaster"] },
    { phase: "RECOVERY", rounds: 1, effectIds: ["recovery"] },
  ],
  shelterTypes: ["building"],
  wildernessCountermeasureIds: ["tent"],
  postDisasterEventPoolId: "event-pool.test.recovery",
};

/** 创建牌顶为指定牌面的完整合法天气牌组状态。 */
function createDeck(topCardId: (typeof STANDARD_WEATHER_CARD_IDS)[number]): WeatherDeckState {
  return {
    version: WEATHER_DECK_VERSION,
    drawPile: [topCardId, ...STANDARD_WEATHER_CARD_IDS.filter((cardId) => cardId !== topCardId)],
    discardPile: [],
    activeCardId: null,
    drawCount: 0,
  };
}

/** 创建天气模块专用固定种子随机流。 */
function createWeatherStream(): RandomStream {
  return RandomStream.create("weather", "weather-test", createRandomStreamSeed("0123456789abcdef"));
}

describe("weather round settlement", () => {
  it("draws and starts configured weather on odd rounds", () => {
    const result = settleWeatherAtRoundStart(
      createDeck("HEART_3"),
      createWeatherRuntimeState(),
      createWeatherStream(),
      {
        HEART_3: { cardId: "HEART_3", weatherId: CLEAR_WEATHER.weatherId, kind: "WEATHER" },
      },
      { [CLEAR_WEATHER.weatherId]: CLEAR_WEATHER },
      {},
      {
        round: 1,
        createWeatherInstanceId: () => "weather-instance-1",
        resolveScopeTargetId: () => null,
      },
    );

    expect(result).toMatchObject({
      outcome: "WEATHER_STARTED",
      cardId: "HEART_3",
      weatherId: CLEAR_WEATHER.weatherId,
    });
    expect(result.weather.activeWeathers[0]?.remainingRounds).toBe(2);
  });

  it("starts a joker disaster and pauses later scheduled weather draws", () => {
    const started = settleWeatherAtRoundStart(
      createDeck("JOKER_BIG"),
      createWeatherRuntimeState(),
      createWeatherStream(),
      {
        JOKER_BIG: { cardId: "JOKER_BIG", weatherId: DISASTER.weatherId, kind: "DISASTER" },
      },
      {},
      { [DISASTER.weatherId]: DISASTER },
      {
        round: 1,
        createWeatherInstanceId: () => "disaster-instance-1",
        resolveScopeTargetId: () => null,
      },
    );
    const paused = settleWeatherAtRoundStart(
      started.deck,
      started.weather,
      createWeatherStream(),
      {},
      {},
      { [DISASTER.weatherId]: DISASTER },
      {
        round: 3,
        createWeatherInstanceId: () => "unused",
        resolveScopeTargetId: () => null,
      },
    );

    expect(started.outcome).toBe("DISASTER_STARTED");
    expect(paused.outcome).toBe("PAUSED_BY_DISASTER");
    expect(paused.deck).toBe(started.deck);
  });

  it("draws a non-joker recovery weather even outside the normal odd-round schedule", () => {
    const recoveryDeck: WeatherDeckState = {
      version: WEATHER_DECK_VERSION,
      drawPile: [
        "JOKER_SMALL",
        "HEART_3",
        ...STANDARD_WEATHER_CARD_IDS.filter(
          (cardId) => cardId !== "JOKER_SMALL" && cardId !== "HEART_3",
        ),
      ],
      discardPile: [],
      activeCardId: null,
      drawCount: 0,
    };
    const result = settleWeatherAtRoundStart(
      recoveryDeck,
      {
        ...createWeatherRuntimeState(),
        requiresRecoveryDraw: true,
      },
      createWeatherStream(),
      {
        HEART_3: { cardId: "HEART_3", weatherId: CLEAR_WEATHER.weatherId, kind: "WEATHER" },
      },
      { [CLEAR_WEATHER.weatherId]: CLEAR_WEATHER },
      {},
      {
        round: 2,
        createWeatherInstanceId: () => "weather-instance-recovery",
        resolveScopeTargetId: () => null,
      },
    );

    expect(result.outcome).toBe("RECOVERY_WEATHER_STARTED");
    expect(result.cardId).not.toMatch(/^JOKER/);
    expect(result.weather.requiresRecoveryDraw).toBe(false);
  });
});
