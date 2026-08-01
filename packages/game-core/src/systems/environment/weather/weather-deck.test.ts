import { describe, expect, it } from "vitest";

import { RandomManager } from "../../random/core/random-manager.ts";
import { createMasterSeed } from "../../random/core/random-seed.ts";
import type { RandomStream } from "../../random/core/random-stream.ts";
import {
  STANDARD_WEATHER_CARD_IDS,
  WEATHER_DECK_SCOPE_ID,
  WEATHER_DECK_VERSION,
} from "./weather-config.ts";
import { isJokerWeatherCard, type WeatherCardId } from "./weather-card.ts";
import {
  createWeatherDeck,
  drawRecoveryWeatherCard,
  drawWeatherCard,
  type WeatherDeckState,
} from "./weather-deck.ts";

const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);

function createWeatherStream(): RandomStream {
  return RandomManager.create(MASTER_SEED).getStream("weather", WEATHER_DECK_SCOPE_ID);
}

describe("weather deck", () => {
  it("creates a reproducible shuffled 54-card deck", () => {
    const firstDeck = createWeatherDeck(createWeatherStream());
    const secondDeck = createWeatherDeck(createWeatherStream());

    expect(firstDeck).toEqual(secondDeck);
    expect(firstDeck.drawPile).toHaveLength(54);
    expect(new Set(firstDeck.drawPile).size).toBe(54);
    expect(firstDeck.drawPile).not.toEqual(STANDARD_WEATHER_CARD_IDS);
  });

  it("draws the fixed-seed golden sequence without consuming more randomness", () => {
    const stream = createWeatherStream();
    let state = createWeatherDeck(stream);
    const drawnCards: WeatherCardId[] = [];

    for (let index = 0; index < 8; index += 1) {
      const result = drawWeatherCard(state, stream);

      drawnCards.push(result.cardId);
      state = result.state;
    }

    expect(drawnCards).toEqual([
      "CLUB_9",
      "DIAMOND_K",
      "DIAMOND_7",
      "SPADE_10",
      "CLUB_6",
      "HEART_4",
      "DIAMOND_4",
      "DIAMOND_3",
    ]);
    expect(stream.exportState().callCount).toBe(53);
  });

  it("does not reshuffle until every card in the current deck has been drawn", () => {
    const stream = createWeatherStream();
    let state = createWeatherDeck(stream);
    const firstCycleCards = new Set<WeatherCardId>();

    for (let index = 0; index < 54; index += 1) {
      const result = drawWeatherCard(state, stream);

      expect(result.reshuffled).toBe(false);
      firstCycleCards.add(result.cardId);
      state = result.state;
    }

    expect(firstCycleCards.size).toBe(54);

    const nextCycle = drawWeatherCard(state, stream);

    expect(nextCycle.reshuffled).toBe(true);
    expect(nextCycle.state.drawCount).toBe(55);
  });

  it("skips a leading joker during post-disaster recovery without discarding it", () => {
    const recoveryCardId: WeatherCardId = "SPADE_2";
    const remainingCards = STANDARD_WEATHER_CARD_IDS.filter(
      (cardId) => cardId !== "JOKER_SMALL" && cardId !== recoveryCardId,
    );
    const state: WeatherDeckState = {
      version: WEATHER_DECK_VERSION,
      drawPile: ["JOKER_SMALL", recoveryCardId, ...remainingCards],
      discardPile: [],
      activeCardId: null,
      drawCount: 0,
    };

    const result = drawRecoveryWeatherCard(state, createWeatherStream());

    expect(result.cardId).toBe(recoveryCardId);
    expect(result.triggerType).toBe("weather");
    expect(result.skippedJokerCount).toBe(1);
    expect(result.state.drawPile[0]).toBe("JOKER_SMALL");
  });

  it("rebuilds the available deck when only a joker remains in the draw pile", () => {
    const normalCards = STANDARD_WEATHER_CARD_IDS.filter((cardId) => !isJokerWeatherCard(cardId));
    const state: WeatherDeckState = {
      version: WEATHER_DECK_VERSION,
      drawPile: ["JOKER_BIG"],
      discardPile: normalCards,
      activeCardId: "JOKER_SMALL",
      drawCount: 53,
    };

    const result = drawRecoveryWeatherCard(state, createWeatherStream());

    expect(result.reshuffled).toBe(true);
    expect(isJokerWeatherCard(result.cardId)).toBe(false);
    expect(result.state.drawPile.filter(isJokerWeatherCard)).toHaveLength(2);
  });

  it("requires the dedicated weather random stream", () => {
    const manager = RandomManager.create(MASTER_SEED);
    const combatStream = manager.getStream("combat");

    expect(() => createWeatherDeck(combatStream)).toThrow(TypeError);
  });
});
