import { isIP } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const DEFAULT_ALLOWED_CLIENT_IPS = ["127.0.0.1", "::1"] as const;
const LOCAL_IP_WHITELIST_CONFIG_PATH = fileURLToPath(
  new URL("../../config/allowed-client-ips.local.json", import.meta.url),
);
const ALLOWED_CLIENT_IPS = loadAllowedClientIps();

/** 将 Vite 开发网页服务限制为与游戏服务相同的精确 IP 白名单。 */
function ipWhitelistPlugin() {
  return {
    name: "genesis-rift-ip-whitelist",
    configureServer(server: { middlewares: { use: (handler: ViteRequestHandler) => void } }) {
      server.middlewares.use((request, response, next) => {
        if (isWhitelisted(request.socket.remoteAddress)) {
          next();
          return;
        }

        response.statusCode = 403;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            code: "IP_NOT_ALLOWED",
            message: "Access is not allowed from this IP.",
          }),
        );
      });
    },
  };
}

/** 描述 Vite 开发中间件使用的最小 Node 请求处理签名。 */
type ViteRequestHandler = (
  request: { readonly socket: { readonly remoteAddress?: string } },
  response: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body: string): void;
  },
  next: () => void,
) => void;

/** 判断来源地址是否与共享精确白名单中的某项相同。 */
function isWhitelisted(remoteAddress: string | undefined): boolean {
  const normalizedRemoteAddress = normalizeIpAddress(remoteAddress);

  return (
    normalizedRemoteAddress !== null &&
    ALLOWED_CLIENT_IPS.some(
      (allowedClientIp) => normalizeIpAddress(allowedClientIp) === normalizedRemoteAddress,
    )
  );
}

/** 统一 Vite 进程中的 IPv4 与 IPv4 映射 IPv6 比较形式。 */
function normalizeIpAddress(address: string | undefined): string | null {
  if (address === undefined || address.length === 0) {
    return null;
  }

  const normalized = address.startsWith("::ffff:") ? address.slice(7) : address;
  return isIP(normalized) === 0 ? null : normalized.toLowerCase();
}

/** 读取不提交至 Git 的网页开发服务器本地白名单配置。 */
function loadAllowedClientIps(): readonly string[] {
  if (!existsSync(LOCAL_IP_WHITELIST_CONFIG_PATH)) {
    return DEFAULT_ALLOWED_CLIENT_IPS;
  }

  const parsed = JSON.parse(readFileSync(LOCAL_IP_WHITELIST_CONFIG_PATH, "utf-8")) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("Allowed client IP configuration must be an object");
  }

  const allowedClientIps = (parsed as Record<string, unknown>).allowedClientIps;

  if (
    !Array.isArray(allowedClientIps) ||
    allowedClientIps.some((clientIp) => typeof clientIp !== "string")
  ) {
    throw new TypeError("allowedClientIps must be an array of strings");
  }

  return allowedClientIps.map((clientIp) => {
    const normalizedClientIp = normalizeIpAddress(clientIp);

    if (normalizedClientIp === null) {
      throw new TypeError(`Invalid allowed client IP: ${clientIp}`);
    }

    return normalizedClientIp;
  });
}

export default defineConfig({
  plugins: [ipWhitelistPlugin(), react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
