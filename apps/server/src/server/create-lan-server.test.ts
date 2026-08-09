import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createLanServer } from "./create-lan-server.ts";

const servers: ReturnType<typeof createLanServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.socketServer.close(() => resolve());
        }),
    ),
  );
});

describe("createLanServer", () => {
  it("returns a 403 JSON response before serving an HTTP request from a non-whitelisted IP", async () => {
    const server = createLanServer({
      clientOrigin: "http://localhost:5173",
      allowedClientIps: ["192.0.2.1"],
    });
    servers.push(server);
    const address = await listen(server.httpServer);

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: "IP_NOT_ALLOWED",
      message: "Access is not allowed from this IP.",
    });
  });

  it("serves allowed loopback requests normally", async () => {
    const server = createLanServer({
      clientOrigin: "http://localhost:5173",
      allowedClientIps: ["127.0.0.1"],
    });
    servers.push(server);
    const address = await listen(server.httpServer);

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });
});

/** 在随机可用端口监听 HTTP 服务并返回实际绑定地址。 */
function listen(server: ReturnType<typeof createLanServer>["httpServer"]): Promise<AddressInfo> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address() as AddressInfo);
    });
  });
}
