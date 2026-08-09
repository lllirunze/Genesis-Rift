import type { WeatherDeckState } from "./weather/weather-deck.ts";
import type { WeatherRuntimeState } from "./weather/weather-runtime-state.ts";
import {
  createDayNightRuntimeState,
  getDayNightEnvironmentView,
  validateDayNightRuntimeState,
  type DayNightEnvironmentView,
  type DayNightRuntimeState,
} from "./day-night/day-night-runtime-state.ts";

/** 描述昼夜、天气牌库与天气状态共同组成的可持久化世界环境。 */
export interface EnvironmentRuntimeState {
  readonly dayNight: DayNightRuntimeState;
  readonly weatherDeck: WeatherDeckState;
  readonly weather: WeatherRuntimeState;
}

/** 描述可安全公布给地图、事件、NPC 与客户端的当前公共环境信息。 */
export interface EnvironmentPublicView {
  readonly currentRound: number;
  readonly dayNight: DayNightEnvironmentView;
  readonly activeWeatherIds: readonly string[];
  readonly activeDisaster: {
    readonly weatherId: string;
    readonly phase: string;
  } | null;
}

/**
 * 方法名：createEnvironmentRuntimeState
 * 作用：组合初始化后的天气牌库、天气状态和第一轮白天状态，建立独立于玩家回合的世界环境状态。
 * @param weatherDeck 已完成确定性洗牌的天气牌库状态。
 * @param weather 当前天气运行时状态，通常使用空天气状态创建。
 * @param dayNight 当前昼夜状态，默认从第一轮白天开始。
 * @returns 冻结后的统一环境运行时状态。
 * @throws 昼夜状态与其轮次不一致时抛出错误。
 */
export function createEnvironmentRuntimeState(
  weatherDeck: WeatherDeckState,
  weather: WeatherRuntimeState,
  dayNight: DayNightRuntimeState = createDayNightRuntimeState(),
): EnvironmentRuntimeState {
  validateDayNightRuntimeState(dayNight);

  return Object.freeze({ dayNight, weatherDeck, weather });
}

/**
 * 方法名：getEnvironmentPublicView
 * 作用：从统一环境状态生成当前轮次可在玩家行动前公开的昼夜、天气与灾害摘要。
 * @param state 当前统一环境运行时状态。
 * @returns 不含牌库顺序等隐藏数据的冻结公共环境视图。
 * @throws 昼夜状态与其轮次不一致时抛出错误。
 */
export function getEnvironmentPublicView(state: EnvironmentRuntimeState): EnvironmentPublicView {
  validateDayNightRuntimeState(state.dayNight);

  return Object.freeze({
    currentRound: state.dayNight.currentRound,
    dayNight: getDayNightEnvironmentView(state.dayNight),
    activeWeatherIds: Object.freeze(
      state.weather.activeWeathers.map((weather) => weather.weatherId),
    ),
    activeDisaster:
      state.weather.activeDisaster === null
        ? null
        : Object.freeze({
            weatherId: state.weather.activeDisaster.weatherId,
            phase: state.weather.activeDisaster.phase,
          }),
  });
}
