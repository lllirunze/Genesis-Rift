import type { RandomStream } from "../../random/core/random-stream.ts";
import { drawRecoveryWeatherCard, drawWeatherCard, type WeatherDeckState } from "./weather-deck.ts";
import type {
  WeatherCardMappingCatalog,
  WeatherDefinitionCatalog,
  WeatherDisasterDefinitionCatalog,
} from "./weather-definition.ts";
import { shouldDrawScheduledWeather } from "./weather-schedule.ts";
import {
  applyWeather,
  startWeatherDisaster,
  type WeatherRuntimeState,
} from "./weather-runtime-state.ts";

/** 描述轮次开始时天气系统可能产生的标准结果。 */
export type WeatherRoundSettlementOutcome =
  | "NOT_SCHEDULED"
  | "PAUSED_BY_DISASTER"
  | "WEATHER_STARTED"
  | "DISASTER_STARTED"
  | "RECOVERY_WEATHER_STARTED";

/** 描述天气轮次结算所需的确定性实例编号来源。 */
export interface SettleWeatherRoundInput {
  readonly round: number;
  readonly createWeatherInstanceId: (cardId: string, round: number) => string;
  readonly resolveScopeTargetId: (weatherId: string, round: number) => string | null;
}

/** 描述天气轮次开始结算后牌组与天气运行时状态的共同变化。 */
export interface SettleWeatherRoundResult {
  readonly outcome: WeatherRoundSettlementOutcome;
  readonly deck: WeatherDeckState;
  readonly weather: WeatherRuntimeState;
  readonly cardId: string | null;
  readonly weatherId: string | null;
}

/**
 * 方法名：settleWeatherAtRoundStart
 * 作用：在完整轮次开始时处理灾害暂停、灾后恢复或奇数轮天气抽取。
 * @param deck 当前54张天气牌组状态。
 * @param weather 当前天气运行时状态。
 * @param randomStream 天气模块专用随机流。
 * @param mappings 牌面到天气或灾害资源的映射。
 * @param weatherCatalog 普通、极端与特殊天气注册表。
 * @param disasterCatalog 重大气候灾害注册表。
 * @param input 当前轮次及确定性实例编号、范围目标解析入口。
 * @returns 最新牌组、天气状态与本轮结算结果。
 */
export function settleWeatherAtRoundStart(
  deck: WeatherDeckState,
  weather: WeatherRuntimeState,
  randomStream: RandomStream,
  mappings: WeatherCardMappingCatalog,
  weatherCatalog: WeatherDefinitionCatalog,
  disasterCatalog: WeatherDisasterDefinitionCatalog,
  input: SettleWeatherRoundInput,
): SettleWeatherRoundResult {
  if (!Number.isSafeInteger(input.round) || input.round <= 0) {
    throw new RangeError("round must be a positive safe integer");
  }

  if (weather.activeDisaster !== null) {
    return createResult("PAUSED_BY_DISASTER", deck, weather, null, null);
  }

  const isRecovery = weather.requiresRecoveryDraw;

  if (!isRecovery && !shouldDrawScheduledWeather(input.round, false)) {
    return createResult("NOT_SCHEDULED", deck, weather, null, null);
  }

  const draw = isRecovery
    ? drawRecoveryWeatherCard(deck, randomStream)
    : drawWeatherCard(deck, randomStream);
  const mapping = mappings[draw.cardId];

  if (mapping === undefined) {
    throw new Error(`Weather card has no configured mapping: ${draw.cardId}`);
  }

  const instanceId = input.createWeatherInstanceId(draw.cardId, input.round);

  if (mapping.kind === "DISASTER") {
    const definition = disasterCatalog[mapping.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown weather disaster mapping: ${mapping.weatherId}`);
    }

    return createResult(
      "DISASTER_STARTED",
      draw.state,
      startWeatherDisaster(weather, definition, {
        instanceId,
        sourceType: "CARD",
        sourceId: draw.cardId,
        startedRound: input.round,
        scopeTargetId: input.resolveScopeTargetId(mapping.weatherId, input.round),
      }),
      draw.cardId,
      mapping.weatherId,
    );
  }

  const definition = weatherCatalog[mapping.weatherId];

  if (definition === undefined) {
    throw new Error(`Unknown weather mapping: ${mapping.weatherId}`);
  }

  return createResult(
    isRecovery ? "RECOVERY_WEATHER_STARTED" : "WEATHER_STARTED",
    draw.state,
    applyWeather(weather, definition, {
      instanceId,
      sourceType: "CARD",
      sourceId: draw.cardId,
      startedRound: input.round,
      scopeTargetId: input.resolveScopeTargetId(mapping.weatherId, input.round),
      completesRecoveryDraw: isRecovery,
    }),
    draw.cardId,
    mapping.weatherId,
  );
}

/** 创建冻结后的统一天气轮次结算结果。 */
function createResult(
  outcome: WeatherRoundSettlementOutcome,
  deck: WeatherDeckState,
  weather: WeatherRuntimeState,
  cardId: string | null,
  weatherId: string | null,
): SettleWeatherRoundResult {
  return Object.freeze({ outcome, deck, weather, cardId, weatherId });
}
