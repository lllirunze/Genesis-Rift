import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./status/index.ts";
export * from "./attack/index.ts";
export * from "./damage/index.ts";
export * from "./critical/index.ts";
export * from "./combat-snapshot.ts";
export * from "./evasion/index.ts";
export * from "./encounter/index.ts";
export * from "./participant/index.ts";
export * from "./survival/index.ts";
export * from "./settlement/index.ts";

/** 当前模块对外公开的只读配置值。 */
export const battleSystem: SystemScaffold<"battle"> = {
  name: "battle",
  status: "scaffold",
};
