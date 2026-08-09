import { createServer } from "node:http";

import {
  PROTOCOL_VERSION,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerSocketData,
  type ServerToClientEvents,
} from "@genesis-rift/shared";
import { Server as SocketServer } from "socket.io";

import { RoomManager } from "../rooms/room-manager.ts";
import { GameSessionManager } from "../game/game-session-manager.ts";
import { SocketSessionManager } from "../sessions/socket-session-manager.ts";
import { bindGameSocketEvents } from "../transport/bind-game-socket-events.ts";
import { bindRoomSocketEvents } from "../transport/bind-room-socket-events.ts";

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
  const roomManager = new RoomManager();
  const gameSessionManager = new GameSessionManager();
  const sessionManager = new SocketSessionManager();

  socketServer.on("connection", (socket) => {
    socket.emit("server:ready", { protocolVersion: PROTOCOL_VERSION });
    bindGameSocketEvents(socket, socketServer, gameSessionManager, sessionManager);
    bindRoomSocketEvents(socket, socketServer, roomManager, sessionManager, {
      onPlayerReconnected: (playerId) => {
        try {
          gameSessionManager.getSession().restorePlayerConnection(playerId);
        } catch {
          // 大厅阶段尚未创建游戏会话，恢复大厅连接无需额外处理。
        }
      },
    });
  });

  return { httpServer, socketServer, roomManager, gameSessionManager, sessionManager };
}
