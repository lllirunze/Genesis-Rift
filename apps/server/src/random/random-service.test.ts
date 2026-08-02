import { describe, expect, it } from "vitest";

import { createMasterSeed, RandomManager } from "@genesis-rift/game-core";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { RandomService } from "./random-service.ts";

const MASTER_SEED_TEXT = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

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
 * @returns 本次处理得到的结果。
 */
function createFixture(): {
  manager: RandomManager;
  logger: Logger;
  service: RandomService;
  writer: MemoryLogWriter;
} {
  const manager = RandomManager.create(createMasterSeed(MASTER_SEED_TEXT));
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return { manager, logger, service: new RandomService(manager, logger), writer };
}

describe("RandomService", () => {
  it("records integer and dice results without exposing the master seed", async () => {
    const { logger, service, writer } = createFixture();

    const integer = service.nextInt({
      streamType: "loot",
      scopeId: "chest-1",
      minInclusive: 10,
      maxExclusive: 20,
      purpose: "Determine chest coin reward",
    });
    const d6 = service.rollD6({
      streamType: "combat",
      scopeId: "battle-1",
      purpose: "Resolve combat die roll",
    });
    const d20 = service.rollD20({
      streamType: "reincarnation",
      scopeId: "player-1",
      purpose: "Resolve reincarnation attempt",
    });
    await logger.flush();

    expect(integer).toBeGreaterThanOrEqual(10);
    expect(integer).toBeLessThan(20);
    expect(d6).toBeGreaterThanOrEqual(1);
    expect(d6).toBeLessThanOrEqual(6);
    expect(d20).toBeGreaterThanOrEqual(1);
    expect(d20).toBeLessThanOrEqual(20);
    expect(writer.lines[0]).toContain(`Generated integer random value ${integer}.`);
    expect(writer.lines[1]).toContain(`Rolled D6 with result ${d6}.`);
    expect(writer.lines[2]).toContain(`Rolled D20 with result ${d20}.`);
    expect(writer.lines.join("\n")).not.toContain(MASTER_SEED_TEXT);
  });

  it("creates and draws from the reproducible 54-card weather deck", async () => {
    const { manager, logger, service, writer } = createFixture();

    const deck = service.createWeatherDeck({ purpose: "Initialize weather deck" });
    const draw = service.drawWeatherCard(deck, { purpose: "Resolve next weather card" });
    await logger.flush();

    expect(deck.drawPile).toHaveLength(54);
    expect(draw.cardId).toBe("CLUB_9");
    expect(draw.state.drawCount).toBe(1);
    expect(manager.getStream("weather", "weather-deck").exportState().callCount).toBe(53);
    expect(writer.lines[0]).toContain("Weather deck was shuffled successfully.");
    expect(writer.lines[1]).toContain("Weather deck drew card CLUB_9.");
  });

  it("records failed operations and preserves the original business error", async () => {
    const { logger, service, writer } = createFixture();

    expect(() =>
      service.nextInt({
        streamType: "event",
        minInclusive: 5,
        maxExclusive: 5,
        purpose: "Resolve invalid test range",
      }),
    ).toThrow(RangeError);
    await logger.flush();

    expect(writer.lines).toHaveLength(1);
    expect(writer.lines[0]).toContain("[ERROR]");
    expect(writer.lines[0]).toContain("Random operation nextInt failed.");
  });
});
