import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./execute-skill-effects.ts";
export * from "./effect-handlers/core-effect-handler-registry.ts";
export * from "./effect-handlers/core-skill-effect-handlers.ts";
export * from "./skill-config.ts";
export * from "./skill-definition.ts";
export * from "./skill-effect-handler.ts";
export * from "./skill-eligibility.ts";
export * from "./skill-runtime-state.ts";
export * from "./trigger-skill-effects.ts";
export * from "./use-active-skill.ts";

/** 当前模块对外公开的只读系统骨架。 */
export const skillSystem: SystemScaffold<"skill"> = {
  name: "skill",
  status: "scaffold",
};
