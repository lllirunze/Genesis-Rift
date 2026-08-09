import type {
  LanRoomPlayerSnapshot,
  LanRoomSnapshot,
  PlayerId,
  RoomId,
} from "@genesis-rift/shared";

/** 描述可由房间管理器识别的稳定业务错误代码。 */
export type RoomManagerErrorCode =
  "ROOM_NOT_FOUND" | "ROOM_ALREADY_EXISTS" | "PLAYER_ALREADY_JOINED" | "ROOM_NOT_JOINABLE";

/** 描述房间管理器抛出的可映射网络错误。 */
export class RoomManagerError extends Error {
  readonly code: RoomManagerErrorCode;

  /**
   * 方法名：constructor
   * 作用：创建包含稳定错误代码的房间管理异常。
   * @param code 供网络协议返回的业务错误代码。
   * @param message 便于日志与调试定位的英文错误描述。
   * @returns 无返回值。
   */
  constructor(code: RoomManagerErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** 管理单进程局域网服务器中的唯一权威房间大厅状态。 */
export class RoomManager {
  #room: LanRoomSnapshot | null = null;

  /**
   * 方法名：createRoom
   * 作用：创建一个由房主自动加入的权威大厅房间。
   * @param roomId 新房间的唯一标识。
   * @param host 房主的公开大厅信息。
   * @returns 新建房间的不可变快照。
   * @throws 已存在活动房间或房主信息非法时抛出错误。
   */
  createRoom(roomId: RoomId, host: LanRoomPlayerSnapshot): LanRoomSnapshot {
    assertRoomId(roomId);
    validatePlayer(host);

    if (this.#room !== null) {
      throw new RoomManagerError("ROOM_ALREADY_EXISTS", "The active LAN room already exists");
    }

    const room = freezeRoom({
      roomId,
      hostPlayerId: host.playerId,
      status: "lobby",
      revision: 1,
      players: [host],
    });
    this.#room = room;
    return room;
  }

  /**
   * 方法名：joinRoom
   * 作用：将新玩家加入仍处于大厅状态的房间并提升快照版本。
   * @param player 加入者的公开大厅信息。
   * @returns 加入成功后的最新权威房间快照。
   * @throws 房间不存在、状态不可加入或玩家已存在时抛出错误。
   */
  joinRoom(player: LanRoomPlayerSnapshot): LanRoomSnapshot {
    const current = this.getRoom();
    validatePlayer(player);

    if (current.status !== "lobby") {
      throw new RoomManagerError("ROOM_NOT_JOINABLE", "The active LAN room is not joinable");
    }

    if (current.players.some((candidate) => candidate.playerId === player.playerId)) {
      throw new RoomManagerError(
        "PLAYER_ALREADY_JOINED",
        `Player already joined room: ${player.playerId}`,
      );
    }

    const room = freezeRoom({
      ...current,
      revision: current.revision + 1,
      players: [...current.players, player],
    });
    this.#room = room;
    return room;
  }

  /**
   * 方法名：reconnectPlayer
   * 作用：为已存在于房间成员列表但已断开网络连接的玩家恢复大厅归属。
   * @param player 请求恢复连接的公开玩家信息。
   * @returns 不修改成员列表的当前权威房间快照。
   * @throws 玩家不属于当前房间或显示名称与原身份不一致时抛出错误。
   */
  reconnectPlayer(player: LanRoomPlayerSnapshot): LanRoomSnapshot {
    const current = this.getRoom();
    validatePlayer(player);
    const existing = current.players.find((candidate) => candidate.playerId === player.playerId);

    if (existing === undefined) {
      throw new RoomManagerError(
        "ROOM_NOT_JOINABLE",
        "Player does not belong to the active LAN room",
      );
    }

    if (existing.displayName !== player.displayName) {
      throw new RoomManagerError(
        "PLAYER_ALREADY_JOINED",
        `Player display name does not match the existing room member: ${player.playerId}`,
      );
    }

    return current;
  }

  /**
   * 方法名：getRoom
   * 作用：读取指定房间当前权威快照，不允许调用方修改内部状态。
   * @returns 对应房间的不可变大厅快照。
   * @throws 当前服务端尚未创建房间时抛出错误。
   */
  getRoom(): LanRoomSnapshot {
    const room = this.#room;

    if (room === null) {
      throw new RoomManagerError("ROOM_NOT_FOUND", "The active LAN room does not exist");
    }

    return room;
  }
}

/** 将房间及其玩家集合冻结，避免服务层外部引用修改权威状态。 */
function freezeRoom(room: LanRoomSnapshot): LanRoomSnapshot {
  return Object.freeze({
    ...room,
    players: Object.freeze(room.players.map((player) => Object.freeze({ ...player }))),
  });
}

/** 校验房间标识可用于服务端内存索引。 */
function assertRoomId(roomId: RoomId): void {
  if (typeof roomId !== "string" || roomId.trim().length === 0) {
    throw new TypeError("roomId must be a non-empty string");
  }
}

/** 校验进入大厅的玩家具有稳定标识与可展示名称。 */
function validatePlayer(player: LanRoomPlayerSnapshot): void {
  assertPlayerId(player.playerId);

  if (player.displayName.trim().length === 0) {
    throw new TypeError("displayName must be a non-empty string");
  }
}

/** 校验玩家标识可作为房间成员唯一键。 */
function assertPlayerId(playerId: PlayerId): void {
  if (typeof playerId !== "string" || playerId.trim().length === 0) {
    throw new TypeError("playerId must be a non-empty string");
  }
}
