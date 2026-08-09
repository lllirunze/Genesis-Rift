import { describe, expect, it } from "vitest";

import { isIpWhitelisted, normalizeRemoteIpAddress } from "./ip-whitelist.ts";

describe("IP whitelist", () => {
  it("normalizes IPv4-mapped IPv6 addresses before exact matching", () => {
    expect(normalizeRemoteIpAddress("::ffff:192.168.1.25")).toBe("192.168.1.25");
    expect(isIpWhitelisted("::ffff:192.168.1.25", ["192.168.1.25"])).toBe(true);
  });

  it("rejects addresses that are absent, malformed, or not explicitly listed", () => {
    expect(isIpWhitelisted(undefined, ["192.168.1.25"])).toBe(false);
    expect(isIpWhitelisted("invalid-address", ["192.168.1.25"])).toBe(false);
    expect(isIpWhitelisted("192.168.1.26", ["192.168.1.25"])).toBe(false);
  });
});
