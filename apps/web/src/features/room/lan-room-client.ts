import {
  PROTOCOL_VERSION,
  type LanRequestRejectedPayload,
  type LanGameSessionSnapshot,
  type LanCharacterSelection,
  type LanRoomPlayerSnapshot,
  type LanRoomSnapshot,
  type RoomId,
  type LanHexDirection,
} from "@genesis-rift/shared";

import type { LanSocket } from "../../lib/socket-client.ts";
import type { ConnectionStatus } from "../../state/connection-store.ts";

/** 描述大厅客户端对界面公开的只读状态。 */
export interface LanRoomClientState {
  readonly connectionStatus: ConnectionStatus;
  readonly room: LanRoomSnapshot | null;
  readonly game: LanGameSessionSnapshot | null;
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
    game: null,
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
    socket.on("game:started", this.handleGameStarted);
    socket.on("game:snapshot", this.handleGameUpdated);
    socket.on("game:commandAccepted", this.handleGameUpdated);
    socket.on("game:rejected", this.handleRoomRejected);
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
   * 方法名：updateCharacterSelection
   * 作用：向服务端提交当前玩家在大厅中的角色创建选择。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @param selection 性别、职业与种族的完整选择。
   * @returns 无返回值。
   */
  updateCharacterSelection(requestId: string, selection: LanCharacterSelection): void {
    this.assertConnected();
    this.#socket.emit("room:updateCharacterSelection", { requestId, selection });
  }

  /**
   * 方法名：startGame
   * 作用：由当前房主向服务端请求锁定大厅并启动唯一对局。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @returns 无返回值。
   */
  startGame(requestId: string): void {
    this.assertConnected();
    this.#socket.emit("game:start", { requestId });
  }

  /**
   * 方法名：endActivePlayerTurn
   * 作用：请求服务端结束当前浏览器玩家的行动回合。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @param commandId 可用于幂等校验的唯一游戏命令标识。
   * @returns 无返回值。
   */
  endActivePlayerTurn(requestId: string, commandId: string): void {
    this.assertConnected();
    this.#socket.emit("game:command", { requestId, commandId, type: "turn.end" });
  }

  /**
   * 方法名：moveActivePlayer
   * 作用：请求服务端将当前浏览器玩家向指定相邻六边形方向移动一步。
   * @param requestId 可追踪本次网络请求的唯一标识。
   * @param commandId 可用于幂等校验的唯一游戏命令标识。
   * @param direction 需要进入的相邻六边形方向。
   * @returns 无返回值。
   */
  moveActivePlayer(requestId: string, commandId: string, direction: LanHexDirection): void {
    this.assertConnected();
    this.#socket.emit("game:command", { requestId, commandId, type: "map.move", direction });
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
    this.#socket.off("game:started", this.handleGameStarted);
    this.#socket.off("game:snapshot", this.handleGameUpdated);
    this.#socket.off("game:commandAccepted", this.handleGameUpdated);
    this.#socket.off("game:rejected", this.handleRoomRejected);
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

  /** 接收开局和后续广播的公开游戏快照。 */
  private readonly handleGameStarted = (payload: {
    readonly game: LanGameSessionSnapshot;
  }): void => {
    this.setState({ ...this.#state, game: payload.game, rejection: null });
  };

  /** 接收游戏运行期间的公开快照更新。 */
  private readonly handleGameUpdated = (payload: {
    readonly game: LanGameSessionSnapshot;
  }): void => {
    this.setState({ ...this.#state, game: payload.game });
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
