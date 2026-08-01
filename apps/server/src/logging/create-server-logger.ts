import path from "node:path";

import {
  FileLogWriter,
  LogStorageInitializationError,
  type FileLogWriterOptions,
} from "./file-log-writer.ts";
import { Logger, type LogFallback } from "./logger.ts";
import { NoopLogWriter } from "./log-writer.ts";

export interface CreateServerLoggerOptions extends Omit<FileLogWriterOptions, "directory"> {
  readonly directory?: string;
  readonly fallback?: LogFallback;
  readonly maxPendingEntries?: number;
}

function defaultFallback(message: string): void {
  console.error(message);
}

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
