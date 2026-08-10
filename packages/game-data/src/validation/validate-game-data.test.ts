import { describe, expect, it } from "vitest";

import { validateGameData } from "./validate-game-data.ts";

describe("validateGameData", () => {
  it("accepts all production static resource catalogs", () => {
    expect(() => validateGameData()).not.toThrow();
  });
});
