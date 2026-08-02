import type { GameId } from "@genesis-rift/shared";

import type { LogAction } from "./log-action.ts";
import { LOG_CONFIG } from "./log-config.ts";
import { formatLogRecord } from "./log-formatter.ts";
import type { LogLevel } from "./log-level.ts";
import { SYSTEM_LOG_TARGET } from "./log-config.ts";
import { LogRecordFactory, type LogTarget } from "./log-record.ts";
import type { LogWriter } from "./log-writer.ts";

/** 描述模块之间传递的业务事件。 */
export interface LogEvent {
  readonly action: LogAction;
  readonly module: string;
  readonly message: string;
  readonly target?: LogTarget;
  readonly gameId?: GameId;
  readonly context?: Readonly<Record<string, unknown>>;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type LogFallback = (message: string) => void;

/** 描述调用方可以调整的可选行为参数。 */
export interface LoggerOptions {
  readonly writer: LogWriter;
  readonly recordFactory?: LogRecordFactory;
  readonly maxPendingEntries?: number;
  readonly fallback?: LogFallback;
}

/**
 * 方法名：defaultFallback
 * 作用：执行该方法负责的单一业务操作。
 * @param message 方法所需的 message 参数。
 * @returns 无返回值。
 */
function defaultFallback(message: string): void {
  console.error(message);
}

/** 封装该模块的状态与操作入口。 */
export class Logger {
  readonly #writer: LogWriter;
  readonly #recordFactory: LogRecordFactory;
  readonly #maxPendingEntries: number;
  readonly #fallback: LogFallback;
  #tail: Promise<void> = Promise.resolve();
  #pendingEntries = 0;
  #accepting = true;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param options 控制本次操作行为的可选参数。
   * @returns 无返回值。
   */
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

  /**
   * 方法名：trace
   * 作用：按指定等级和格式记录日志。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
  trace(event: LogEvent): void {
    this.log("TRACE", event);
  }

  /**
   * 方法名：debug
   * 作用：按指定等级和格式记录日志。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
  debug(event: LogEvent): void {
    this.log("DEBUG", event);
  }

  /**
   * 方法名：info
   * 作用：按指定等级和格式记录日志。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
  info(event: LogEvent): void {
    this.log("INFO", event);
  }

  /**
   * 方法名：warn
   * 作用：按指定等级和格式记录日志。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
  warn(event: LogEvent): void {
    this.log("WARN", event);
  }

  /**
   * 方法名：error
   * 作用：按指定等级和格式记录日志。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
  error(event: LogEvent): void {
    this.log("ERROR", event);
  }

  /**
   * 方法名：log
   * 作用：按指定等级和格式记录日志。
   * @param level 方法所需的 level 参数。
   * @param event 方法所需的 event 参数。
   * @returns 无返回值。
   */
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

  /**
   * 方法名：flush
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  async flush(): Promise<void> {
    await this.#tail;
  }

  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
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
