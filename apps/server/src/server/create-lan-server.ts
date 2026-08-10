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
import { Logger, NoopLogWriter } from "../logging/index.ts";
import { GameSessionManager } from "../game/game-session-manager.ts";
import { DefaultInitialGameSessionFactory } from "../game/default-initial-game-session-factory.ts";
import { StartGameService } from "../game/start-game-service.ts";
import { SocketSessionManager } from "../sessions/socket-session-manager.ts";
import { bindGameSocketEvents } from "../transport/bind-game-socket-events.ts";
import { bindRoomSocketEvents } from "../transport/bind-room-socket-events.ts";
import {
  IP_WHITELIST_REJECTION,
  isIpWhitelisted,
  loadAllowedClientIps,
} from "../security/index.ts";

interface LanServerOptions {
  clientOrigin: string;
  readonly allowedClientIps?: readonly string[];
  readonly logger?: Logger;
}

/**
 * 方法名：createLanServer
 * 作用：创建并校验该方法所负责的业务对象。
 * @param options 控制本次操作行为的可选参数。
 * @returns 本次处理得到的结果。
 */
export function createLanServer(options: LanServerOptions) {
  const allowedClientIps = options.allowedClientIps ?? loadAllowedClientIps();
  const logger = options.logger ?? new Logger({ writer: new NoopLogWriter() });
  const httpServer = createServer((request, response) => {
    if (!isIpWhitelisted(request.socket.remoteAddress, allowedClientIps)) {
      response.writeHead(IP_WHITELIST_REJECTION.statusCode, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify(IP_WHITELIST_REJECTION.body));
      return;
    }

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

  socketServer.use((socket, next) => {
    if (isIpWhitelisted(socket.handshake.address, allowedClientIps)) {
      next();
      return;
    }

    const error = new Error(IP_WHITELIST_REJECTION.body.code);
    Object.assign(error, { data: IP_WHITELIST_REJECTION });
    next(error);
  });
  const roomManager = new RoomManager();
  const gameSessionManager = new GameSessionManager<"health", "maxHealth">();
  const sessionManager = new SocketSessionManager();
  const startGameService = new StartGameService(
    roomManager,
    gameSessionManager,
    new DefaultInitialGameSessionFactory(),
  );

  socketServer.on("connection", (socket) => {
    socket.emit("server:ready", { protocolVersion: PROTOCOL_VERSION });
    bindGameSocketEvents(
      socket,
      socketServer,
      gameSessionManager,
      sessionManager,
      startGameService,
      logger,
    );
    bindRoomSocketEvents(socket, socketServer, roomManager, sessionManager, {
      onPlayerReconnected: (playerId) => {
        try {
          gameSessionManager.getSession().restorePlayerConnection(playerId);
        } catch {
          // 大厅阶段尚未创建游戏会话，恢复大厅连接无需额外处理。
        }
      },
      onPlayerJoinedDuringGame: (player) => {
        if (player.characterSelection === null) {
          throw new Error("Mid-game player character selection is missing");
        }
        gameSessionManager.getSession().addMidGamePlayer({
          playerId: player.playerId,
          characterSelection: player.characterSelection,
        });
      },
    });
  });

  return { httpServer, socketServer, roomManager, gameSessionManager, sessionManager };
}
