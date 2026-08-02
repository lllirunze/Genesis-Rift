import type { SystemScaffold } from "../system-scaffold.ts";

/** 当前模块对外公开的只读配置值。 */
export const eventSystem: SystemScaffold<"event"> = {
  name: "event",
  status: "scaffold",
};
