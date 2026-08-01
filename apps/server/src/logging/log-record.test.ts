import { describe, expect, it } from "vitest";

import type { GameId, PlayerId } from "@genesis-rift/shared";

import { LogRecordFactory } from "./log-record.ts";

describe("LogRecordFactory", () => {
  it("creates ordered records with deterministic timestamps", () => {
    const factory = new LogRecordFactory({ now: () => 1_786_000_000_021 });
    const input = {
      level: "INFO" as const,
      target: {
        kind: "player" as const,
        playerId: "player-1" as PlayerId,
        displayName: "Runze",
      },
      action: "Battle" as const,
      module: "BattleService",
      message: "Player attacked Goblin.",
      gameId: "game-1" as GameId,
      context: { damage: 25 },
    };

    const first = factory.create(input);
    const second = factory.create(input);

    expect(first).toMatchObject({
      timestampMs: 1_786_000_000_021,
      sequence: 1,
      gameId: "game-1",
      context: { damage: 25 },
    });
    expect(second.sequence).toBe(2);
  });

  it("supports continuing from an existing sequence", () => {
    const factory = new LogRecordFactory({ now: () => 1, initialSequence: 41 });

    const record = factory.create({
      level: "INFO",
      target: { kind: "system" },
      action: "System",
      module: "GameServer",
      message: "Game started successfully.",
    });

    expect(record.sequence).toBe(42);
    expect(record.gameId).toBeNull();
    expect(record.context).toEqual({});
  });

  it("rejects unsafe sequence and timestamp values", () => {
    expect(() => new LogRecordFactory({ initialSequence: -1 })).toThrow(RangeError);

    const factory = new LogRecordFactory({ now: () => Number.NaN });
    expect(() =>
      factory.create({
        level: "ERROR",
        target: { kind: "system" },
        action: "System",
        module: "GameServer",
        message: "Game startup failed.",
      }),
    ).toThrow(RangeError);
  });
});
