import type { SystemLogTarget } from "./log-record.ts";

export const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"] as const;

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

export const SYSTEM_LOG_TARGET: SystemLogTarget = Object.freeze({ kind: "system" });

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
