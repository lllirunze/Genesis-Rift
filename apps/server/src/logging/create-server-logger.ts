import path from "node:path";

import {
  FileLogWriter,
  LogStorageInitializationError,
  type FileLogWriterOptions,
} from "./file-log-writer.ts";
import { Logger, type LogFallback } from "./logger.ts";
import { NoopLogWriter } from "./log-writer.ts";

/** 描述调用方可以调整的可选行为参数。 */
export interface CreateServerLoggerOptions extends Omit<FileLogWriterOptions, "directory"> {
  readonly directory?: string;
  readonly fallback?: LogFallback;
  readonly maxPendingEntries?: number;
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

/**
 * 方法名：createServerLogger
 * 作用：创建并校验该方法所负责的业务对象。
 * @param options 控制本次操作行为的可选参数。
 * @returns 本次处理得到的结果。
 */
export async function createServerLogger(options: CreateServerLoggerOptions = {}): Promise<Logger> {
  const fallback = options.fallback ?? defaultFallback;
  const directory = options.directory ?? path.resolve(process.cwd(), "logs");

  try {
    const writer = await FileLogWriter.create({
      directory,
      ...(options.maxFileSizeBytes === undefined
        ? {}
        : { maxFileSizeBytes: options.maxFileSizeBytes }),
      ...(options.now === undefined ? {} : { now: options.now }),
    });
    return new Logger({
      writer,
      fallback,
      ...(options.maxPendingEntries === undefined
        ? {}
        : { maxPendingEntries: options.maxPendingEntries }),
    });
  } catch (error) {
    fallback(
      error instanceof LogStorageInitializationError && error.stage === "directory"
        ? "Failed to create log directory."
        : "Failed to create log file.",
    );
    return new Logger({
      writer: new NoopLogWriter(),
      fallback,
      ...(options.maxPendingEntries === undefined
        ? {}
        : { maxPendingEntries: options.maxPendingEntries }),
    });
  }
}
