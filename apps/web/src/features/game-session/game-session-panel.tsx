import type {
  LanGameSessionSnapshot,
  LanHexDirection,
  LanRequestRejectedPayload,
  LanRoomSnapshot,
  PlayerId,
} from "@genesis-rift/shared";

/** 描述最小对局面板需要展示和操作的公开数据。 */
export interface GameSessionPanelProps {
  readonly game: LanGameSessionSnapshot;
  readonly room: LanRoomSnapshot;
  readonly localPlayerId: PlayerId;
  readonly isConnected: boolean;
  readonly rejection: LanRequestRejectedPayload | null;
  onEndActivePlayerTurn(): void;
  onMoveActivePlayer(direction: LanHexDirection): void;
}

/**
 * 方法名：GameSessionPanel
 * 作用：展示公开对局状态，并为当前行动玩家提供结束回合入口。
 * @param props 面板所需的权威快照、当前浏览器身份与命令回调。
 * @returns 最小可操作对局界面。
 */
export function GameSessionPanel(props: GameSessionPanelProps) {
  const { game, room, localPlayerId } = props;
  const isActivePlayer = game.turn.activePlayerId === localPlayerId;
  const disconnectedPlayers = new Map(
    game.disconnectedPlayers.map((player) => [player.playerId, player]),
  );

  return (
    <section className="game-session" aria-labelledby="game-session-heading">
      <div className="game-session__heading">
        <div>
          <p>Game Session</p>
          <h2 id="game-session-heading">对局进行中</h2>
        </div>
        <span className="game-session__status">{getGameStatusLabel(game.status)}</span>
      </div>

      <div className="game-session__turn" aria-label="当前回合状态">
        <div>
          <span>Round</span>
          <strong>{game.turn.round}</strong>
        </div>
        <div>
          <span>Global Turn</span>
          <strong>{game.turn.globalTurn}</strong>
        </div>
        <div>
          <span>Active Player</span>
          <strong>{getPlayerName(room, game.turn.activePlayerId)}</strong>
        </div>
        <div>
          <span>Movement</span>
          <strong>{game.turn.remainingMovementPoints}</strong>
        </div>
      </div>

      <section className="game-session__players" aria-labelledby="game-session-players-heading">
        <h3 id="game-session-players-heading">玩家状态</h3>
        <ul>
          {game.players.map((player) => {
            const disconnected = disconnectedPlayers.get(player.playerId);
            const isCurrentPlayer = player.playerId === game.turn.activePlayerId;
            const isLocalPlayer = player.playerId === localPlayerId;

            return (
              <li
                className={isCurrentPlayer ? "game-player game-player--active" : "game-player"}
                key={player.playerId}
              >
                <div>
                  <strong>{getPlayerName(room, player.playerId)}</strong>
                  <p>
                    {player.gender ?? "unknown"} · {player.raceId} · {player.identityId}
                  </p>
                  <p>位置：{player.currentTileId}</p>
                </div>
                <span>
                  {disconnected === undefined
                    ? isCurrentPlayer
                      ? "行动中"
                      : "等待"
                    : `断线，期限：${disconnected.expiresAfterGlobalTurn}`}
                  {isLocalPlayer ? " · 你" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="game-session__actions">
        <div className="game-session__directions" aria-label="六边形移动方向">
          {DIRECTION_OPTIONS.map(({ direction, label }) => (
            <button
              type="button"
              disabled={
                !props.isConnected ||
                !isActivePlayer ||
                game.status !== "running" ||
                game.turn.remainingMovementPoints === 0
              }
              key={direction}
              onClick={() => props.onMoveActivePlayer(direction)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!props.isConnected || !isActivePlayer || game.status !== "running"}
          onClick={props.onEndActivePlayerTurn}
        >
          结束我的回合
        </button>
        <p>{isActivePlayer ? "轮到你行动。" : "等待当前行动玩家完成回合。"}</p>
      </div>

      {props.rejection !== null ? (
        <p className="room-lobby__error" role="alert">
          {props.rejection.code}: {props.rejection.message}
        </p>
      ) : null}
    </section>
  );
}

/** 平顶六边形地图的六个固定方向及其简洁中文显示名。 */
const DIRECTION_OPTIONS: readonly {
  readonly direction: LanHexDirection;
  readonly label: string;
}[] = [
  { direction: "NORTH", label: "北" },
  { direction: "NORTH_EAST_60", label: "东北" },
  { direction: "SOUTH_EAST_60", label: "东南" },
  { direction: "SOUTH", label: "南" },
  { direction: "SOUTH_WEST_60", label: "西南" },
  { direction: "NORTH_WEST_60", label: "西北" },
];

/** 从大厅成员快照读取可展示名称，已移除成员时保留稳定标识。 */
function getPlayerName(room: LanRoomSnapshot, playerId: PlayerId | null): string {
  if (playerId === null) {
    return "等待中";
  }

  return room.players.find((player) => player.playerId === playerId)?.displayName ?? playerId;
}

/** 将协议状态转为简洁的中文显示文案。 */
function getGameStatusLabel(status: LanGameSessionSnapshot["status"]): string {
  if (status === "running") {
    return "进行中";
  }

  if (status === "finished") {
    return "已结束";
  }

  return "准备中";
}
