import type { PlayerId } from "@genesis-rift/shared";

/** 浏览器本地持久化局域网玩家标识使用的存储键。 */
export const LAN_PLAYER_ID_STORAGE_KEY = "genesis-rift.lan-player-id";

/** 描述玩家在浏览器内长期保留的局域网身份。 */
export interface LanPlayerIdentity {
  readonly playerId: PlayerId;
}

/**
 * 方法名：getOrCreateLanPlayerIdentity
 * 作用：读取浏览器已保存的玩家标识，首次访问时生成并持久化一个新标识。
 * @param storage 浏览器或测试环境提供的键值存储。
 * @param createId 生成新玩家标识的安全随机函数。
 * @returns 可跨浏览器重连复用的局域网玩家身份。
 * @throws 存储接口或生成结果为空时抛出错误。
 */
export function getOrCreateLanPlayerIdentity(
  storage: Pick<Storage, "getItem" | "setItem">,
  createId: () => string = () => crypto.randomUUID(),
): LanPlayerIdentity {
  const existingPlayerId = storage.getItem(LAN_PLAYER_ID_STORAGE_KEY);

  if (existingPlayerId !== null && existingPlayerId.trim().length > 0) {
    return Object.freeze({ playerId: existingPlayerId as PlayerId });
  }

  const playerId = createId().trim();

  if (playerId.length === 0) {
    throw new Error("Generated LAN player id must not be empty");
  }

  storage.setItem(LAN_PLAYER_ID_STORAGE_KEY, playerId);
  return Object.freeze({ playerId: playerId as PlayerId });
}
