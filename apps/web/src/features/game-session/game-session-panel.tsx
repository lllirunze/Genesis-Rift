import type {
  LanGamePrivateEventSnapshot,
  LanGamePrivateMapTileSnapshot,
  LanGameSessionSnapshot,
  LanBattleAttackResolvedEvent,
  LanHexDirection,
  LanRequestRejectedPayload,
  LanRoomSnapshot,
  PlayerId,
} from "@genesis-rift/shared";

import { CharacterStatusPanel } from "./character-status-panel.tsx";
import { HexMapBoard } from "./hex-map-board.tsx";

/** 描述最小对局面板需要展示和操作的公开数据。 */
export interface GameSessionPanelProps {
  readonly game: LanGameSessionSnapshot;
  readonly room: LanRoomSnapshot;
  readonly localPlayerId: PlayerId;
  readonly isConnected: boolean;
  readonly rejection: LanRequestRejectedPayload | null;
  readonly lastBattleAttack: LanBattleAttackResolvedEvent | null;
  onEndActivePlayerTurn(): void;
  onMoveActivePlayer(direction: LanHexDirection): void;
  onAttackActivePlayer(targetPlayerId: PlayerId): void;
  onDecideEventReveal(instanceId: string, action: "REVEAL" | "DECLINE"): void;
  onSelectEventOption(instanceId: string, optionId: string): void;
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
  const attackablePlayerIds = getAttackablePlayerIds(game, localPlayerId);
  const canAttack = props.isConnected && isActivePlayer && game.status === "running";

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

      <CharacterStatusPanel character={game.viewer?.character ?? null} />

      <HexMapBoard
        canMove={
          props.isConnected &&
          isActivePlayer &&
          game.status === "running" &&
          game.turn.remainingMovementPoints > 0
        }
        map={game.viewer?.map ?? null}
        onMove={props.onMoveActivePlayer}
        playerMarkers={game.players.map((player) => ({
          playerId: player.playerId,
          displayName: getPlayerName(room, player.playerId),
          currentTileId: player.currentTileId,
          isLocalPlayer: player.playerId === localPlayerId,
        }))}
      />

      <EventPanel
        activeEvent={game.viewer?.activeEvent ?? null}
        canOperate={props.isConnected && isActivePlayer && game.status === "running"}
        onDecideReveal={props.onDecideEventReveal}
        onSelectOption={props.onSelectEventOption}
      />

      <BattlePanel
        attackablePlayerIds={attackablePlayerIds}
        canAttack={canAttack}
        game={game}
        lastBattleAttack={props.lastBattleAttack}
        room={room}
        onAttack={props.onAttackActivePlayer}
      />

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

