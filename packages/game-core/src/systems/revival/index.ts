import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./revival-config.ts";
export * from "./complete-reincarnation.ts";
export * from "./reincarnation-roll.ts";
export * from "./reincarnation-protection.ts";
export * from "./reincarnation-recovery.ts";
export * from "./reincarnation-spawn.ts";
export * from "./soul-state.ts";

/** 当前模块对外公开的只读配置值。 */
export const revivalSystem: SystemScaffold<"revival"> = {
  name: "revival",
  status: "scaffold",
};
