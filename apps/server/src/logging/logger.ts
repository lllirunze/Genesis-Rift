import type { GameId } from "@genesis-rift/shared";

import type { LogAction } from "./log-action.ts";
import { LOG_CONFIG } from "./log-config.ts";
import { formatLogRecord } from "./log-formatter.ts";
import type { LogLevel } from "./log-level.ts";
import { LogRecordFactory, SYSTEM_LOG_TARGET, type LogTarget } from "./log-record.ts";
import type { LogWriter } from "./log-writer.ts";

export interface LogEvent {
  readonly action: LogAction;
  readonly module: string;
  readonly message: string;
  readonly target?: LogTarget;
  readonly gameId?: GameId;
  readonly context?: Readonly<Record<string, unknown>>;
}

export type LogFallback = (message: string) => void;

export interface LoggerOptions {
  readonly writer: LogWriter;
  readonly recordFactory?: LogRecordFactory;
  readonly maxPendingEntries?: number;
  readonly fallback?: LogFallback;
}

function defaultFallback(message: string): void {
  console.error(message);
}

export class Logger {
  readonly #writer: LogWriter;
  readonly #recordFactory: LogRecordFactory;
  readonly #maxPendingEntries: number;
  readonly #fallback: LogFallback;
  #tail: Promise<void> = Promise.resolve();
  #pendingEntries = 0;
  #accepting = true;

  constructor(options: LoggerOptions) {
    const maxPendingEntries = options.maxPendingEntries ?? LOG_CONFIG.maxPendingEntries;
    if (!Number.isSafeInteger(maxPendingEntries) || maxPendingEntries <= 0) {
      throw new RangeError("Maximum pending log entries must be a positive safe integer.");
    }

    this.#writer = options.writer;
    this.#recordFactory = options.recordFactory ?? new LogRecordFactory();
    this.#maxPendingEntries = maxPendingEntries;
    this.#fallback = options.fallback ?? defaultFallback;
  }

  trace(event: LogEvent): void {
    this.log("TRACE", event);
  }

  debug(event: LogEvent): void {
    this.log("DEBUG", event);
  }

  info(event: LogEvent): void {
    this.log("INFO", event);
  }

  warn(event: LogEvent): void {
    this.log("WARN", event);
  }

  error(event: LogEvent): void {
    this.log("ERROR", event);
  }

  log(level: LogLevel, event: LogEvent): void {
    if (!this.#accepting || this.#pendingEntries >= this.#maxPendingEntries) {
      this.#fallback("Failed to write log message.");
      return;
    }

    try {
      const record = this.#recordFactory.create({
        level,
        target: event.target ?? SYSTEM_LOG_TARGET,
        action: event.action,
        module: event.module,
        message: event.message,
        ...(event.gameId === undefined ? {} : { gameId: event.gameId }),
        ...(event.context === undefined ? {} : { context: event.context }),
      });
      const line = formatLogRecord(record);

      this.#pendingEntries += 1;
      this.#tail = this.#tail
        .then(() => this.#writer.write(line))
        .catch(() => this.#fallback("Failed to write log message."))
        .finally(() => {
          this.#pendingEntries -= 1;
        });
    } catch {
      this.#fallback("Failed to write log message.");
    }
  }

  async flush(): Promise<void> {
    await this.#tail;
  }

  async close(): Promise<void> {
    if (!this.#accepting) {
      return;
    }

    this.#accepting = false;
    await this.flush();
    try {
      await this.#writer.close();
    } catch {
      this.#fallback("Failed to close log file.");
    }
  }
}
