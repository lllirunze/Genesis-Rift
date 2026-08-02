import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./core/random-manager.ts";
export * from "./core/random-config.ts";
export * from "./core/random-seed.ts";
export * from "./core/random-stream.ts";
export * from "./core/random-stream-type.ts";
export * from "./core/seed-deriver.ts";
export * from "./model/weighted-item.ts";
export * from "./policy/probability-policy.ts";
export * from "./policy/random-selection-policy.ts";
export * from "./policy/weighted-random-policy.ts";
export * from "./service/dice.ts";

/** 当前模块对外公开的只读配置值。 */
export const randomSystem: SystemScaffold<"random"> = {
  name: "random",
  status: "scaffold",
};
