import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./quest-config.ts";
export * from "./quest-condition.ts";
export * from "./quest-core-reward-handlers.ts";
export * from "./quest-definition.ts";
export * from "./quest-offer-adapter.ts";
export * from "./quest-progress-adapter.ts";
export * from "./quest-reward-dispatch.ts";
export * from "./quest-reward-pool.ts";
export * from "./quest-runtime-state.ts";

/** 当前模块对外公开的只读配置值。 */
export const questSystem: SystemScaffold<"quest"> = {
  name: "quest",
  status: "scaffold",
};
