import type { GameId, PlayerId } from "@genesis-rift/shared";

import type { LogAction } from "./log-action.ts";
import type { LogLevel } from "./log-level.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface SystemLogTarget {
  readonly kind: "system";
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface PlayerLogTarget {
  readonly kind: "player";
  readonly playerId: PlayerId;
  readonly displayName: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type LogTarget = SystemLogTarget | PlayerLogTarget;

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateLogRecordInput {
  readonly level: LogLevel;
  readonly target: LogTarget;
  readonly action: LogAction;
  readonly module: string;
  readonly message: string;
  readonly gameId?: GameId;
  readonly context?: Readonly<Record<string, unknown>>;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface LogRecord {
  readonly timestampMs: number;
  readonly sequence: number;
  readonly gameId: GameId | null;
  readonly level: LogLevel;
  readonly target: LogTarget;
  readonly action: LogAction;
  readonly module: string;
  readonly message: string;
  readonly context: Readonly<Record<string, unknown>>;
}

/** 描述调用方可以调整的可选行为参数。 */
export interface LogRecordFactoryOptions {
  readonly now?: () => number;
  readonly initialSequence?: number;
}

/** 封装该模块的状态与操作入口。 */
export class LogRecordFactory {
  readonly #now: () => number;
  #lastSequence: number;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param options 控制本次操作行为的可选参数。
   * @returns 无返回值。
   */
  constructor(options: LogRecordFactoryOptions = {}) {
    const initialSequence = options.initialSequence ?? 0;
    if (!Number.isSafeInteger(initialSequence) || initialSequence < 0) {
      throw new RangeError("Initial log sequence must be a non-negative safe integer.");
    }

    this.#now = options.now ?? Date.now;
    this.#lastSequence = initialSequence;
  }

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param input 本次处理的输入数据。
   * @returns 本次处理得到的结果。
   */
  create(input: CreateLogRecordInput): LogRecord {
    if (this.#lastSequence === Number.MAX_SAFE_INTEGER) {
      throw new RangeError("Log sequence exceeded the maximum safe integer.");
    }

    const timestampMs = this.#now();
    if (!Number.isSafeInteger(timestampMs)) {
      throw new RangeError("Log timestamp must be a safe integer in milliseconds.");
    }

    this.#lastSequence += 1;

    return Object.freeze({
      timestampMs,
      sequence: this.#lastSequence,
      gameId: input.gameId ?? null,
      level: input.level,
      target: Object.freeze({ ...input.target }),
      action: input.action,
      module: input.module,
      message: input.message,
      context: Object.freeze({ ...(input.context ?? {}) }),
    });
  }
}
