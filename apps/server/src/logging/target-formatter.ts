import { LOG_CONFIG } from "./log-config.ts";
import type { LogTarget } from "./log-record.ts";

const SYSTEM_TARGET_TEXT = "-------";

function assertValidDisplayName(displayName: string): void {
  if (displayName.trim().length === 0) {
    throw new TypeError("Log target display name cannot be empty.");
  }
  if (/[[\]\r\n]/u.test(displayName)) {
    throw new TypeError("Log target display name cannot contain brackets or line breaks.");
  }
}

export function formatPlayerTarget(displayName: string): string {
  assertValidDisplayName(displayName);

  const characters = Array.from(displayName);
  const abbreviated =
    characters.length > LOG_CONFIG.targetWidth
      ? `${characters.slice(0, 3).join("")}*${characters.slice(-3).join("")}`
      : displayName;

  return abbreviated.padEnd(LOG_CONFIG.targetWidth, " ");
}

export function formatLogTarget(target: LogTarget): string {
  return target.kind === "system" ? SYSTEM_TARGET_TEXT : formatPlayerTarget(target.displayName);
}
