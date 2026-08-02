import type { SystemLogTarget } from "./log-record.ts";

/** 日志工具支持的五种输出等级。 */
export const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"] as const;

/** 用于分类检索日志的固定业务功能集合。 */
export const LOG_ACTIONS = [
  "System",
  "Player",
  "Battle",
  "Move",
  "Map",
  "Item",
  "Equip",
  "Level",
  "Quest",
  "Weather",
  "Hand",
  "Npc",
  "Shop",
  "Random",
  "Save",
  "Load",
  "Network",
] as const;

/** 与任何玩家无关的系统级日志对象。 */
export const SYSTEM_LOG_TARGET: SystemLogTarget = Object.freeze({ kind: "system" });

/** 日志目录、滚动大小、字段宽度和写入队列的统一配置。 */
export const LOG_CONFIG = Object.freeze({
  directory: "logs",
  latestFile: "latest.log",
  filePrefix: "game",
  fileExtension: ".log",
  fileNamePattern: "yyyyMMdd_HHmmss_SSS",
  maxFileSizeBytes: 50 * 1024 * 1024,
  encoding: "utf-8",
  levelWidth: 5,
  targetWidth: 7,
  actionWidth: 8,
  maxPendingEntries: 10_000,
} as const);
