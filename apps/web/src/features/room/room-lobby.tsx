import { useState } from "react";

import { useConnectionStore } from "../../state/connection-store.ts";
import { useLanRoomLobby } from "./use-lan-room-lobby.ts";

/**
 * 方法名：RoomLobby
 * 作用：渲染创建、加入和查看唯一局域网房间大厅的最小操作界面。
 * @returns 局域网连接和大厅快照界面。
 */
export function RoomLobby() {
  const serverUrl = useConnectionStore((connection) => connection.serverUrl);
  const setServerUrl = useConnectionStore((connection) => connection.setServerUrl);
  const [displayName, setDisplayName] = useState("Player");
  const lobby = useLanRoomLobby(serverUrl);
  const isConnected = lobby.state.connectionStatus === "connected";
  const room = lobby.state.room;

  return (
    <section className="room-lobby" aria-labelledby="room-lobby-heading">
      <div className="room-lobby__heading">
        <div>
          <p>LAN Lobby</p>
          <h2 id="room-lobby-heading">同一张桌子，唯一房间</h2>
        </div>
        <span className={`connection-badge connection-badge--${lobby.state.connectionStatus}`}>
          {getConnectionLabel(lobby.state.connectionStatus)}
        </span>
      </div>

      <div className="room-lobby__form">
        <label>
          服务地址
          <input
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="http://192.168.1.10:3000"
          />
        </label>
        <label>
          玩家名称
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <p className="room-lobby__identity">本机身份：{lobby.identity.playerId}</p>
      </div>

      <div className="room-lobby__actions">
        <button type="button" disabled={!isConnected} onClick={() => lobby.createRoom(displayName)}>
          创建房间
        </button>
        <button type="button" disabled={!isConnected} onClick={() => lobby.joinRoom(displayName)}>
          加入当前房间
        </button>
        <button type="button" disabled={!isConnected} onClick={() => lobby.requestSnapshot()}>
          刷新大厅
        </button>
      </div>

      {lobby.state.rejection !== null ? (
        <p className="room-lobby__error" role="alert">
          {lobby.state.rejection.code}: {lobby.state.rejection.message}
        </p>
      ) : null}

      <div className="room-lobby__snapshot" aria-live="polite">
        {room === null ? (
          <p>尚未加入房间。连接服务端后，由一位玩家创建，其他玩家直接加入当前房间。</p>
        ) : (
          <>
            <p>
              房间 {room.roomId} · 版本 {room.revision} · 房主 {room.hostPlayerId}
            </p>
            <ul>
              {room.players.map((player) => (
                <li key={player.playerId}>
                  <strong>{player.displayName}</strong>
                  <span>{player.playerId === room.hostPlayerId ? "房主" : "玩家"}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** 将内部连接状态转换为玩家可快速理解的中文文案。 */
function getConnectionLabel(status: "offline" | "connecting" | "connected"): string {
  if (status === "connected") {
    return "已连接";
  }

  if (status === "connecting") {
    return "连接中";
  }

  return "未连接";
}
