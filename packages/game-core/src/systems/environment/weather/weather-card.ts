import {
  STANDARD_WEATHER_CARD_IDS,
  WEATHER_CARD_RANKS,
  WEATHER_CARD_SUITS,
} from "./weather-config.ts";

export type WeatherCardSuit = (typeof WEATHER_CARD_SUITS)[number];
export type WeatherCardRank = (typeof WEATHER_CARD_RANKS)[number];
export type SuitedWeatherCardId = `${WeatherCardSuit}_${WeatherCardRank}`;
export type JokerWeatherCardId = "JOKER_SMALL" | "JOKER_BIG";
export type WeatherCardId = SuitedWeatherCardId | JokerWeatherCardId;

export interface SuitedWeatherCard {
  readonly cardId: SuitedWeatherCardId;
  readonly suit: WeatherCardSuit;
  readonly rank: WeatherCardRank;
  readonly joker: null;
}

export interface JokerWeatherCard {
  readonly cardId: JokerWeatherCardId;
  readonly suit: null;
  readonly rank: "JOKER";
  readonly joker: "SMALL" | "BIG";
}

export type WeatherCard = SuitedWeatherCard | JokerWeatherCard;
export type WeatherCardTriggerType = "weather" | "specialWeather" | "majorDisaster";

const STANDARD_WEATHER_CARD_ID_SET = new Set<WeatherCardId>(STANDARD_WEATHER_CARD_IDS);

export function isJokerWeatherCard(cardId: WeatherCardId): cardId is JokerWeatherCardId {
  return cardId === "JOKER_SMALL" || cardId === "JOKER_BIG";
}

export function getWeatherCardTriggerType(cardId: WeatherCardId): WeatherCardTriggerType {
  if (isJokerWeatherCard(cardId)) {
    return "majorDisaster";
  }

  return cardId.endsWith("_A") ? "specialWeather" : "weather";
}

export function isStandardWeatherCardId(value: string): value is WeatherCardId {
  return STANDARD_WEATHER_CARD_ID_SET.has(value as WeatherCardId);
}
