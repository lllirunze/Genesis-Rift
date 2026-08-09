import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./contract-config.ts";
export * from "./contract-definition.ts";
export * from "./contract-runtime-state.ts";
export * from "./select-contract-offer.ts";

/** 当前模块对外公开的只读配置值。 */
export const contractSystem: SystemScaffold<"contract"> = {
  name: "contract",
  status: "scaffold",
};
