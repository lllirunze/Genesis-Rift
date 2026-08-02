import { createServer } from "node:http";

import {
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerSocketData,
  type ServerToClientEvents,
} from "@genesis-rift/shared";
import { Server as SocketServer } from "socket.io";

interface LanServerOptions {
  clientOrigin: string;
}

/**
 * 方法名：createLanServer
 * 作用：创建并校验该方法所负责的业务对象。
 * @param options 控制本次操作行为的可选参数。
 * @returns 本次处理得到的结果。
 */
export function createLanServer(options: LanServerOptions) {
  const httpServer = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", protocolVersion: PROTOCOL_VERSION }));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  const socketServer = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    ServerSocketData
  >(httpServer, {
    cors: {
      origin: options.clientOrigin,
    },
  });

  socketServer.on("connection", (socket) => {
    socket.emit("server:ready", { protocolVersion: PROTOCOL_VERSION });
  });

  return { httpServer, socketServer };
}
