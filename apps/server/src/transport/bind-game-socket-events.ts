import type {
  LanGameSessionSnapshot,
  LanGameEvent,
  LanRequestRejectedPayload,
  PlayerId,
  RoomId,
  RequestGameSnapshot,
  StartLanGameRequest,
  SubmitGameCommandRequest,
} from "@genesis-rift/shared";

import { GameCommandService } from "../game/game-command-service.ts";
import { GameSessionManager, GameSessionManagerError } from "../game/game-session-manager.ts";
import { ServerGameSessionError } from "../game/game-session.ts";
import { StartGameService } from "../game/start-game-service.ts";
import type { Logger } from "../logging/index.ts";
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
  emit(event: "game:event", payload: { readonly event: LanGameEvent }): void;
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
    emit(event: "game:event", payload: { readonly event: LanGameEvent }): void;
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
  logger: Logger | null = null,
): void {
  socket.on("game:start", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = socketSessionManager.getJoinedSession(socket.id);
      startGameService.start(session.playerId);
      socket.emit("game:started", {
        requestId: request.requestId,
        game: gameSessionManager.getSession().getSnapshotForPlayer(session.playerId),
      });
      broadcastViewerSnapshots(
        broadcaster,
        socketSessionManager,
        gameSessionManager.getSession(),
        session.roomId,
        "server.gameStarted",
      );
    });
  });

  socket.on("game:requestSnapshot", (request) => {
    handleRequest(socket, request.requestId, () => {
      socketSessionManager.getJoinedSession(socket.id);
      const game = gameSessionManager
        .getSession()
        .getSnapshotForPlayer(socketSessionManager.getJoinedSession(socket.id).playerId);
      socket.emit("game:snapshot", { requestId: request.requestId, game });
    });
  });

  socket.on("game:command", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = socketSessionManager.getJoinedSession(socket.id);
      const gameSession = gameSessionManager.getSession();

      const command = createServerGameCommand(request, session.playerId);
      const result = new GameCommandService(gameSession, logger).execute(command);
      socket.emit("game:commandAccepted", {
        requestId: request.requestId,
        commandId: result.commandId,
        game: gameSession.getSnapshotForPlayer(session.playerId),
      });
      broadcastPublicGameEvents(broadcaster, session.roomId, result.events);
      broadcastViewerSnapshots(
        broadcaster,
        socketSessionManager,
        gameSession,
        session.roomId,
        "server.gameUpdated",
      );
    });
  });

  socket.on("disconnect", () => {
    try {
      const socketSession = socketSessionManager.getJoinedSession(socket.id);
      const gameSession = gameSessionManager.getSession();

      gameSession.markPlayerDisconnected(socketSession.playerId);
      broadcastViewerSnapshots(
        broadcaster,
        socketSessionManager,
        gameSession,
        socketSession.roomId,
        "server.playerDisconnected",
      );
    } catch {
      // 大厅阶段或尚未初始化游戏时，断线不应影响 Socket 清理流程。
    }
  });
}

/** 逐 Socket 生成游戏快照，避免将任何玩家私有状态广播给整个房间。 */
function broadcastViewerSnapshots(
  broadcaster: GameSnapshotBroadcaster,
  socketSessionManager: SocketSessionManager,
  gameSession: ReturnType<GameSessionManager<"health", "maxHealth">["getSession"]>,
  roomId: RoomId,
  requestId: string,
): void {
  for (const session of socketSessionManager.getJoinedSessionsInRoom(roomId)) {
    broadcaster.to(session.socketId).emit("game:snapshot", {
      requestId,
      game: gameSession.getSnapshotForPlayer(session.playerId),
    });
  }
}

/** 将服务端内部领域事件过滤并转换为可安全发送给房间成员的协议事件。 */
function broadcastPublicGameEvents(
  broadcaster: GameSnapshotBroadcaster,
  roomId: string,
  events: readonly import("../game/game-session.ts").GameSessionEvent[],
): void {
  for (const event of events) {
    if (
      event.type !== "battle.attackResolved" &&
      event.type !== "player.survivalChanged" &&
      event.type !== "player.reincarnationResolved"
    ) {
      continue;
    }

    broadcaster.to(roomId).emit("game:event", { event });
  }
}

/** 将共享网络请求转换为已绑定当前 Socket 身份的服务端游戏命令。 */
function createServerGameCommand(request: SubmitGameCommandRequest, playerId: PlayerId) {
  switch (request.type) {
    case "turn.end":
      return { commandId: request.commandId, playerId, type: request.type } as const;
    case "map.move":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        direction: request.direction,
      } as const;
    case "battle.attack":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        targetPlayerId: request.targetPlayerId,
      } as const;
    case "revival.attemptReincarnation":
      return { commandId: request.commandId, playerId, type: request.type } as const;
    case "inventory.move":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        itemInstanceId: request.itemInstanceId,
        targetPosition: request.targetPosition,
      } as const;
    case "inventory.merge":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        sourceItemInstanceId: request.sourceItemInstanceId,
        targetItemInstanceId: request.targetItemInstanceId,
      } as const;
    case "inventory.split":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        sourceItemInstanceId: request.sourceItemInstanceId,
        splitQuantity: request.splitQuantity,
        newItemInstanceId: request.newItemInstanceId,
        targetPosition: request.targetPosition,
      } as const;
    case "inventory.discard":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        itemInstanceId: request.itemInstanceId,
      } as const;
    case "temporaryPickup.store":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        ...(request.targetPosition === undefined ? {} : { targetPosition: request.targetPosition }),
      } as const;
    case "temporaryPickup.abandon":
      return { commandId: request.commandId, playerId, type: request.type } as const;
    case "equipment.equip":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        itemInstanceId: request.itemInstanceId,
        slot: request.slot,
        ...(request.replacedEquipmentPosition === undefined
          ? {}
          : { replacedEquipmentPosition: request.replacedEquipmentPosition }),
      } as const;
    case "equipment.unequip":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        slot: request.slot,
        targetPosition: request.targetPosition,
      } as const;
    case "item.use":
      return {
        commandId: request.commandId,
        playerId,
        type: request.type,
        itemDefinitionId: request.itemDefinitionId,
      } as const;
  }
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
