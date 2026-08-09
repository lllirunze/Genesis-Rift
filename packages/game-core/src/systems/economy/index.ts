import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./coin.ts";
export * from "./player-trade-state.ts";
export * from "./purchase-item-with-coin.ts";
export * from "./settle-player-trade.ts";

/** 当前模块对外公开的只读配置值。 */
export const economySystem: SystemScaffold<"economy"> = {
  name: "economy",
  status: "scaffold",
};
