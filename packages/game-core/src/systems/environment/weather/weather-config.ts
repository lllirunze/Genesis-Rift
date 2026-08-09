/** 标准扑克牌用于天气抽取的四种花色。 */
export const WEATHER_CARD_SUITS = ["HEART", "DIAMOND", "CLUB", "SPADE"] as const;

/** 每种花色包含的十三种牌面。 */
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

/** 四种花色牌与大小王共同组成的五十四张天气牌。 */
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

/** 供持久化和唯一性校验使用的天气牌编号列表。 */
export const STANDARD_WEATHER_CARD_IDS = STANDARD_WEATHER_CARDS.map((card) => card.cardId);

/** 五十四张标准天气牌配置的兼容版本。 */
export const WEATHER_DECK_VERSION = "standard-54-v1" as const;
/** 天气牌库在随机管理器中的固定随机流作用域。 */
export const WEATHER_DECK_SCOPE_ID = "weather-deck";

/** 普通、极端与特殊天气的配置类别。 */
export const WEATHER_CATEGORIES = ["NORMAL", "EXTREME", "SPECIAL"] as const;

/** 天气状态可以覆盖的标准空间范围。 */
export const WEATHER_SCOPE_TYPES = ["WORLD", "REGION", "TERRAIN", "TARGET_REGION"] as const;

/** 新天气与相同作用范围天气之间的处理规则。 */
export const WEATHER_COEXISTENCE_POLICIES = ["REPLACE", "COEXIST"] as const;

/** 重大气候灾害固定使用的三个阶段。 */
export const WEATHER_DISASTER_PHASES = ["WARNING", "DISASTER", "RECOVERY"] as const;

/** 牌面天气与事件天气默认持续两个完整轮次。 */
export const DEFAULT_WEATHER_DURATION_ROUNDS = 2;
