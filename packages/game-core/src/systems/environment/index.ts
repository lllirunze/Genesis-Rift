import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./weather/weather-config.ts";
export * from "./day-night/day-night-config.ts";
export * from "./day-night/day-night-definition.ts";
export * from "./day-night/day-night-runtime-state.ts";
export * from "./day-night/advance-day-night-round.ts";
export * from "./weather/day-night.ts";
export * from "./weather/weather-card.ts";
export * from "./weather/weather-deck.ts";
export * from "./weather/weather-definition.ts";
export * from "./weather/weather-effect-config.ts";
export * from "./weather/weather-effect-definition.ts";
export * from "./weather/weather-runtime-state.ts";
export * from "./weather/resolve-active-weather-effects.ts";
export * from "./weather/settle-weather-round.ts";
export * from "./weather/weather-schedule.ts";

/** 当前模块对外公开的只读配置值。 */
export const environmentSystem: SystemScaffold<"environment"> = {
  name: "environment",
  status: "scaffold",
};
