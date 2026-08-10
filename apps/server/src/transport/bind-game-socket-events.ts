import type {
  LanGameSessionSnapshot,
  LanRequestRejectedPayload,
  RequestGameSnapshot,
  StartLanGameRequest,
  SubmitGameCommandRequest,
} from "@genesis-rift/shared";

import { GameCommandService } from "../game/game-command-service.ts";
import { GameSessionManager, GameSessionManagerError } from "../game/game-session-manager.ts";
import { ServerGameSessionError } from "../game/game-session.ts";
import { StartGameService } from "../game/start-game-service.ts";
import { RoomManagerError } from "../rooms/room-manager.ts";
import { SocketSessionError, SocketSessionManager } from "../sessions/socket-session-manager.ts";

/** 描述游戏协议适配器需要使用的最小 Socket 能力。 */
export interface GameSocket {
  readonly id: string;
  on(event: "game:requestSnapshot", listener: (payload: RequestGameSnapshot) => void): void;
  on(event: "game:start", listener: (payload: StartLanGameRequest) => void): void;
  on(event: "game:command", listener: (payload: SubmitGameCommandRequest) => void): void;
  on(event: "disconnect", listener: () => void): void;
  emit(
    event: "game:snapshot",
    payload: { readonly requestId: string; readonly game: LanGameSessionSnapshot },
  ): void;
  emit(
    event: "game:commandAccepted",
    payload: {
      readonly requestId: string;
      readonly commandId: string;
      readonly game: LanGameSessionSnapshot;
    },
  ): void;
  emit(event: "game:rejected", payload: LanRequestRejectedPayload): void;
  emit(
    event: "game:started",
    payload: { readonly requestId: string; readonly game: LanGameSessionSnapshot },
  ): void;
}

/** 描述向 Socket.IO 房间广播最新公开游戏快照的最小服务端能力。 */
export interface GameSnapshotBroadcaster {
  to(roomId: string): {
    emit(
      event: "game:snapshot",
      payload: { readonly requestId: string; readonly game: LanGameSessionSnapshot },
    ): void;
  };
}

/**
 * 方法名：bindGameSocketEvents
 * 作用：将游戏命令、公开快照与断线登记绑定到服务端权威游戏会话。
 * @param socket 当前 Socket 连接。
 * @param broadcaster 支持按房间广播游戏快照的服务端对象。
 * @param gameSessionManager 当前单局游戏会话管理器。
 * @param socketSessionManager Socket 与玩家身份绑定管理器。
 * @returns 无返回值。
 */
export function bindGameSocketEvents(
  socket: GameSocket,
  broadcaster: GameSnapshotBroadcaster,
  gameSessionManager: GameSessionManager<"health", "maxHealth">,
  socketSessionManager: SocketSessionManager,
  startGameService: StartGameService<"health", "maxHealth">,
): void {
  socket.on("game:start", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = socketSessionManager.getJoinedSession(socket.id);
      const game = startGameService.start(session.playerId);
      socket.emit("game:started", { requestId: request.requestId, game });
      broadcaster.to(session.roomId).emit("game:snapshot", {
        requestId: "server.gameStarted",
        game,
      });
    });
  });

  socket.on("game:requestSnapshot", (request) => {
    handleRequest(socket, request.requestId, () => {
      socketSessionManager.getJoinedSession(socket.id);
      const game = gameSessionManager.getSession().getSnapshot();
      socket.emit("game:snapshot", { requestId: request.requestId, game });
    });
  });

  socket.on("game:command", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = socketSessionManager.getJoinedSession(socket.id);
      const gameSession = gameSessionManager.getSession();

      const command =
        request.type === "map.move"
          ? {
              commandId: request.commandId,
              playerId: session.playerId,
              type: request.type,
              direction: request.direction,
            }
          : {
              commandId: request.commandId,
              playerId: session.playerId,
              type: request.type,
            };
      const result = new GameCommandService(gameSession).execute(command);
      socket.emit("game:commandAccepted", {
        requestId: request.requestId,
        commandId: result.commandId,
        game: result.snapshot,
      });
      broadcaster.to(session.roomId).emit("game:snapshot", {
        requestId: "server.gameUpdated",
        game: result.snapshot,
      });
    });
  });

  socket.on("disconnect", () => {
    try {
      const socketSession = socketSessionManager.getJoinedSession(socket.id);
      const gameSession = gameSessionManager.getSession();

      const result = gameSession.markPlayerDisconnected(socketSession.playerId);
      broadcaster.to(socketSession.roomId).emit("game:snapshot", {
        requestId: "server.playerDisconnected",
        game: result.snapshot,
      });
    } catch {
      // 大厅阶段或尚未初始化游戏时，断线不应影响 Socket 清理流程。
    }
  });
}

/** 将已知游戏会话异常转换为统一网络拒绝消息。 */
function handleRequest(socket: GameSocket, requestId: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    socket.emit("game:rejected", createRejectedPayload(requestId, error));
  }
}

/** 将服务端游戏与 Socket 会话异常映射为共享协议错误结构。 */
function createRejectedPayload(requestId: string, error: unknown): LanRequestRejectedPayload {
  if (
    error instanceof GameSessionManagerError ||
    error instanceof ServerGameSessionError ||
    error instanceof RoomManagerError ||
    error instanceof SocketSessionError
  ) {
    return { requestId, code: error.code, message: error.message };
  }

  return { requestId, code: "REQUEST_INVALID", message: "The game request is invalid." };
}
