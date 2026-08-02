import { describe, expect, it } from "vitest";

import { Logger } from "./logger.ts";
import { LogRecordFactory } from "./log-record.ts";
import type { LogWriter } from "./log-writer.ts";

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];
  closed = false;

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
  async close(): Promise<void> {
    this.closed = true;
  }
}

describe("Logger", () => {
  it("provides reusable level methods and preserves queue order", async () => {
    const writer = new MemoryLogWriter();
    const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
    const logger = new Logger({
      writer,
      recordFactory: new LogRecordFactory({ now: () => timestamp }),
    });

    logger.info({
      action: "System",
      module: "GameServer",
      message: "Game started successfully.",
    });
    logger.warn({
      action: "System",
      module: "GameServer",
      message: "Game is using a fallback setting.",
    });
    await logger.flush();

    expect(writer.lines).toEqual([
      "[2026-08-01 12:30:15.021][INFO ][-------][System  ][GameServer] Game started successfully.",
      "[2026-08-01 12:30:15.021][WARN ][-------][System  ][GameServer] Game is using a fallback setting.",
    ]);
  });

  it("uses the internal fallback without rejecting business execution", async () => {
    const failures: string[] = [];
    const writer: LogWriter = {
      write: async () => Promise.reject(new Error("Disk unavailable")),
      close: async () => {},
    };
    const logger = new Logger({ writer, fallback: (message) => failures.push(message) });

    expect(() =>
      logger.error({
        action: "System",
        module: "GameServer",
        message: "Game startup failed.",
      }),
    ).not.toThrow();
    await logger.flush();

    expect(failures).toEqual(["Failed to write log message."]);
  });

  it("closes the writer after queued entries have completed", async () => {
    const writer = new MemoryLogWriter();
    const logger = new Logger({ writer });

    logger.debug({
      action: "Random",
      module: "RandomService",
      message: "Generated random value 87.",
    });
    await logger.close();

    expect(writer.lines).toHaveLength(1);
    expect(writer.closed).toBe(true);
  });
});
