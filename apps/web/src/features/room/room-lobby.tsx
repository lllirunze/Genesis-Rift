import { useState } from "react";

import { IDENTITY_CONFIG_LIST, RACE_CONFIG_LIST } from "@genesis-rift/game-data";
import type { LanCharacterSelection } from "@genesis-rift/shared";

import { useConnectionStore } from "../../state/connection-store.ts";
import { GameSessionPanel } from "../game-session/game-session-panel.tsx";
import { useLanRoomLobby } from "./use-lan-room-lobby.ts";

const DEFAULT_SELECTION: LanCharacterSelection = {
  gender: "female",
  identityName: "mage",
  raceName: "human",
};

/**
 * 方法名：RoomLobby
 * 作用：渲染创建、加入和查看唯一局域网房间大厅的最小操作界面。
 * @returns 局域网连接和大厅快照界面。
 */
export function RoomLobby() {
  const serverUrl = useConnectionStore((connection) => connection.serverUrl);
  const setServerUrl = useConnectionStore((connection) => connection.setServerUrl);
  const [displayName, setDisplayName] = useState("Player");
  const [selection, setSelection] = useState<LanCharacterSelection>(DEFAULT_SELECTION);
  const lobby = useLanRoomLobby(serverUrl);
  const isConnected = lobby.state.connectionStatus === "connected";
  const room = lobby.state.room;
  const currentPlayer = room?.players.find((player) => player.playerId === lobby.identity.playerId);
  const isHost = room?.hostPlayerId === lobby.identity.playerId;
  const everyoneSelected =
    room !== null && room.players.every((player) => player.characterSelection !== null);

  if (lobby.state.game !== null && room !== null) {
    return (
      <GameSessionPanel
        game={lobby.state.game}
        room={room}
        localPlayerId={lobby.identity.playerId}
        isConnected={isConnected}
        rejection={lobby.state.rejection}
        onEndActivePlayerTurn={lobby.endActivePlayerTurn}
        onMoveActivePlayer={lobby.moveActivePlayer}
        onDecideEventReveal={lobby.decideEventReveal}
        onSelectEventOption={lobby.selectEventOption}
      />
    );
  }

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

      {room !== null && room.status === "lobby" ? (
        <div className="character-selection">
          <div>
            <p>Character Selection</p>
            <h3>确定本局角色</h3>
          </div>
          <div className="character-selection__form">
            <label>
              性别
              <select
                value={selection.gender}
                onChange={(event) =>
                  setSelection((current) => ({
                    ...current,
                    gender: event.target.value as "female" | "male",
                  }))
                }
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label>
              种族
              <select
                value={selection.raceName}
                onChange={(event) =>
                  setSelection((current) => ({ ...current, raceName: event.target.value }))
                }
              >
                {RACE_CONFIG_LIST.map((race) => (
                  <option key={race.id} value={race.name}>
                    {race.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              职业
              <select
                value={selection.identityName}
                onChange={(event) =>
                  setSelection((current) => ({ ...current, identityName: event.target.value }))
                }
              >
                {IDENTITY_CONFIG_LIST.map((identity) => (
                  <option key={identity.id} value={identity.name}>
                    {identity.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="character-selection__preview">
            <img
              src={getPortraitPath(selection.gender, selection.raceName, selection.identityName)}
              alt={`${selection.gender} ${selection.raceName} ${selection.identityName}`}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
            <p>
              {selection.gender} · {selection.raceName} · {selection.identityName}
            </p>
          </div>
          <div className="room-lobby__actions">
            <button
              type="button"
              disabled={!isConnected}
              onClick={() => lobby.updateCharacterSelection(selection)}
            >
              确认角色
            </button>
            {isHost ? (
              <button
                type="button"
                disabled={!isConnected || !everyoneSelected}
                onClick={lobby.startGame}
              >
                开始游戏
              </button>
            ) : null}
          </div>
          <p className="character-selection__hint">
            {currentPlayer?.characterSelection === null
              ? "尚未确认角色。"
              : "已确认角色；开始游戏前仍可重新选择。"}
            {isHost && !everyoneSelected ? " 需要所有玩家完成角色选择。" : ""}
          </p>
        </div>
      ) : null}

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
                  <span>
                    {player.playerId === room.hostPlayerId ? "房主 · " : ""}
                    {getCharacterSelectionLabel(player.characterSelection)}
                  </span>
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

/** 生成与当前选择匹配的公开立绘静态资源地址。 */
function getPortraitPath(gender: string, raceName: string, identityName: string): string {
  return `/assets/images/characters/portraits/${gender}/${raceName}/${identityName}.avif`;
}

/** 将房间快照中的选择转换为简短的大厅状态文案。 */
function getCharacterSelectionLabel(
  selection: {
    readonly gender: string;
    readonly raceName: string;
    readonly identityName: string;
  } | null,
): string {
  if (selection === null) {
    return "等待角色选择";
  }

  return `${selection.gender} · ${selection.raceName} · ${selection.identityName}`;
}
