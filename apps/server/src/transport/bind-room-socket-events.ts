import type {
  CreateLanRoomRequest,
  JoinLanRoomRequest,
  LanRequestRejectedPayload,
  LanRoomSnapshot,
  PlayerId,
  RequestLanRoomSnapshot,
  UpdateLanCharacterSelectionRequest,
} from "@genesis-rift/shared";
import { IDENTITY_CONFIGS, RACE_CONFIGS } from "@genesis-rift/game-data";

import { RoomManager, RoomManagerError } from "../rooms/room-manager.ts";
import { SocketSessionError, SocketSessionManager } from "../sessions/socket-session-manager.ts";

/** 描述房间适配器实际需要的最小 Socket.IO 连接能力。 */
export interface RoomSocket {
  readonly id: string;

  on(event: "room:create", listener: (payload: CreateLanRoomRequest) => void): void;
  on(event: "room:join", listener: (payload: JoinLanRoomRequest) => void): void;
  on(event: "room:requestSnapshot", listener: (payload: RequestLanRoomSnapshot) => void): void;
  on(
    event: "room:updateCharacterSelection",
    listener: (payload: UpdateLanCharacterSelectionRequest) => void,
  ): void;
  on(event: "disconnect", listener: () => void): void;
  emit(
    event: "room:created",
    payload: { readonly requestId: string; readonly room: LanRoomSnapshot },
  ): void;
  emit(
    event: "room:joined",
    payload: { readonly requestId: string; readonly room: LanRoomSnapshot },
  ): void;
  emit(
    event: "room:snapshot",
    payload: { readonly requestId: string; readonly room: LanRoomSnapshot },
  ): void;
  emit(event: "room:rejected", payload: LanRequestRejectedPayload): void;
  join(roomId: string): void;
}

/** 描述向 Socket.IO 房间广播大厅快照所需的最小服务端能力。 */
export interface RoomSnapshotBroadcaster {
  to(roomId: string): {
    emit(
      event: "room:snapshot",
      payload: { readonly requestId: string; readonly room: LanRoomSnapshot },
    ): void;
  };
}

/** 描述房间恢复连接成功后可由上层补充执行的游戏会话操作。 */
export interface RoomSocketBindingOptions {
  readonly onPlayerReconnected?: (playerId: PlayerId) => void;
}

/**
 * 方法名：bindRoomSocketEvents
 * 作用：将创建、加入、读取快照和断开事件绑定到唯一房间与 Socket 会话管理器。
 * @param socket 当前新连接的 Socket。
 * @param broadcaster 支持按 Socket.IO 房间广播快照的服务端对象。
 * @param roomManager 单房间权威大厅管理器。
 * @param sessionManager Socket 与玩家身份绑定管理器。
 * @returns 无返回值。
 */
export function bindRoomSocketEvents(
  socket: RoomSocket,
  broadcaster: RoomSnapshotBroadcaster,
  roomManager: RoomManager,
  sessionManager: SocketSessionManager,
  options: RoomSocketBindingOptions = {},
): void {
  socket.on("room:create", (request) => {
    handleRequest(socket, request.requestId, () => {
      sessionManager.assertCanBindPlayer(socket.id, request.host.playerId);
      const room = roomManager.createRoom(request.roomId, request.host);
      sessionManager.bindPlayer(socket.id, request.host.playerId);
      sessionManager.assignRoom(socket.id, room.roomId);
      socket.join(room.roomId);
      socket.emit("room:created", { requestId: request.requestId, room });
      broadcastSnapshot(broadcaster, room);
    });
  });

  socket.on("room:join", (request) => {
    handleRequest(socket, request.requestId, () => {
      sessionManager.assertCanBindPlayer(socket.id, request.player.playerId);
      const room = roomManager.getRoom();
      const isKnownPlayer = room.players.some(
        (candidate) => candidate.playerId === request.player.playerId,
      );

      if (isKnownPlayer && sessionManager.isPlayerConnected(request.player.playerId)) {
        throw new RoomManagerError(
          "PLAYER_ALREADY_JOINED",
          `Player already has an active connection: ${request.player.playerId}`,
        );
      }

      const nextRoom = isKnownPlayer
        ? roomManager.reconnectPlayer(request.player)
        : roomManager.joinRoom(request.player);
      sessionManager.bindPlayer(socket.id, request.player.playerId);
      sessionManager.assignRoom(socket.id, nextRoom.roomId);
      socket.join(nextRoom.roomId);
      socket.emit("room:joined", { requestId: request.requestId, room: nextRoom });

      if (isKnownPlayer) {
        options.onPlayerReconnected?.(request.player.playerId);
      }

      broadcastSnapshot(broadcaster, nextRoom);
    });
  });

  socket.on("room:requestSnapshot", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = sessionManager.getJoinedSession(socket.id);
      const room = roomManager.getRoom();

      if (session.roomId !== room.roomId) {
        throw new SocketSessionError("NOT_JOINED", "Socket is not joined to the active LAN room");
      }

      socket.emit("room:snapshot", { requestId: request.requestId, room });
    });
  });

  socket.on("room:updateCharacterSelection", (request) => {
    handleRequest(socket, request.requestId, () => {
      const session = sessionManager.getJoinedSession(socket.id);
      assertCharacterSelection(request.selection);
      const room = roomManager.updateCharacterSelection(session.playerId, request.selection);
      broadcastSnapshot(broadcaster, room);
    });
  });

  socket.on("disconnect", () => {
    sessionManager.removeSocket(socket.id);
  });
}

/** 校验浏览器提交的选择仍属于服务端部署的固定角色配置。 */
function assertCharacterSelection(request: UpdateLanCharacterSelectionRequest["selection"]): void {
  if (request.gender !== "female" && request.gender !== "male") {
    throw new RoomManagerError("CHARACTER_SELECTION_INVALID", "Character gender is invalid");
  }

  if (!(request.identityName in IDENTITY_CONFIGS)) {
    throw new RoomManagerError("CHARACTER_SELECTION_INVALID", "Character identity is invalid");
  }

  if (!(request.raceName in RACE_CONFIGS)) {
    throw new RoomManagerError("CHARACTER_SELECTION_INVALID", "Character race is invalid");
  }
}

/** 向唯一活动房间广播更新后的权威大厅快照。 */
function broadcastSnapshot(
  broadcaster: RoomSnapshotBroadcaster,
  room: ReturnType<RoomManager["getRoom"]>,
): void {
  broadcaster.to(room.roomId).emit("room:snapshot", { requestId: "server.roomUpdated", room });
}

/** 执行一项协议请求，并将已知业务错误转换为统一拒绝消息。 */
function handleRequest(socket: RoomSocket, requestId: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    socket.emit("room:rejected", createRejectedPayload(requestId, error));
  }
}

/** 将服务端房间、会话和未知输入异常映射为共享协议拒绝结构。 */
function createRejectedPayload(requestId: string, error: unknown): LanRequestRejectedPayload {
  if (error instanceof RoomManagerError || error instanceof SocketSessionError) {
    return { requestId, code: error.code, message: error.message };
  }

  return {
    requestId,
    code: "REQUEST_INVALID",
    message: "The room request is invalid.",
  };
}
