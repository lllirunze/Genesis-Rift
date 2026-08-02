import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./weather/weather-config.ts";
export * from "./weather/weather-card.ts";
export * from "./weather/weather-deck.ts";
export * from "./weather/weather-schedule.ts";

/** 当前模块对外公开的只读配置值。 */
export const environmentSystem: SystemScaffold<"environment"> = {
  name: "environment",
  status: "scaffold",
};
