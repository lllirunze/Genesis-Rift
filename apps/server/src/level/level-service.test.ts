import { describe, expect, it } from "vitest";

import { createCharacter, type CharacterState } from "@genesis-rift/game-core";
import { LEVEL_SYSTEM_CONFIG } from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { LevelService } from "./level-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

const IDENTITY = {
  id: "identity.mage",
  initialPrimaryAttributes: {
    strength: 4,
    constitution: 4,
    spirit: 7,
    agility: 4,
    insight: 6,
  },
} as const;

const RACE = {
  id: "race.human",
  initialPrimaryAttributeOffset: {
    strength: 0,
    constitution: 0,
    spirit: 0,
    agility: 0,
    insight: 0,
  },
} as const;

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  /**
   * 方法名：write
   * 作用：按指定等级和格式记录日志。
   * @param line 方法所需的 line 参数。
   * @returns 本次处理得到的结果。
   */
  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  async close(): Promise<void> {}
}

/**
 * 方法名：createFixture
 * 作用：创建并校验该方法所负责的业务对象。
 * @param character 方法所需的 character 参数。
 * @returns 本次处理得到的结果。
 */
function createFixture(character: CharacterState = createTestCharacter()): {
  character: CharacterState;
  logger: Logger;
  service: LevelService;
  writer: MemoryLogWriter;
} {
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return {
    character,
    logger,
    service: new LevelService(LEVEL_SYSTEM_CONFIG, logger),
    writer,
  };
}

describe("LevelService", () => {
  it("grants experience and records when the character becomes eligible", async () => {
    const { character, logger, service, writer } = createFixture();

    const result = service.grantExperience({
      character,
      playerName: "Runze",
      amount: 20,
      source: "event.abandoned-camp",
    });
    await logger.flush();

    expect(result.character.levelProgression).toEqual({ currentLevel: 1, currentExperience: 20 });
    expect(result.becameEligible).toBe(true);
    expect(result.eligibility).toMatchObject({ canLevelUp: true, targetLevel: 2 });
    expect(character.levelProgression.currentExperience).toBe(0);
    expect(writer.lines).toHaveLength(2);
    expect(writer.lines[0]).toContain("Player gained 20 experience.");
    expect(writer.lines[1]).toContain("Player became eligible to reach level 2.");
  });

  it("levels up once, preserves surplus experience, and allocates configured points", async () => {
    const baseFixture = createFixture();
    const experienced = baseFixture.service.grantExperience({
      character: baseFixture.character,
      playerName: "Runze",
      amount: 50,
      source: "boss.world-tree-guardian",
    }).character;
    await baseFixture.logger.flush();

    const { logger, service, writer } = createFixture(experienced);
    const result = service.attemptLevelUp({
      character: experienced,
      playerName: "Runze",
      allocation: { spirit: 1 },
    });
    await logger.flush();

    expect(result.leveledUp).toBe(true);
    if (!result.leveledUp) {
      throw new Error("Expected level up to succeed");
    }
    expect(result.character.levelProgression).toEqual({ currentLevel: 2, currentExperience: 30 });
    expect(result.character.currentPrimaryAttributes.spirit).toBe(8);
    expect(result.attributePointsAllocated).toBe(1);
    expect(experienced.currentPrimaryAttributes.spirit).toBe(7);
    expect(writer.lines).toHaveLength(2);
    expect(writer.lines[0]).toContain("Player reached level 2.");
    expect(writer.lines[1]).toContain("Player allocated 1 primary attribute point.");
  });

  it("returns a blocked result when experience is insufficient", async () => {
    const { character, logger, service, writer } = createFixture();

    const result = service.attemptLevelUp({
      character,
      playerName: "Runze",
      allocation: { spirit: 1 },
    });
    await logger.flush();

    expect(result).toMatchObject({
      leveledUp: false,
      character,
      reason: "insufficient-experience",
      missingExperience: 20,
    });
    expect(writer.lines).toHaveLength(1);
    expect(writer.lines[0]).toContain("[WARN ]");
    expect(writer.lines[0]).toContain("Player could not level up");
  });

  it("returns a blocked result when the character has reached maximum level", async () => {
    const character = createCharacter({
      playerId: PLAYER_ID,
      identity: IDENTITY,
      race: RACE,
      levelProgression: { currentLevel: 10, currentExperience: 100 },
    });
    const { logger, service, writer } = createFixture(character);

    const result = service.attemptLevelUp({
      character,
      playerName: "Runze",
      allocation: {},
    });
    await logger.flush();

    expect(result).toMatchObject({
      leveledUp: false,
      reason: "maximum-level-reached",
      missingExperience: 0,
    });
    expect(writer.lines[0]).toContain("maximum-level-reached");
  });

  it("records invalid experience and allocation failures without changing the character", async () => {
    const { character, logger, service, writer } = createFixture();

    expect(() =>
      service.grantExperience({
        character,
        playerName: "Runze",
        amount: -1,
        source: "invalid.test",
      }),
    ).toThrow(TypeError);

    const experienced = service.grantExperience({
      character,
      playerName: "Runze",
      amount: 20,
      source: "event.test",
    }).character;
    expect(() =>
      service.attemptLevelUp({
        character: experienced,
        playerName: "Runze",
        allocation: { spirit: 2 },
      }),
    ).toThrow(RangeError);
    await logger.flush();

    expect(character.levelProgression.currentExperience).toBe(0);
    expect(experienced.currentPrimaryAttributes.spirit).toBe(7);
    expect(writer.lines.filter((line) => line.includes("[ERROR]"))).toHaveLength(2);
    expect(writer.lines.some((line) => line.includes("Experience grant failed."))).toBe(true);
    expect(writer.lines.some((line) => line.includes("Character level up failed."))).toBe(true);
  });
});

/**
 * 方法名：createTestCharacter
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createTestCharacter(): CharacterState {
  return createCharacter({
    playerId: PLAYER_ID,
    identity: IDENTITY,
    race: RACE,
  });
}
