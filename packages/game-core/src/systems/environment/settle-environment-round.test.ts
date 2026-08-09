import { describe, expect, it } from "vitest";

import { createRandomStreamSeed, RandomStream } from "../random/index.ts";
import { createDayNightRuntimeState } from "./day-night/day-night-runtime-state.ts";
import { createEnvironmentRuntimeState } from "./environment-runtime-state.ts";
import {
  advanceEnvironmentRound,
  settleEnvironmentAtRoundStart,
} from "./settle-environment-round.ts";
import { STANDARD_WEATHER_CARD_IDS, WEATHER_DECK_VERSION } from "./weather/weather-config.ts";
import type { WeatherDeckState } from "./weather/weather-deck.ts";
import type { WeatherDefinition } from "./weather/weather-definition.ts";
import { createWeatherRuntimeState } from "./weather/weather-runtime-state.ts";

const CLEAR_WEATHER: WeatherDefinition = {
  weatherId: "weather_000201",
  name: "Clear",
  description: "Clear weather for environment settlement tests.",
  category: "NORMAL",
  durationRounds: 2,
  scopeType: "WORLD",
  coexistencePolicy: "REPLACE",
  tags: ["clear"],
  hasNumericEffect: false,
  avoidanceTypes: [],
  effectIds: [],
};

describe("environment round settlement", () => {
  it("在首轮抽取天气，并在完整轮次边界推进到下一轮后保持统一公开环境", () => {
    const started = settleEnvironmentAtRoundStart(
      createInput(createEnvironmentRuntimeState(createDeck(), createWeatherRuntimeState())),
    );
    const advanced = advanceEnvironmentRound(createInput(started.state));

    expect(started.weatherSettlement.outcome).toBe("WEATHER_STARTED");
    expect(started.publicView).toMatchObject({
      currentRound: 1,
      dayNight: { periodId: "day", elapsedRounds: 1 },
      activeWeatherIds: [CLEAR_WEATHER.weatherId],
    });
    expect(advanced).toMatchObject({
      completedRound: 1,
      dayNightPeriodChanged: false,
      state: { dayNight: { currentRound: 2 } },
      publicView: { currentRound: 2, dayNight: { periodId: "day", elapsedRounds: 2 } },
    });
    expect(advanced.state.weather.activeWeathers[0]?.remainingRounds).toBe(1);
  });

  it("在第五轮结束后切换至黑夜，且偶数轮不重新抽取普通天气", () => {
    const state = createEnvironmentRuntimeState(
      createDeck(),
      createWeatherRuntimeState(),
      createDayNightRuntimeState(5),
    );
    const result = advanceEnvironmentRound(createInput(state));

    expect(result).toMatchObject({
      completedRound: 5,
      dayNightPeriodChanged: true,
      weatherSettlement: { outcome: "NOT_SCHEDULED" },
      publicView: { currentRound: 6, dayNight: { periodId: "night", elapsedRounds: 1 } },
    });
  });
});

/** 创建牌顶为晴天的合法天气牌库。 */
function createDeck(): WeatherDeckState {
  return {
    version: WEATHER_DECK_VERSION,
    drawPile: ["HEART_3", ...STANDARD_WEATHER_CARD_IDS.filter((cardId) => cardId !== "HEART_3")],
    discardPile: [],
    activeCardId: null,
    drawCount: 0,
  };
}

/** 创建环境结算测试使用的固定天气配置与随机入口。 */
function createInput(state: ReturnType<typeof createEnvironmentRuntimeState>) {
  return {
    state,
    randomStream: RandomStream.create(
      "weather",
      "environment-settlement-test",
      createRandomStreamSeed("0123456789abcdef"),
    ),
    weatherMappings: {
      HEART_3: { cardId: "HEART_3", weatherId: CLEAR_WEATHER.weatherId, kind: "WEATHER" },
    },
    weatherDefinitions: { [CLEAR_WEATHER.weatherId]: CLEAR_WEATHER },
    weatherDisasterDefinitions: {},
    createWeatherInstanceId: (cardId: string, round: number) => `weather.${cardId}.${round}`,
    resolveWeatherScopeTargetId: () => null,
  } as const;
}
