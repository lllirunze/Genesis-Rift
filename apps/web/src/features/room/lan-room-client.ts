import {
  PROTOCOL_VERSION,
  type LanRequestRejectedPayload,
  type LanRoomPlayerSnapshot,
  type LanRoomSnapshot,
  type RoomId,
} from "@genesis-rift/shared";

import type { LanSocket } from "../../lib/socket-client.ts";
import type { ConnectionStatus } from "../../state/connection-store.ts";

/** 描述大厅客户端对界面公开的只读状态。 */
export interface LanRoomClientState {
  readonly connectionStatus: ConnectionStatus;
  readonly room: LanRoomSnapshot | null;
  readonly rejection: LanRequestRejectedPayload | null;
}

/** 描述大厅客户端状态变化的订阅函数。 */
export type LanRoomClientListener = (state: LanRoomClientState) => void;

/** 管理一条浏览器 Socket 连接的房间协议、快照和拒绝状态。 */
export class LanRoomClient {
  readonly #socket: LanSocket;
  readonly #listeners = new Set<LanRoomClientListener>();
  #state: LanRoomClientState = {
    connectionStatus: "offline",
    room: null,
    rejection: null,
  };

  /**
   * 方法名：constructor
   * 作用：保存 Socket 并注册所有共享房间协议事件监听器。
   * @param socket 已创建但可尚未连接的局域网 Socket。
   * @returns 无返回值。
   */
  constructor(socket: LanSocket) {
    this.#socket = socket;
    socket.on("connect", this.handleConnected);
    socket.on("disconnect", this.handleDisconnected);
    socket.on("server:ready", this.handleServerReady);
    socket.on("room:created", this.handleRoomUpdated);
    socket.on("room:joined", this.handleRoomUpdated);
    socket.on("room:snapshot", this.handleRoomUpdated);
    socket.on("room:rejected", this.handleRoomRejected);
  }

  /**
   * 方法名：getState
   * 作用：读取当前连接和房间快照状态，不修改客户端内部数据。
   * @returns 当前大厅客户端状态。
   */
  getState(): LanRoomClientState {
    return this.#state;
  }

  /**
   * 方法名：subscribe
   * 作用：订阅大厅客户端状态，并立即获得当前快照。
   * @param listener 接收状态变化的界面或控制器函数。
   * @returns 用于取消订阅的函数。
   */
  subscribe(listener: LanRoomClientListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /**
   * 方法名：connect
   * 作用：建立浏览器到局域网权威服务端的 Socket 连接。
   * @returns 无返回值。
   */
  connect(): void {
    this.setState({ ...this.#state, connectionStatus: "connecting", rejection: null });
    this.#socket.connect();
  }

  /**
   * 方法名：disconnect
   * 作用：主动关闭当前 Socket 连接并保留最后一次大厅快照供界面展示。
   * @returns 无返回值。
   */
  disconnect(): void {
    this.#socket.disconnect();
  }

  /**
   * 方法名：createRoom
   * 作用：向服务端请求创建唯一局域网房间，并绑定当前浏览器玩家身份。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @param roomId 由房主浏览器生成的房间标识。
   * @param host 房主的公开大厅信息。
   * @returns 无返回值。
   * @throws Socket 尚未连接时抛出错误。
   */
  createRoom(requestId: string, roomId: RoomId, host: LanRoomPlayerSnapshot): void {
    this.assertConnected();
    this.#socket.emit("room:create", { requestId, roomId, host });
  }

  /**
   * 方法名：joinRoom
   * 作用：向当前唯一局域网房间提交加入请求。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @param player 加入者的公开大厅信息。
   * @returns 无返回值。
   * @throws Socket 尚未连接时抛出错误。
   */
  joinRoom(requestId: string, player: LanRoomPlayerSnapshot): void {
    this.assertConnected();
    this.#socket.emit("room:join", { requestId, player });
  }

  /**
   * 方法名：requestRoomSnapshot
   * 作用：向服务端请求当前唯一房间的最新权威大厅快照。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @returns 无返回值。
   * @throws Socket 尚未连接时抛出错误。
   */
  requestRoomSnapshot(requestId: string): void {
    this.assertConnected();
    this.#socket.emit("room:requestSnapshot", { requestId });
  }

  /**
   * 方法名：destroy
   * 作用：移除协议监听器并释放客户端订阅，避免 React 组件卸载后继续接收事件。
   * @returns 无返回值。
   */
  destroy(): void {
    this.#socket.off("connect", this.handleConnected);
    this.#socket.off("disconnect", this.handleDisconnected);
    this.#socket.off("server:ready", this.handleServerReady);
    this.#socket.off("room:created", this.handleRoomUpdated);
    this.#socket.off("room:joined", this.handleRoomUpdated);
    this.#socket.off("room:snapshot", this.handleRoomUpdated);
    this.#socket.off("room:rejected", this.handleRoomRejected);
    this.#listeners.clear();
  }

  /** 连接成功后发送协议版本并更新连接状态。 */
  private readonly handleConnected = (): void => {
    this.#socket.emit("client:hello", { protocolVersion: PROTOCOL_VERSION });
    this.setState({ ...this.#state, connectionStatus: "connected" });
  };

  /** 连接关闭后更新连接状态，不清除最后一次可展示的大厅快照。 */
  private readonly handleDisconnected = (): void => {
    this.setState({ ...this.#state, connectionStatus: "offline" });
  };

  /** 服务端就绪事件当前只携带版本信息，版本协商由服务端后续扩展处理。 */
  private readonly handleServerReady = (): void => undefined;

  /** 接收服务端创建、加入或广播的权威房间快照。 */
  private readonly handleRoomUpdated = (payload: { readonly room: LanRoomSnapshot }): void => {
    this.setState({ ...this.#state, room: payload.room, rejection: null });
  };

  /** 接收服务端对请求的稳定拒绝结果。 */
  private readonly handleRoomRejected = (payload: LanRequestRejectedPayload): void => {
    this.setState({ ...this.#state, rejection: payload });
  };

  /** 发布新的不可变状态给所有订阅者。 */
  private setState(state: LanRoomClientState): void {
    this.#state = Object.freeze(state);

    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }

  /** 确保网络请求只在 Socket 已连接时发出，避免隐式离线缓存请求。 */
  private assertConnected(): void {
    if (!this.#socket.connected) {
      throw new Error("LAN socket is not connected");
    }
  }
}
