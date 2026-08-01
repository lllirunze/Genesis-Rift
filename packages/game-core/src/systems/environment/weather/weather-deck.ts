import type { RandomStream } from "../../random/core/random-stream.ts";
import { STANDARD_WEATHER_CARD_IDS, WEATHER_DECK_VERSION } from "./weather-config.ts";
import {
  getWeatherCardTriggerType,
  isJokerWeatherCard,
  isStandardWeatherCardId,
  type WeatherCardId,
  type WeatherCardTriggerType,
} from "./weather-card.ts";

export interface WeatherDeckState {
  readonly version: typeof WEATHER_DECK_VERSION;
  readonly drawPile: readonly WeatherCardId[];
  readonly discardPile: readonly WeatherCardId[];
  readonly activeCardId: WeatherCardId | null;
  readonly drawCount: number;
}

export interface WeatherCardDrawResult {
  readonly cardId: WeatherCardId;
  readonly triggerType: WeatherCardTriggerType;
  readonly state: WeatherDeckState;
  readonly reshuffled: boolean;
  readonly skippedJokerCount: number;
}

export function createWeatherDeck(randomStream: RandomStream): WeatherDeckState {
  assertWeatherStream(randomStream);

  return {
    version: WEATHER_DECK_VERSION,
    drawPile: randomStream.shuffle(STANDARD_WEATHER_CARD_IDS),
    discardPile: [],
    activeCardId: null,
    drawCount: 0,
  };
}

export function drawWeatherCard(
  state: WeatherDeckState,
  randomStream: RandomStream,
): WeatherCardDrawResult {
  return drawCard(state, randomStream, false);
}

export function drawRecoveryWeatherCard(
  state: WeatherDeckState,
  randomStream: RandomStream,
): WeatherCardDrawResult {
  return drawCard(state, randomStream, true);
}

export function validateWeatherDeckState(state: WeatherDeckState): void {
  if (state.version !== WEATHER_DECK_VERSION) {
    throw new Error(`Unsupported weather deck version: ${state.version as string}`);
  }

  if (!Number.isSafeInteger(state.drawCount) || state.drawCount < 0) {
    throw new TypeError("weather deck drawCount must be a non-negative safe integer");
  }

  const allCardIds = [
    ...state.drawPile,
    ...state.discardPile,
    ...(state.activeCardId === null ? [] : [state.activeCardId]),
  ];

  if (allCardIds.length !== STANDARD_WEATHER_CARD_IDS.length) {
    throw new Error(`weather deck must contain exactly ${STANDARD_WEATHER_CARD_IDS.length} cards`);
  }

  const uniqueCardIds = new Set<WeatherCardId>();

  for (const cardId of allCardIds) {
    if (!isStandardWeatherCardId(cardId)) {
      throw new Error(`Unknown weather card id: ${cardId as string}`);
    }

    if (uniqueCardIds.has(cardId)) {
      throw new Error(`Duplicate weather card id: ${cardId}`);
    }

    uniqueCardIds.add(cardId);
  }
}

function drawCard(
  state: WeatherDeckState,
  randomStream: RandomStream,
  skipJokers: boolean,
): WeatherCardDrawResult {
  assertWeatherStream(randomStream);
  validateWeatherDeckState(state);

  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  let reshuffled = false;

  if (state.activeCardId !== null) {
    discardPile.push(state.activeCardId);
  }

  if (
    drawPile.length === 0 ||
    (skipJokers && !drawPile.some((cardId) => !isJokerWeatherCard(cardId)))
  ) {
    drawPile = randomStream.shuffle([...drawPile, ...discardPile]);
    discardPile = [];
    reshuffled = true;
  }

  const drawIndex = skipJokers ? drawPile.findIndex((cardId) => !isJokerWeatherCard(cardId)) : 0;

  if (drawIndex < 0) {
    throw new Error("weather deck contains no drawable non-joker card");
  }

  const cardId = drawPile[drawIndex];

  if (cardId === undefined) {
    throw new Error("weather deck contains no drawable card");
  }

  drawPile.splice(drawIndex, 1);

  return {
    cardId,
    triggerType: getWeatherCardTriggerType(cardId),
    state: {
      version: WEATHER_DECK_VERSION,
      drawPile,
      discardPile,
      activeCardId: cardId,
      drawCount: state.drawCount + 1,
    },
    reshuffled,
    skippedJokerCount: skipJokers ? drawIndex : 0,
  };
}

function assertWeatherStream(randomStream: RandomStream): void {
  if (randomStream.streamType !== "weather") {
    throw new TypeError("weather deck requires a weather random stream");
  }
}
