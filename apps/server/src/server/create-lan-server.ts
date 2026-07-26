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
