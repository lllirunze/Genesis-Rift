import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./core/random-manager.ts";
export * from "./core/random-seed.ts";
export * from "./core/random-stream.ts";
export * from "./core/random-stream-type.ts";
export * from "./core/seed-deriver.ts";
export * from "./service/dice.ts";

export const randomSystem: SystemScaffold<"random"> = {
  name: "random",
  status: "scaffold",
};
