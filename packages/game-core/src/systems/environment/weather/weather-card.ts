import {
  STANDARD_WEATHER_CARD_IDS,
  WEATHER_CARD_RANKS,
  WEATHER_CARD_SUITS,
} from "./weather-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type WeatherCardSuit = (typeof WEATHER_CARD_SUITS)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type WeatherCardRank = (typeof WEATHER_CARD_RANKS)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type SuitedWeatherCardId = `${WeatherCardSuit}_${WeatherCardRank}`;
/** 描述当前模块对外公开的业务数据契约。 */
export type JokerWeatherCardId = "JOKER_SMALL" | "JOKER_BIG";
/** 描述当前模块对外公开的业务数据契约。 */
export type WeatherCardId = SuitedWeatherCardId | JokerWeatherCardId;

/** 描述当前模块对外公开的业务数据契约。 */
export interface SuitedWeatherCard {
  readonly cardId: SuitedWeatherCardId;
  readonly suit: WeatherCardSuit;
  readonly rank: WeatherCardRank;
  readonly joker: null;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface JokerWeatherCard {
  readonly cardId: JokerWeatherCardId;
  readonly suit: null;
  readonly rank: "JOKER";
  readonly joker: "SMALL" | "BIG";
}

/** 描述当前模块对外公开的业务数据契约。 */
export type WeatherCard = SuitedWeatherCard | JokerWeatherCard;
/** 描述当前模块对外公开的业务数据契约。 */
export type WeatherCardTriggerType = "weather" | "specialWeather" | "majorDisaster";

const STANDARD_WEATHER_CARD_ID_SET = new Set<WeatherCardId>(STANDARD_WEATHER_CARD_IDS);

/**
 * 方法名：isJokerWeatherCard
 * 作用：判断输入是否满足当前业务条件。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
export function isJokerWeatherCard(cardId: WeatherCardId): cardId is JokerWeatherCardId {
  return cardId === "JOKER_SMALL" || cardId === "JOKER_BIG";
}

/**
 * 方法名：getWeatherCardTriggerType
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param cardId 方法所需的 cardId 参数。
 * @returns 本次处理得到的结果。
 */
export function getWeatherCardTriggerType(cardId: WeatherCardId): WeatherCardTriggerType {
  if (isJokerWeatherCard(cardId)) {
    return "majorDisaster";
  }

  return cardId.endsWith("_A") ? "specialWeather" : "weather";
}

/**
 * 方法名：isStandardWeatherCardId
 * 作用：判断输入是否满足当前业务条件。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function isStandardWeatherCardId(value: string): value is WeatherCardId {
  return STANDARD_WEATHER_CARD_ID_SET.has(value as WeatherCardId);
}
