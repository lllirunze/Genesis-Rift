import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./event-config.ts";
export * from "./event-condition-config.ts";
export * from "./event-condition-definition.ts";
export * from "./event-definition.ts";

/** 当前模块对外公开的只读配置值。 */
export const eventSystem: SystemScaffold<"event"> = {
  name: "event",
  status: "scaffold",
};
