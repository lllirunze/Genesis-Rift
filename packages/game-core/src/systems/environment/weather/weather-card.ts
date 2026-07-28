export const WEATHER_CARD_SUITS = ["HEART", "DIAMOND", "CLUB", "SPADE"] as const;
export const WEATHER_CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

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

export const STANDARD_WEATHER_CARDS: readonly WeatherCard[] = [
  ...WEATHER_CARD_SUITS.flatMap((suit) =>
    WEATHER_CARD_RANKS.map((rank): SuitedWeatherCard => ({
      cardId: `${suit}_${rank}`,
      suit,
      rank,
      joker: null,
    })),
  ),
  {
    cardId: "JOKER_SMALL",
    suit: null,
    rank: "JOKER",
    joker: "SMALL",
  },
  {
    cardId: "JOKER_BIG",
    suit: null,
    rank: "JOKER",
    joker: "BIG",
  },
];

export const STANDARD_WEATHER_CARD_IDS: readonly WeatherCardId[] = STANDARD_WEATHER_CARDS.map(
  (card) => card.cardId,
);

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
