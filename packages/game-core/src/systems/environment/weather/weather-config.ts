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

type WeatherCardSuitValue = (typeof WEATHER_CARD_SUITS)[number];
type WeatherCardRankValue = (typeof WEATHER_CARD_RANKS)[number];
type SuitedWeatherCardConfig = {
  readonly cardId: `${WeatherCardSuitValue}_${WeatherCardRankValue}`;
  readonly suit: WeatherCardSuitValue;
  readonly rank: WeatherCardRankValue;
  readonly joker: null;
};
type JokerWeatherCardConfig = {
  readonly cardId: "JOKER_SMALL" | "JOKER_BIG";
  readonly suit: null;
  readonly rank: "JOKER";
  readonly joker: "SMALL" | "BIG";
};
type WeatherCardConfig = SuitedWeatherCardConfig | JokerWeatherCardConfig;

export const STANDARD_WEATHER_CARDS: readonly WeatherCardConfig[] = [
  ...WEATHER_CARD_SUITS.flatMap((suit) =>
    WEATHER_CARD_RANKS.map((rank): SuitedWeatherCardConfig => ({
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

export const STANDARD_WEATHER_CARD_IDS = STANDARD_WEATHER_CARDS.map((card) => card.cardId);

export const WEATHER_DECK_VERSION = "standard-54-v1" as const;
export const WEATHER_DECK_SCOPE_ID = "weather-deck";
