import type { ClientToServerEvents, ServerToClientEvents } from "@genesis-rift/shared";
import { io, type Socket } from "socket.io-client";

/** 描述当前模块对外公开的业务数据契约。 */
export type LanSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * 方法名：createLanSocket
 * 作用：创建并校验该方法所负责的业务对象。
 * @param serverUrl 方法所需的 serverUrl 参数。
 * @returns 本次处理得到的结果。
 */
export function createLanSocket(serverUrl: string): LanSocket {
  return io(serverUrl, {
    autoConnect: false,
  });
}
