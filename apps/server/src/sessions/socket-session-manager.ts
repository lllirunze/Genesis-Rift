import type { PlayerId, RoomId } from "@genesis-rift/shared";

/** 描述服务端 Socket 会话可能返回的稳定错误代码。 */
export type SocketSessionErrorCode = "SOCKET_IDENTITY_MISMATCH" | "NOT_JOINED";

/** 描述 Socket 会话管理器抛出的可映射网络错误。 */
export class SocketSessionError extends Error {
  readonly code: SocketSessionErrorCode;

  /**
   * 方法名：constructor
   * 作用：创建包含稳定错误代码的 Socket 会话异常。
   * @param code 供共享网络协议返回的错误代码。
   * @param message 便于日志和调试定位的英文错误描述。
   * @returns 无返回值。
   */
  constructor(code: SocketSessionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** 描述一条网络连接在服务端绑定的玩家身份与房间归属。 */
export interface SocketPlayerSession {
  readonly socketId: string;
  readonly playerId: PlayerId;
  readonly roomId: RoomId | null;
}

/** 管理单个服务端进程中 Socket 连接与玩家身份之间的一对一关系。 */
export class SocketSessionManager {
  readonly #sessions = new Map<string, SocketPlayerSession>();

  /**
   * 方法名：assertCanBindPlayer
   * 作用：在提交房间变化前检查连接是否可以绑定给指定玩家身份。
   * @param socketId 当前 Socket 连接标识。
   * @param playerId 客户端请求声明的玩家标识。
   * @returns 无返回值。
   * @throws 同一连接已绑定其他玩家时抛出错误。
   */
  assertCanBindPlayer(socketId: string, playerId: PlayerId): void {
    assertNonEmptyString(socketId, "socketId");
    assertPlayerId(playerId);
    const existing = this.#sessions.get(socketId);

    if (existing !== undefined && existing.playerId !== playerId) {
      throw new SocketSessionError(
        "SOCKET_IDENTITY_MISMATCH",
        `Socket identity cannot change: ${socketId}`,
      );
    }
  }

  /**
   * 方法名：bindPlayer
   * 作用：将首次请求的玩家身份绑定到当前 Socket，后续请求必须保持相同身份。
   * @param socketId 当前 Socket 连接标识。
   * @param playerId 需要绑定的玩家标识。
   * @returns 创建或保留后的 Socket 玩家会话。
   * @throws 同一连接已绑定其他玩家时抛出错误。
   */
  bindPlayer(socketId: string, playerId: PlayerId): SocketPlayerSession {
    this.assertCanBindPlayer(socketId, playerId);
    const existing = this.#sessions.get(socketId);

    if (existing !== undefined) {
      return existing;
    }

    const session = Object.freeze({ socketId, playerId, roomId: null });
    this.#sessions.set(socketId, session);
    return session;
  }

  /**
   * 方法名：assignRoom
   * 作用：在创建或加入房间成功后为指定 Socket 写入当前唯一房间归属。
   * @param socketId 当前 Socket 连接标识。
   * @param roomId 已成功创建或加入的房间标识。
   * @returns 更新后的 Socket 玩家会话。
   * @throws 当前连接尚未绑定玩家身份时抛出错误。
   */
  assignRoom(socketId: string, roomId: RoomId): SocketPlayerSession {
    assertNonEmptyString(socketId, "socketId");
    assertRoomId(roomId);
    const session = this.getBoundSession(socketId);
    const nextSession = Object.freeze({ ...session, roomId });
    this.#sessions.set(socketId, nextSession);
    return nextSession;
  }

  /**
   * 方法名：getJoinedSession
   * 作用：读取已绑定玩家且已加入当前房间的 Socket 会话。
   * @param socketId 当前 Socket 连接标识。
   * @returns 包含房间归属的玩家会话。
   * @throws 连接尚未绑定或尚未加入房间时抛出错误。
   */
  getJoinedSession(socketId: string): SocketPlayerSession & { readonly roomId: RoomId } {
    const session = this.getBoundSession(socketId);

    if (session.roomId === null) {
      throw new SocketSessionError("NOT_JOINED", `Socket has not joined a room: ${socketId}`);
    }

    return session as SocketPlayerSession & { readonly roomId: RoomId };
  }

  /**
   * 方法名：removeSocket
   * 作用：在连接断开时清理服务端保存的 Socket 会话信息。
   * @param socketId 已断开的 Socket 连接标识。
   * @returns 无返回值。
   */
  removeSocket(socketId: string): void {
    assertNonEmptyString(socketId, "socketId");
    this.#sessions.delete(socketId);
  }

  /** 读取已绑定身份的 Socket 会话。 */
  private getBoundSession(socketId: string): SocketPlayerSession {
    assertNonEmptyString(socketId, "socketId");
    const session = this.#sessions.get(socketId);

    if (session === undefined) {
      throw new SocketSessionError("NOT_JOINED", `Socket has not bound a player: ${socketId}`);
    }

    return session;
  }
}

/** 校验 Socket 标识为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验玩家标识可用于服务端会话绑定。 */
function assertPlayerId(playerId: PlayerId): void {
  assertNonEmptyString(playerId, "playerId");
}

/** 校验房间标识可用于服务端会话绑定。 */
function assertRoomId(roomId: RoomId): void {
  assertNonEmptyString(roomId, "roomId");
}
