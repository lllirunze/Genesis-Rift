import type { SystemScaffold } from "../system-scaffold.ts";

/** 当前模块对外公开的只读配置值。 */
export const missionSystem: SystemScaffold<"mission"> = {
  name: "mission",
  status: "scaffold",
};
