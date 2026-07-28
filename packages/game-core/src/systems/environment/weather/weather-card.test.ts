import { describe, expect, it } from "vitest";

import {
  getWeatherCardTriggerType,
  STANDARD_WEATHER_CARDS,
  WEATHER_CARD_RANKS,
  WEATHER_CARD_SUITS,
} from "./weather-card.ts";

describe("standard weather cards", () => {
  it("contains every suited A-K card and exactly two jokers", () => {
    expect(STANDARD_WEATHER_CARDS).toHaveLength(54);
    expect(new Set(STANDARD_WEATHER_CARDS.map((card) => card.cardId)).size).toBe(54);

    for (const suit of WEATHER_CARD_SUITS) {
      const suitedCards = STANDARD_WEATHER_CARDS.filter((card) => card.suit === suit);

      expect(suitedCards.map((card) => card.rank)).toEqual(WEATHER_CARD_RANKS);
    }

    expect(STANDARD_WEATHER_CARDS.filter((card) => card.joker !== null)).toHaveLength(2);
  });

  it("classifies A cards and jokers into their documented business flows", () => {
    expect(getWeatherCardTriggerType("HEART_2")).toBe("weather");
    expect(getWeatherCardTriggerType("SPADE_A")).toBe("specialWeather");
    expect(getWeatherCardTriggerType("JOKER_SMALL")).toBe("majorDisaster");
    expect(getWeatherCardTriggerType("JOKER_BIG")).toBe("majorDisaster");
  });
});
