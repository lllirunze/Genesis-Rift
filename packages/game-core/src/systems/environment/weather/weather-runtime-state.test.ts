import { describe, expect, it } from "vitest";

import type { WeatherDefinition, WeatherDisasterDefinition } from "./weather-definition.ts";
import {
  advanceWeatherRuntimeAtRoundEnd,
  applyWeather,
  createWeatherRuntimeState,
  startWeatherDisaster,
} from "./weather-runtime-state.ts";

const CLEAR_WEATHER: WeatherDefinition = {
  weatherId: "weather_000101",
  name: "Clear",
  description: "Clear weather for runtime tests.",
  category: "NORMAL",
  durationRounds: 2,
  scopeType: "WORLD",
  coexistencePolicy: "REPLACE",
  tags: ["clear"],
  hasNumericEffect: false,
  avoidanceTypes: [],
  effectIds: [],
};
const FOG_WEATHER: WeatherDefinition = {
  ...CLEAR_WEATHER,
  weatherId: "weather_000102",
  name: "Local Fog",
  scopeType: "REGION",
  coexistencePolicy: "COEXIST",
  tags: ["fog"],
};
const DISASTER: WeatherDisasterDefinition = {
  weatherId: "weather_000103",
  name: "Test Typhoon",
  description: "A four-round disaster for runtime tests.",
  scopeType: "WORLD",
  tags: ["disaster"],
  phases: [
    { phase: "WARNING", rounds: 1, effectIds: ["warning"] },
    { phase: "DISASTER", rounds: 2, effectIds: ["damage"] },
    { phase: "RECOVERY", rounds: 1, effectIds: ["recovery"] },
  ],
  shelterTypes: ["building"],
  wildernessCountermeasureIds: ["tent"],
  postDisasterEventPoolId: "event-pool.test.recovery",
};

describe("weather runtime state", () => {
  it("replaces global weather while allowing regional weather to coexist", () => {
    let state = applyWeather(createWeatherRuntimeState(), CLEAR_WEATHER, {
      instanceId: "weather-instance-1",
      sourceType: "CARD",
      sourceId: "HEART_3",
      startedRound: 1,
    });
    state = applyWeather(state, FOG_WEATHER, {
      instanceId: "weather-instance-2",
      sourceType: "EVENT",
      sourceId: "event_000001",
      startedRound: 1,
      scopeTargetId: "region_000001",
    });
    state = applyWeather(state, CLEAR_WEATHER, {
      instanceId: "weather-instance-3",
      sourceType: "CARD",
      sourceId: "HEART_4",
      startedRound: 3,
    });

    expect(state.activeWeathers.map((weather) => weather.instanceId)).toEqual([
      "weather-instance-2",
      "weather-instance-3",
    ]);
  });

  it("advances all disaster phases and requests a non-joker recovery draw", () => {
    let state = startWeatherDisaster(createWeatherRuntimeState(), DISASTER, {
      instanceId: "disaster-instance-1",
      sourceType: "CARD",
      sourceId: "JOKER_SMALL",
      startedRound: 1,
    });

    state = advanceWeatherRuntimeAtRoundEnd(state, { [DISASTER.weatherId]: DISASTER }, 1).state;
    expect(state.activeDisaster?.phase).toBe("DISASTER");
    state = advanceWeatherRuntimeAtRoundEnd(state, { [DISASTER.weatherId]: DISASTER }, 2).state;
    expect(state.activeDisaster).toMatchObject({ phase: "DISASTER", remainingPhaseRounds: 1 });
    state = advanceWeatherRuntimeAtRoundEnd(state, { [DISASTER.weatherId]: DISASTER }, 3).state;
    expect(state.activeDisaster?.phase).toBe("RECOVERY");
    const ended = advanceWeatherRuntimeAtRoundEnd(state, { [DISASTER.weatherId]: DISASTER }, 4);

    expect(ended.disasterEnded).toBe(true);
    expect(ended.state.activeDisaster).toBeNull();
    expect(ended.state.requiresRecoveryDraw).toBe(true);
  });

  it("rejects ordinary weather while a major disaster is active", () => {
    const state = startWeatherDisaster(createWeatherRuntimeState(), DISASTER, {
      instanceId: "disaster-instance-1",
      sourceType: "CARD",
      sourceId: "JOKER_SMALL",
      startedRound: 1,
    });

    expect(() =>
      applyWeather(state, CLEAR_WEATHER, {
        instanceId: "weather-instance-1",
        sourceType: "EVENT",
        sourceId: "event_000001",
        startedRound: 1,
      }),
    ).toThrow("Ordinary weather cannot start during an active major disaster");
  });
});
