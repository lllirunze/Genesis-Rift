import type { RandomStream } from "../random/core/random-stream.ts";

import { advanceDayNightRound } from "./day-night/advance-day-night-round.ts";
import {
  createEnvironmentRuntimeState,
  getEnvironmentPublicView,
  type EnvironmentPublicView,
  type EnvironmentRuntimeState,
} from "./environment-runtime-state.ts";
import {
  settleWeatherAtRoundStart,
  type SettleWeatherRoundResult,
} from "./weather/settle-weather-round.ts";
import type {
  WeatherCardMappingCatalog,
  WeatherDefinitionCatalog,
  WeatherDisasterDefinitionCatalog,
} from "./weather/weather-definition.ts";
import {
  advanceWeatherRuntimeAtRoundEnd,
  validateWeatherRuntimeState,
  type AdvanceWeatherRuntimeResult,
} from "./weather/weather-runtime-state.ts";

/** 描述环境轮次开始时处理天气抽取所需的静态资源与确定性入口。 */
export interface SettleEnvironmentRoundStartInput {
  readonly state: EnvironmentRuntimeState;
  readonly randomStream: RandomStream;
  readonly weatherMappings: WeatherCardMappingCatalog;
  readonly weatherDefinitions: WeatherDefinitionCatalog;
  readonly weatherDisasterDefinitions: WeatherDisasterDefinitionCatalog;
  readonly createWeatherInstanceId: (cardId: string, round: number) => string;
  readonly resolveWeatherScopeTargetId: (weatherId: string, round: number) => string | null;
}

/** 描述完整轮次结束后自动进入下一轮所需的环境结算输入。 */
export interface AdvanceEnvironmentRoundInput extends SettleEnvironmentRoundStartInput {}

/** 描述轮次开始天气抽取后的统一环境状态与公开结果。 */
export interface EnvironmentRoundStartResult {
  readonly state: EnvironmentRuntimeState;
  readonly weatherSettlement: SettleWeatherRoundResult;
  readonly publicView: EnvironmentPublicView;
}

/** 描述完整轮次结束并进入下一轮后的昼夜、天气和公共环境变化。 */
export interface AdvanceEnvironmentRoundResult extends EnvironmentRoundStartResult {
  readonly completedRound: number;
  readonly weatherAdvance: AdvanceWeatherRuntimeResult;
  readonly dayNightPeriodChanged: boolean;
}

/**
 * 方法名：settleEnvironmentAtRoundStart
 * 作用：在当前完整轮次开始时，按天气牌、灾害和恢复规则处理天气，并公布统一环境状态。
 * @param input 当前环境状态、天气资源、随机流和确定性实例标识入口。
 * @returns 天气开始结算后的统一环境状态、天气结果和公开环境视图。
 * @throws 昼夜轮次与天气状态非法，或天气映射与静态资源不一致时抛出错误。
 */
export function settleEnvironmentAtRoundStart(
  input: SettleEnvironmentRoundStartInput,
): EnvironmentRoundStartResult {
  validateWeatherRuntimeState(
    input.state.weather,
    input.weatherDefinitions,
    input.weatherDisasterDefinitions,
  );
  const currentRound = input.state.dayNight.currentRound;
  const weatherSettlement = settleWeatherAtRoundStart(
    input.state.weatherDeck,
    input.state.weather,
    input.randomStream,
    input.weatherMappings,
    input.weatherDefinitions,
    input.weatherDisasterDefinitions,
    {
      round: currentRound,
      createWeatherInstanceId: input.createWeatherInstanceId,
      resolveScopeTargetId: input.resolveWeatherScopeTargetId,
    },
  );
  const state = createEnvironmentRuntimeState(
    weatherSettlement.deck,
    weatherSettlement.weather,
    input.state.dayNight,
  );

  return Object.freeze({
    state,
    weatherSettlement,
    publicView: getEnvironmentPublicView(state),
  });
}

/**
 * 方法名：advanceEnvironmentRound
 * 作用：在完整轮次边界先推进当前天气持续时间，再进入下一轮并结算昼夜和新轮次天气。
 * @param input 当前环境状态、天气资源、随机流和确定性实例标识入口。
 * @returns 下一完整轮次的环境状态、天气推进与抽取结果及公开环境视图。
 * @throws 当前天气轮次已重复推进、静态资源非法或天气抽取无法结算时抛出错误。
 */
export function advanceEnvironmentRound(
  input: AdvanceEnvironmentRoundInput,
): AdvanceEnvironmentRoundResult {
  validateWeatherRuntimeState(
    input.state.weather,
    input.weatherDefinitions,
    input.weatherDisasterDefinitions,
  );
  const completedRound = input.state.dayNight.currentRound;
  const weatherAdvance = advanceWeatherRuntimeAtRoundEnd(
    input.state.weather,
    input.weatherDisasterDefinitions,
    completedRound,
  );
  const dayNightAdvance = advanceDayNightRound(input.state.dayNight);
  const startResult = settleEnvironmentAtRoundStart({
    ...input,
    state: createEnvironmentRuntimeState(
      input.state.weatherDeck,
      weatherAdvance.state,
      dayNightAdvance.state,
    ),
  });

  return Object.freeze({
    ...startResult,
    completedRound,
    weatherAdvance,
    dayNightPeriodChanged: dayNightAdvance.periodChanged,
  });
}
