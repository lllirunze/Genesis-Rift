import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./collect-event-pool-candidates.ts";
export * from "./event-config.ts";
export * from "./event-condition-config.ts";
export * from "./event-condition-definition.ts";
export * from "./event-definition.ts";
export * from "./event-duration-config.ts";
export * from "./event-duration-definition.ts";
export * from "./event-effect-config.ts";
export * from "./event-effect-definition.ts";
export * from "./event-pool-definition.ts";
export * from "./event-resolution-definition.ts";
export * from "./event-runtime-config.ts";
export * from "./event-instance.ts";
export * from "./event-reveal.ts";
export * from "./event-view.ts";
export * from "./evaluate-event-condition.ts";
export * from "./select-event-candidate.ts";

/** 当前模块对外公开的只读配置值。 */
export const eventSystem: SystemScaffold<"event"> = {
  name: "event",
  status: "scaffold",
};
