import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./revival-config.ts";
export * from "./complete-reincarnation.ts";
export * from "./complete-mid-game-join.ts";
export * from "./create-death-relic-from-death.ts";
export * from "./create-death-relic-in-runtime.ts";
export * from "./advance-death-relic-duration.ts";
export * from "./death-coin-loss.ts";
export * from "./death-relic-inspection.ts";
export * from "./death-relic-runtime-state.ts";
export * from "./death-relic-state.ts";
export * from "./pick-death-relic-content.ts";
export * from "./pick-death-relic-from-runtime.ts";
export * from "./reincarnation-roll.ts";
export * from "./reincarnation-protection.ts";
export * from "./reincarnation-recovery.ts";
export * from "./reincarnation-spawn.ts";
export * from "./soul-state.ts";
export * from "./settle-death-coin-loss.ts";

/** 当前模块对外公开的只读配置值。 */
export const revivalSystem: SystemScaffold<"revival"> = {
  name: "revival",
  status: "scaffold",
};
