import type { GameId, PlayerId } from "@genesis-rift/shared";

import type { LogAction } from "./log-action.ts";
import type { LogLevel } from "./log-level.ts";

export interface SystemLogTarget {
  readonly kind: "system";
}

export interface PlayerLogTarget {
  readonly kind: "player";
  readonly playerId: PlayerId;
  readonly displayName: string;
}

export type LogTarget = SystemLogTarget | PlayerLogTarget;

export const SYSTEM_LOG_TARGET: SystemLogTarget = Object.freeze({ kind: "system" });

export interface CreateLogRecordInput {
  readonly level: LogLevel;
  readonly target: LogTarget;
  readonly action: LogAction;
  readonly module: string;
  readonly message: string;
  readonly gameId?: GameId;
  readonly context?: Readonly<Record<string, unknown>>;
}

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

export interface LogRecordFactoryOptions {
  readonly now?: () => number;
  readonly initialSequence?: number;
}

export class LogRecordFactory {
  readonly #now: () => number;
  #lastSequence: number;

  constructor(options: LogRecordFactoryOptions = {}) {
    const initialSequence = options.initialSequence ?? 0;
    if (!Number.isSafeInteger(initialSequence) || initialSequence < 0) {
      throw new RangeError("Initial log sequence must be a non-negative safe integer.");
    }

    this.#now = options.now ?? Date.now;
    this.#lastSequence = initialSequence;
  }

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
