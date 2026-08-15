import { useEffect, useEffectEvent, useRef, useState } from "react";

import type {
  LanHexDirection,
  LanCharacterSelection,
  LanRoomPlayerSnapshot,
  RoomId,
} from "@genesis-rift/shared";

import { createLanSocket } from "../../lib/socket-client.ts";
import { useConnectionStore } from "../../state/connection-store.ts";
import { getOrCreateLanPlayerIdentity, type LanPlayerIdentity } from "./lan-player-identity.ts";
import { LanRoomClient, type LanRoomClientState } from "./lan-room-client.ts";

/** 描述大厅 Hook 对 React 组件公开的状态和操作。 */
export interface LanRoomLobby {
  readonly identity: LanPlayerIdentity;
  readonly state: LanRoomClientState;
  createRoom(displayName: string): void;
  joinRoom(displayName: string): void;
  requestSnapshot(): void;
  updateCharacterSelection(selection: LanCharacterSelection): void;
  startGame(): void;
  endActivePlayerTurn(): void;
  moveActivePlayer(direction: LanHexDirection): void;
  decideEventReveal(instanceId: string, action: "REVEAL" | "DECLINE"): void;
  selectEventOption(instanceId: string, optionId: string): void;
}

/**
 * 方法名：useLanRoomLobby
 * 作用：创建并管理浏览器大厅 Socket 客户端，将权威房间快照同步到 React 状态。
 * @param serverUrl 当前局域网服务端地址。
 * @returns 可用于创建、加入和展示唯一房间大厅的状态及操作。
 */
export function useLanRoomLobby(serverUrl: string): LanRoomLobby {
  const [identity] = useState(() => getOrCreateLanPlayerIdentity(window.localStorage));
  const [state, setState] = useState<LanRoomClientState>({
    connectionStatus: "offline",
    room: null,
    game: null,
    rejection: null,
  });
  const clientRef = useRef<LanRoomClient | null>(null);
  const setConnectionStatus = useConnectionStore((connection) => connection.setStatus);
  const handleClientState = useEffectEvent((nextState: LanRoomClientState) => {
    setState(nextState);
    setConnectionStatus(nextState.connectionStatus);
  });

  useEffect(() => {
    const client = new LanRoomClient(createLanSocket(serverUrl));
    clientRef.current = client;
    const unsubscribe = client.subscribe(handleClientState);
    client.connect();

    return () => {
      unsubscribe();
      client.disconnect();
      client.destroy();

      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [serverUrl]);

  return {
    identity,
    state,
    createRoom(displayName) {
      getClient(clientRef).createRoom(
        createRequestId(),
        createRoomId(),
        createPlayerSnapshot(identity, displayName),
      );
    },
    joinRoom(displayName) {
      getClient(clientRef).joinRoom(createRequestId(), createPlayerSnapshot(identity, displayName));
    },
    requestSnapshot() {
      getClient(clientRef).requestRoomSnapshot(createRequestId());
    },
    updateCharacterSelection(selection) {
      getClient(clientRef).updateCharacterSelection(createRequestId(), selection);
    },
    startGame() {
      getClient(clientRef).startGame(createRequestId());
    },
    endActivePlayerTurn() {
      getClient(clientRef).endActivePlayerTurn(createRequestId(), createCommandId());
    },
    moveActivePlayer(direction) {
      getClient(clientRef).moveActivePlayer(createRequestId(), createCommandId(), direction);
    },
    decideEventReveal(instanceId, action) {
      getClient(clientRef).decideEventReveal(
        createRequestId(),
        createCommandId(),
        instanceId,
        action,
      );
    },
    selectEventOption(instanceId, optionId) {
      getClient(clientRef).selectEventOption(
        createRequestId(),
        createCommandId(),
        instanceId,
        optionId,
      );
    },
  };
}

/** 读取已建立的大厅客户端；组件尚未完成连接初始化时明确拒绝操作。 */
function getClient(clientRef: { readonly current: LanRoomClient | null }): LanRoomClient {
  if (clientRef.current === null) {
    throw new Error("LAN room client is not ready");
  }

  return clientRef.current;
}

/** 创建房间或加入请求需要的公开玩家信息。 */
function createPlayerSnapshot(
  identity: LanPlayerIdentity,
  displayName: string,
): LanRoomPlayerSnapshot {
  const normalizedDisplayName = displayName.trim();

  if (normalizedDisplayName.length === 0) {
    throw new Error("Display name must not be empty");
  }

  return {
    playerId: identity.playerId,
    displayName: normalizedDisplayName,
    characterSelection: null,
  };
}

/** 使用浏览器安全随机标识生成可追踪的网络请求标识。 */
function createRequestId(): string {
  return `request_${crypto.randomUUID()}`;
}

/** 使用浏览器安全随机标识生成本局唯一房间标识。 */
function createRoomId(): RoomId {
  return `room_${crypto.randomUUID()}` as RoomId;
}

/** 使用浏览器安全随机标识创建服务端可去重的游戏命令编号。 */
function createCommandId(): string {
  return `command_${crypto.randomUUID()}`;
}
