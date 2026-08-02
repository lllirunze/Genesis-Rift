/** 服务端完成启动后向客户端公布的协议元数据。 */
export interface ServerReadyPayload {
  protocolVersion: number;
}

/** 客户端可以主动发送给服务端的事件契约。 */
export interface ClientToServerEvents {
  "client:hello": (payload: { protocolVersion: number }) => void;
}

/** 服务端可以主动发送给客户端的事件契约。 */
export interface ServerToClientEvents {
  "server:ready": (payload: ServerReadyPayload) => void;
}

/** 服务端多实例之间的事件契约，当前版本暂未启用。 */
export interface InterServerEvents {}

/** 绑定在单个网络连接上的服务端会话数据。 */
export interface ServerSocketData {
  playerId?: string;
}
