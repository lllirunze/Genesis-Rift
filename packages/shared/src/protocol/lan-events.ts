import type { PlayerId, RoomId } from "../types/ids.ts";

/** 服务端完成启动后向客户端公布的协议元数据。 */
export interface ServerReadyPayload {
  protocolVersion: number;
}

/** 描述可在房间大厅展示的玩家公开信息。 */
export interface LanRoomPlayerSnapshot {
  readonly playerId: PlayerId;
  readonly displayName: string;
}

/** 描述服务端权威维护的房间大厅快照。 */
export interface LanRoomSnapshot {
  readonly roomId: RoomId;
  readonly hostPlayerId: PlayerId;
  readonly status: "lobby" | "running" | "closed";
  readonly revision: number;
  readonly players: readonly LanRoomPlayerSnapshot[];
}

/** 描述客户端创建局域网房间的请求。 */
export interface CreateLanRoomRequest {
  readonly requestId: string;
  readonly roomId: RoomId;
  readonly host: LanRoomPlayerSnapshot;
}

/** 描述客户端加入现有局域网房间的请求。 */
export interface JoinLanRoomRequest {
  readonly requestId: string;
  readonly player: LanRoomPlayerSnapshot;
}

/** 描述客户端主动获取当前房间快照的请求。 */
export interface RequestLanRoomSnapshot {
  readonly requestId: string;
}

/** 描述服务端拒绝一项局域网请求时返回的稳定信息。 */
export interface LanRequestRejectedPayload {
  readonly requestId: string;
  readonly code:
    | "ROOM_NOT_FOUND"
    | "ROOM_ALREADY_EXISTS"
    | "PLAYER_ALREADY_JOINED"
    | "ROOM_NOT_JOINABLE"
    | "SOCKET_IDENTITY_MISMATCH"
    | "NOT_JOINED"
    | "REQUEST_INVALID";
  readonly message: string;
}

/** 客户端可以主动发送给服务端的事件契约。 */
export interface ClientToServerEvents {
  "client:hello": (payload: { protocolVersion: number }) => void;
  "room:create": (payload: CreateLanRoomRequest) => void;
  "room:join": (payload: JoinLanRoomRequest) => void;
  "room:requestSnapshot": (payload: RequestLanRoomSnapshot) => void;
}

/** 服务端可以主动发送给客户端的事件契约。 */
export interface ServerToClientEvents {
  "server:ready": (payload: ServerReadyPayload) => void;
  "room:created": (payload: { readonly requestId: string; readonly room: LanRoomSnapshot }) => void;
  "room:joined": (payload: { readonly requestId: string; readonly room: LanRoomSnapshot }) => void;
  "room:snapshot": (payload: {
    readonly requestId: string;
    readonly room: LanRoomSnapshot;
  }) => void;
  "room:rejected": (payload: LanRequestRejectedPayload) => void;
}

/** 服务端多实例之间的事件契约，当前版本暂未启用。 */
export interface InterServerEvents {}

/** 绑定在单个网络连接上的服务端会话数据。 */
export interface ServerSocketData {
  playerId?: PlayerId;
  roomId?: RoomId;
}
