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
