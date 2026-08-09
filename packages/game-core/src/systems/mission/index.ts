import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./mission-config.ts";
export * from "./mission-definition.ts";
export * from "./mission-reforge-state.ts";
export * from "./reforge-mission.ts";
export * from "./mission-candidate-selection.ts";
export * from "./generate-mission-set.ts";
export * from "./player-mission-state.ts";
export * from "./replace-infeasible-mission.ts";
export * from "./select-mission-candidate.ts";

/** 当前模块对外公开的只读配置值。 */
export const missionSystem: SystemScaffold<"mission"> = {
  name: "mission",
  status: "scaffold",
};
