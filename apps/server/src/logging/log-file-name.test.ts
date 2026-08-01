import { describe, expect, it } from "vitest";

import { formatLogArchiveFileName } from "./log-file-name.ts";

describe("formatLogArchiveFileName", () => {
  it("uses the activity file creation time", () => {
    const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();

    expect(formatLogArchiveFileName(timestamp)).toBe("game_20260801_123015_021.log");
  });
});
