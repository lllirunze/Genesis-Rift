import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import { LOG_CONFIG } from "./log-config.ts";
import { formatLogArchiveFileName } from "./log-file-name.ts";
import type { LogWriter } from "./log-writer.ts";

/** 描述调用方可以调整的可选行为参数。 */
export interface FileLogWriterOptions {
  readonly directory?: string;
  readonly maxFileSizeBytes?: number;
  readonly now?: () => number;
}

/** 封装该模块的状态与操作入口。 */
export class LogStorageInitializationError extends Error {
  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param cause 方法所需的 cause 参数。
   * @returns 无返回值。
   */
  constructor(
    readonly stage: "directory" | "file",
    cause: unknown,
  ) {
    super(`Failed to initialize log ${stage}.`, { cause });
    this.name = "LogStorageInitializationError";
  }
}

/**
 * 方法名：pathExists
 * 作用：执行该方法负责的单一业务操作。
 * @param filePath 方法所需的 filePath 参数。
 * @returns 本次处理得到的结果。
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/** 封装该模块的状态与操作入口。 */
export class FileLogWriter implements LogWriter {
  readonly #directory: string;
  readonly #latestPath: string;
  readonly #maxFileSizeBytes: number;
  readonly #now: () => number;
  #handle: Awaited<ReturnType<typeof open>>;
  #activeCreatedAtMs: number;
  #currentSizeBytes: number;
  #closed = false;

  private constructor(
    directory: string,
    maxFileSizeBytes: number,
    now: () => number,
    handle: Awaited<ReturnType<typeof open>>,
    activeCreatedAtMs: number,
  ) {
    this.#directory = directory;
    this.#latestPath = path.join(directory, LOG_CONFIG.latestFile);
    this.#maxFileSizeBytes = maxFileSizeBytes;
    this.#now = now;
    this.#handle = handle;
    this.#activeCreatedAtMs = activeCreatedAtMs;
    this.#currentSizeBytes = 0;
  }

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param options 控制本次操作行为的可选参数。
   * @returns 本次处理得到的结果。
   */
  static async create(options: FileLogWriterOptions = {}): Promise<FileLogWriter> {
    const directory = path.resolve(options.directory ?? LOG_CONFIG.directory);
    const maxFileSizeBytes = options.maxFileSizeBytes ?? LOG_CONFIG.maxFileSizeBytes;
    const now = options.now ?? Date.now;

    if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
      throw new RangeError("Maximum log file size must be a positive safe integer.");
    }

    try {
      await mkdir(directory, { recursive: true });
    } catch (error) {
      throw new LogStorageInitializationError("directory", error);
    }
    const latestPath = path.join(directory, LOG_CONFIG.latestFile);

    try {
      if (await pathExists(latestPath)) {
        const previous = await stat(latestPath);
        if (previous.size > 0) {
          await FileLogWriter.archivePath(directory, latestPath, Math.trunc(previous.mtimeMs));
        } else {
          await rm(latestPath);
        }
      }

      const activeCreatedAtMs = now();
      if (!Number.isSafeInteger(activeCreatedAtMs)) {
        throw new RangeError("Log creation time must be a safe integer in milliseconds.");
      }

      const handle = await open(latestPath, "a");
      return new FileLogWriter(directory, maxFileSizeBytes, now, handle, activeCreatedAtMs);
    } catch (error) {
      throw new LogStorageInitializationError("file", error);
    }
  }

  /**
   * 方法名：write
   * 作用：按指定等级和格式记录日志。
   * @param line 方法所需的 line 参数。
   * @returns 本次处理得到的结果。
   */
  async write(line: string): Promise<void> {
    if (this.#closed) {
      throw new Error("Cannot write to a closed log writer.");
    }

    const bytes = Buffer.from(`${line}\n`, LOG_CONFIG.encoding);
    if (bytes.byteLength > this.#maxFileSizeBytes) {
      throw new RangeError("A single log entry exceeds the maximum log file size.");
    }

    if (
      this.#currentSizeBytes > 0 &&
      this.#currentSizeBytes + bytes.byteLength > this.#maxFileSizeBytes
    ) {
      await this.#rotate();
    }

    await this.#handle.writeFile(bytes);
    this.#currentSizeBytes += bytes.byteLength;
  }

  /**
   * 方法名：close
   * 作用：完成待处理工作并安全释放运行资源。
   * @returns 本次处理得到的结果。
   */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }

    this.#closed = true;
    await this.#handle.close();

    if (this.#currentSizeBytes > 0) {
      await FileLogWriter.archivePath(this.#directory, this.#latestPath, this.#activeCreatedAtMs);
    } else {
      await rm(this.#latestPath, { force: true });
    }
  }

  async #rotate(): Promise<void> {
    await this.#handle.close();
    await FileLogWriter.archivePath(this.#directory, this.#latestPath, this.#activeCreatedAtMs);

    this.#activeCreatedAtMs = this.#now();
    if (!Number.isSafeInteger(this.#activeCreatedAtMs)) {
      throw new RangeError("Log creation time must be a safe integer in milliseconds.");
    }
    this.#handle = await open(this.#latestPath, "a");
    this.#currentSizeBytes = 0;
  }

  /**
   * 方法名：archivePath
   * 作用：执行该方法负责的单一业务操作。
   * @param directory 方法所需的 directory 参数。
   * @param sourcePath 方法所需的 sourcePath 参数。
   * @param createdAtMs 方法所需的 createdAtMs 参数。
   * @returns 本次处理得到的结果。
   */
  private static async archivePath(
    directory: string,
    sourcePath: string,
    createdAtMs: number,
  ): Promise<string> {
    let candidateTimestamp = createdAtMs;

    while (true) {
      const destinationPath = path.join(directory, formatLogArchiveFileName(candidateTimestamp));
      if (!(await pathExists(destinationPath))) {
        await rename(sourcePath, destinationPath);
        return destinationPath;
      }
      candidateTimestamp += 1;
    }
  }
}
