import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { formatLogRecord, formatLogTimestamp } from "./log-formatter.ts";
import type { LogRecord } from "./log-record.ts";

function createRecord(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    timestampMs: new Date(2026, 7, 1, 12, 30, 15, 21).getTime(),
    sequence: 1,
    gameId: null,
    level: "INFO",
    target: {
      kind: "player",
      playerId: "player-1" as PlayerId,
      displayName: "Runze",
    },
    action: "Battle",
    module: "BattleService",
    message: "Player attacked Goblin and dealt 25 damage.",
    context: {},
    ...overrides,
  };
}

describe("formatLogTimestamp", () => {
  it("uses local time with millisecond precision", () => {
    const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();

    expect(formatLogTimestamp(timestamp)).toBe("2026-08-01 12:30:15.021");
  });

  it("rejects invalid timestamps", () => {
    expect(() => formatLogTimestamp(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatLogRecord", () => {
  it("produces the canonical fixed-width log line", () => {
    expect(formatLogRecord(createRecord())).toBe(
      "[2026-08-01 12:30:15.021][INFO ][Runze  ][Battle  ][BattleService] Player attacked Goblin and dealt 25 damage.",
    );
  });

  it("formats system logs without a player target", () => {
    expect(
      formatLogRecord(
        createRecord({
          level: "DEBUG",
          target: { kind: "system" },
          action: "Random",
          module: "RandomService",
          message: "Generated random value 87.",
        }),
      ),
    ).toBe(
      "[2026-08-01 12:30:15.021][DEBUG][-------][Random  ][RandomService] Generated random value 87.",
    );
  });

  it("rejects fields containing brackets or line breaks", () => {
    expect(() => formatLogRecord(createRecord({ module: "Bad]Module" }))).toThrow(TypeError);
    expect(() => formatLogRecord(createRecord({ message: "First line.\nSecond line." }))).toThrow(
      TypeError,
    );
  });
});
