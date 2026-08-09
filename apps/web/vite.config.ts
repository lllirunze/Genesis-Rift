import { isIP } from "node:net";

import { ALLOWED_CLIENT_IPS } from "@genesis-rift/shared";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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

export default defineConfig({
  plugins: [ipWhitelistPlugin(), react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
