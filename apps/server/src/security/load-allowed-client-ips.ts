import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { normalizeRemoteIpAddress } from "./ip-whitelist.ts";

/** 本地白名单配置不存在时允许开发者在本机访问服务的默认地址。 */
export const DEFAULT_ALLOWED_CLIENT_IPS = ["127.0.0.1", "::1"] as const;

const LOCAL_IP_WHITELIST_CONFIG_PATH = fileURLToPath(
  new URL("../../../../config/allowed-client-ips.local.json", import.meta.url),
);

/**
 * 方法名：loadAllowedClientIps
 * 作用：读取不提交至 Git 的本地精确 IP 白名单配置。
 * @returns 经格式校验与规范化后的允许来源 IP 列表。
 * @throws 配置文件存在但不是合法 JSON、字段缺失或包含非法 IP 时抛出错误。
 */
export function loadAllowedClientIps(): readonly string[] {
  if (!existsSync(LOCAL_IP_WHITELIST_CONFIG_PATH)) {
    return DEFAULT_ALLOWED_CLIENT_IPS;
  }

  const content = readFileSync(LOCAL_IP_WHITELIST_CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(content) as unknown;
  const allowedClientIps = getAllowedClientIps(parsed);

  return Object.freeze(
    allowedClientIps.map((clientIp) => {
      const normalizedClientIp = normalizeRemoteIpAddress(clientIp);

      if (normalizedClientIp === null) {
        throw new TypeError(`Invalid allowed client IP: ${clientIp}`);
      }

      return normalizedClientIp;
    }),
  );
}

/** 从未知 JSON 内容中读取唯一允许的字符串数组字段。 */
function getAllowedClientIps(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Allowed client IP configuration must be an object");
  }

  const allowedClientIps = (value as Record<string, unknown>).allowedClientIps;

  if (
    !Array.isArray(allowedClientIps) ||
    allowedClientIps.some((clientIp) => typeof clientIp !== "string")
  ) {
    throw new TypeError("allowedClientIps must be an array of strings");
  }

  return allowedClientIps;
}
