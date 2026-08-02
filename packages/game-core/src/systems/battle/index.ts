import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./status/index.ts";

/** 当前模块对外公开的只读配置值。 */
export const battleSystem: SystemScaffold<"battle"> = {
  name: "battle",
  status: "scaffold",
};
