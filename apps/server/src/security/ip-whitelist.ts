import { isIP } from "node:net";

/** 描述 IP 白名单校验失败时可安全返回给客户端的错误内容。 */
export interface IpWhitelistRejection {
  readonly statusCode: 403;
  readonly body: {
    readonly code: "IP_NOT_ALLOWED";
    readonly message: "Access is not allowed from this IP.";
  };
}

/** HTTP 与 Socket.IO 统一使用的白名单拒绝结果。 */
export const IP_WHITELIST_REJECTION: IpWhitelistRejection = Object.freeze({
  statusCode: 403,
  body: Object.freeze({
    code: "IP_NOT_ALLOWED",
    message: "Access is not allowed from this IP.",
  }),
});

/**
 * 方法名：normalizeRemoteIpAddress
 * 作用：规范化 Node.js 连接地址，统一 IPv4 与 IPv4 映射 IPv6 的精确比较形式。
 * @param remoteAddress 底层 TCP 连接提供的来源地址。
 * @returns 可用于白名单精确比较的 IP；地址缺失或非法时返回 null。
 */
export function normalizeRemoteIpAddress(remoteAddress: string | undefined): string | null {
  if (remoteAddress === undefined || remoteAddress.length === 0) {
    return null;
  }

  const normalized = remoteAddress.startsWith("::ffff:")
    ? remoteAddress.slice("::ffff:".length)
    : remoteAddress;

  return isIP(normalized) === 0 ? null : normalized.toLowerCase();
}

/**
 * 方法名：isIpWhitelisted
 * 作用：判断来源地址是否与配置中的任一精确 IP 完全一致。
 * @param remoteAddress 底层 TCP 或 Socket.IO 握手提供的来源地址。
 * @param allowedClientIps 允许访问本机服务的精确 IP 列表。
 * @returns 来源地址存在且精确匹配白名单时返回 true。
 */
export function isIpWhitelisted(
  remoteAddress: string | undefined,
  allowedClientIps: readonly string[],
): boolean {
  const normalizedRemoteAddress = normalizeRemoteIpAddress(remoteAddress);

  if (normalizedRemoteAddress === null) {
    return false;
  }

  return allowedClientIps.some(
    (allowedClientIp) => normalizeRemoteIpAddress(allowedClientIp) === normalizedRemoteAddress,
  );
}
