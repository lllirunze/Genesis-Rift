import { LOG_CONFIG } from "./log-config.ts";
import type { LogTarget } from "./log-record.ts";

const SYSTEM_TARGET_TEXT = "-------";

/**
 * 方法名：assertValidDisplayName
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param displayName 方法所需的 displayName 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertValidDisplayName(displayName: string): void {
  if (displayName.trim().length === 0) {
    throw new TypeError("Log target display name cannot be empty.");
  }
  if (/[[\]\r\n]/u.test(displayName)) {
    throw new TypeError("Log target display name cannot contain brackets or line breaks.");
  }
}

/**
 * 方法名：formatPlayerTarget
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param displayName 方法所需的 displayName 参数。
 * @returns 本次处理得到的结果。
 */
export function formatPlayerTarget(displayName: string): string {
  assertValidDisplayName(displayName);

  const characters = Array.from(displayName);
  const abbreviated =
    characters.length > LOG_CONFIG.targetWidth
      ? `${characters.slice(0, 3).join("")}*${characters.slice(-3).join("")}`
      : displayName;

  return abbreviated.padEnd(LOG_CONFIG.targetWidth, " ");
}

/**
 * 方法名：formatLogTarget
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param target 方法所需的 target 参数。
 * @returns 本次处理得到的结果。
 */
export function formatLogTarget(target: LogTarget): string {
  return target.kind === "system" ? SYSTEM_TARGET_TEXT : formatPlayerTarget(target.displayName);
}