      {game.environment !== null ? (
        <section
          className="game-session__environment"
          aria-labelledby="game-session-environment-heading"
        >
          <h3 id="game-session-environment-heading">世界环境</h3>
          <p>
            第 {game.environment.currentRound} 轮 · {game.environment.dayNight.periodId}
          </p>
          <p>
            天气：
            {game.environment.activeWeatherIds.length === 0
              ? "无"
              : game.environment.activeWeatherIds.join("、")}
          </p>
          {game.environment.activeDisaster !== null ? (
            <p>
              灾害：{game.environment.activeDisaster.weatherId} ·{" "}
              {game.environment.activeDisaster.phase}
            </p>
          ) : null}
        </section>
      ) : null}

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

/** 展示当前玩家可尝试攻击的相邻目标与服务端最近一次攻击结算结果。 */
function BattlePanel(props: {
  readonly game: LanGameSessionSnapshot;
  readonly room: LanRoomSnapshot;
  readonly attackablePlayerIds: ReadonlySet<PlayerId>;
  readonly canAttack: boolean;
  readonly lastBattleAttack: LanBattleAttackResolvedEvent | null;
  onAttack(targetPlayerId: PlayerId): void;
}) {
  const targets = props.game.players.filter((player) =>
    props.attackablePlayerIds.has(player.playerId),
  );

  return (
    <section className="game-session__battle" aria-labelledby="game-session-battle-heading">
      <div>
        <p>Battle</p>
        <h3 id="game-session-battle-heading">普通攻击</h3>
      </div>
      {targets.length === 0 ? (
        <p>没有位于已探索相邻地块的可攻击玩家。</p>
      ) : (
        <ul>
          {targets.map((target) => (
            <li key={target.playerId}>
              <span>
                <strong>{getPlayerName(props.room, target.playerId)}</strong>
                <small>
                  生命 {target.currentHealth ?? "-"}/{target.maximumHealth ?? "-"} · 护盾{" "}
                  {target.currentShield}
                </small>
              </span>
              <button
                disabled={!props.canAttack}
                onClick={() => props.onAttack(target.playerId)}
                type="button"
              >
                攻击
              </button>
            </li>
          ))}
        </ul>
      )}
      {props.lastBattleAttack === null ? null : (
        <p className="game-session__battle-result" role="status">
          {getBattleResultMessage(props.lastBattleAttack, props.room)}
        </p>
      )}
    </section>
  );
}

/** 只以当前玩家已知地图中的相邻地块筛选攻击候选；服务端仍负责最终判定。 */
function getAttackablePlayerIds(
  game: LanGameSessionSnapshot,
  localPlayerId: PlayerId,
): ReadonlySet<PlayerId> {
  const map = game.viewer?.map;
  const currentTile = map?.tiles.find((tile) => tile.isCurrentPlayerTile);

  if (map === null || map === undefined || currentTile === undefined) {
    return new Set();
  }

  const knownTiles = new Map(map.tiles.map((tile) => [tile.tileId, tile]));

  return new Set(
    game.players
      .filter((player) => player.playerId !== localPlayerId && player.survivalStatus !== "DEAD")
      .filter((player) => {
        const targetTile = knownTiles.get(player.currentTileId);

        return targetTile !== undefined && areTilesWithinNormalAttackRange(currentTile, targetTile);
      })
      .map((player) => player.playerId),
  );
}

/** 根据立方坐标的最大轴差判断两个地块是否位于普通攻击距离内。 */
function areTilesWithinNormalAttackRange(
  origin: LanGamePrivateMapTileSnapshot,
  target: LanGamePrivateMapTileSnapshot,
): boolean {
  return (
    Math.max(
      Math.abs(origin.coordinate.x - target.coordinate.x),
      Math.abs(origin.coordinate.y - target.coordinate.y),
      Math.abs(origin.coordinate.z - target.coordinate.z),
    ) <= 1
  );
}

/** 将服务端公开攻击事件转换为简洁中文结算提示。 */
function getBattleResultMessage(
  event: LanBattleAttackResolvedEvent,
  room: LanRoomSnapshot,
): string {
  const attackerName = getPlayerName(room, event.attackerId);
  const defenderName = getPlayerName(room, event.defenderId);

  if (event.outcome === "EVADED") {
    return `${attackerName} 攻击 ${defenderName}，但被闪避。`;
  }

  return `${attackerName} 对 ${defenderName} 造成 ${event.finalDamage} 点伤害；生命 ${event.defenderHealth}，护盾 ${event.defenderShield}。`;
}

/** 显示仅属于当前玩家的事件卡背、揭露信息及可选择路线。 */
function EventPanel(props: {
  readonly activeEvent: LanGamePrivateEventSnapshot | null;
  readonly canOperate: boolean;
  readonly onDecideReveal: (instanceId: string, action: "REVEAL" | "DECLINE") => void;
  readonly onSelectOption: (instanceId: string, optionId: string) => void;
}) {
  const event = props.activeEvent;

  if (event === null) {
    return null;
  }

  if (event.status === "PENDING_REVEAL") {
    return (
      <section className="game-session__event" aria-label="未知事件">
        <p>Unknown Event</p>
        <h3>发现一张未知事件卡</h3>
        <p>这张事件尚未揭露。放弃后不会得知其内容，也不会产生任何效果。</p>
        <div className="game-session__actions">
          {event.allowedRevealActions.includes("REVEAL") ? (
            <button
              type="button"
              disabled={!props.canOperate}
              onClick={() => props.onDecideReveal(event.instanceId, "REVEAL")}
            >
              揭露
            </button>
          ) : null}
          {event.allowedRevealActions.includes("DECLINE") ? (
            <button
              type="button"
              disabled={!props.canOperate}
              onClick={() => props.onDecideReveal(event.instanceId, "DECLINE")}
            >
              放弃
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (event.content === null) {
    return null;
  }

  return (
    <section className="game-session__event" aria-label="已揭露事件">
      <p>{event.content.category}</p>
      <h3>{event.content.name}</h3>
      <p>{event.content.description}</p>
      {event.content.options.length > 0 ? (
        <div className="game-session__event-options">
          {event.content.options.map((option) => (
            <button
              type="button"
              disabled={!props.canOperate || option.isAvailable !== true}
              key={option.optionId}
              onClick={() => props.onSelectOption(event.instanceId, option.optionId)}
            >
              <strong>{option.name}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <p>事件效果正在结算。</p>
      )}
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
