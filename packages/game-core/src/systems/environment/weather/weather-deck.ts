import type { RandomStream } from "../../random/core/random-stream.ts";
import { STANDARD_WEATHER_CARD_IDS, WEATHER_DECK_VERSION } from "./weather-config.ts";
import {
  getWeatherCardTriggerType,
  isJokerWeatherCard,
  isStandardWeatherCardId,
  type WeatherCardId,
  type WeatherCardTriggerType,
} from "./weather-card.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface WeatherDeckState {
  readonly version: typeof WEATHER_DECK_VERSION;
  readonly drawPile: readonly WeatherCardId[];
  readonly discardPile: readonly WeatherCardId[];
  readonly activeCardId: WeatherCardId | null;
  readonly drawCount: number;
}

/** 描述业务操作完成后返回的结果。 */
export interface WeatherCardDrawResult {
  readonly cardId: WeatherCardId;
  readonly triggerType: WeatherCardTriggerType;
  readonly state: WeatherDeckState;
  readonly reshuffled: boolean;
  readonly skippedJokerCount: number;
}

/**
 * 方法名：createWeatherDeck
 * 作用：创建并校验该方法所负责的业务对象。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：drawWeatherCard
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param state 当前业务状态。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function drawWeatherCard(
  state: WeatherDeckState,
  randomStream: RandomStream,
): WeatherCardDrawResult {
  return drawCard(state, randomStream, false);
}

/**
 * 方法名：drawRecoveryWeatherCard
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param state 当前业务状态。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 本次处理得到的结果。
 */
export function drawRecoveryWeatherCard(
  state: WeatherDeckState,
  randomStream: RandomStream,
): WeatherCardDrawResult {
  return drawCard(state, randomStream, true);
}

/**
 * 方法名：validateWeatherDeckState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：drawCard
 * 作用：从共享牌库取得指定手牌并更新牌区状态。
 * @param state 当前业务状态。
 * @param randomStream 方法所需的 randomStream 参数。
 * @param skipJokers 方法所需的 skipJokers 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：assertWeatherStream
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param randomStream 方法所需的 randomStream 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertWeatherStream(randomStream: RandomStream): void {
  if (randomStream.streamType !== "weather") {
    throw new TypeError("weather deck requires a weather random stream");
  }
}
