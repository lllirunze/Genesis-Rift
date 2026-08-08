import { describe, expect, it } from "vitest";

import { assertResourceId, isResourceId, isResourceIdForPrefix } from "./resource-id.ts";

describe("resource id", () => {
  it("accepts registered prefixes with six-digit non-zero numbers", () => {
    expect(isResourceId("event_000001")).toBe(true);
    expect(isResourceId("equip_999999")).toBe(true);
    expect(isResourceIdForPrefix("card_000025", "card")).toBe(true);
  });

  it("rejects malformed, reserved, and unsupported ids", () => {
    expect(isResourceId("event_1")).toBe(false);
    expect(isResourceId("event_000000")).toBe(false);
    expect(isResourceId("unknown_000001")).toBe(false);
  });

  it("rejects a valid resource id with the wrong expected prefix", () => {
    expect(() => assertResourceId("item_000001", "equip")).toThrow(
      "Resource id must use equip prefix",
    );
  });
});
