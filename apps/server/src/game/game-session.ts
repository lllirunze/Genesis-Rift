import {
  advanceTurnState,
  createTurnState,
  removePlayerFromTurnState,
  removePlayerSessionState,
  type GameSessionState,
  type GameSessionValidationContext,
  type TurnState,
} from "@genesis-rift/game-core";
import type { GameId, LanGameSessionSnapshot, PlayerId } from "@genesis-rift/shared";

/** 断线玩家可恢复原角色的全局玩家回合数量。 */
export const DISCONNECTED_PLAYER_RECOVERY_TURN_LIMIT = 10;

/** 描述服务端游戏会话的稳定业务错误代码。 */
export type ServerGameSessionErrorCode =
  | "GAME_NOT_RUNNING"
  | "PLAYER_NOT_IN_GAME"
  | "NOT_ACTIVE_PLAYER"
  | "PLAYER_DISCONNECTED"
  | "PLAYER_NOT_DISCONNECTED";

/** 描述服务端游戏会话抛出的可映射业务错误。 */
export class ServerGameSessionError extends Error {
  readonly code: ServerGameSessionErrorCode;

  /**
   * 方法名：constructor
   * 作用：创建携带稳定错误代码的游戏会话异常。
   * @param code 供网络协议映射的业务错误代码。
   * @param message 便于日志与调试定位的英文错误说明。
   * @returns 无返回值。
   */
  constructor(code: ServerGameSessionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** 描述一名断线玩家恢复原角色前的权威期限记录。 */
export interface DisconnectedPlayerState {
  readonly playerId: PlayerId;
  readonly disconnectedAtGlobalTurn: number;
  readonly expiresAfterGlobalTurn: number;
}

/** 描述可安全广播给房间全部成员的游戏会话摘要。 */
export type GameSessionSnapshot = LanGameSessionSnapshot;

/** 描述游戏会话在状态变更时产生的公开领域事件。 */
export type GameSessionEvent =
  | { readonly type: "game.started"; readonly gameId: GameId }
  | {
      readonly type: "turn.advanced";
      readonly gameId: GameId;
      readonly turn: TurnState;
    }
  | {
      readonly type: "player.disconnected";
      readonly gameId: GameId;
      readonly playerId: PlayerId;
      readonly expiresAfterGlobalTurn: number;
    }
  | { readonly type: "player.reconnected"; readonly gameId: GameId; readonly playerId: PlayerId }
  | {
      readonly type: "player.removedAfterDisconnect";
      readonly gameId: GameId;
      readonly playerId: PlayerId;
    };

/**
 * 管理一局游戏的权威状态、全局回合与断线恢复期限。
 * 该类不依赖 Socket、日志或 React，网络层只负责将合法请求映射为这里的操作。
 */
export class ServerGameSession<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  readonly #validationContext: GameSessionValidationContext<ResourceId, DerivedAttribute>;
  #state: GameSessionState<ResourceId>;
  #turn: TurnState;
  #revision = 1;
  readonly #disconnectedPlayers = new Map<PlayerId, DisconnectedPlayerState>();

  /**
   * 方法名：constructor
   * 作用：接管已完成完整校验的游戏会话状态，并初始化行动顺序。
   * @param state 游戏规则层创建的完整权威状态。
   * @param validationContext 后续替换或移除玩家时需要使用的静态定义集合。
   * @returns 无返回值。
   */
  constructor(
    state: GameSessionState<ResourceId>,
    validationContext: GameSessionValidationContext<ResourceId, DerivedAttribute>,
  ) {
    this.#state = state;
    this.#validationContext = validationContext;
    this.#turn = createTurnState({ playerOrder: state.playerOrder });
  }

  /**
   * 方法名：start
   * 作用：将已配置玩家和世界状态的大厅会话切换为可执行命令的运行状态。
   * @returns 启动事件与最新公开会话快照。
   * @throws 会话不是大厅状态或不存在玩家时抛出错误。
   */
  start(): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    if (this.#state.status !== "lobby" || this.#state.players.length === 0) {
      throw new ServerGameSessionError(
        "GAME_NOT_RUNNING",
        "Only a populated lobby game can be started",
      );
    }

    this.#state = { ...this.#state, status: "running" };
    this.#revision += 1;
    return this.createResult([{ type: "game.started", gameId: this.#state.gameId }]);
  }

  /**
   * 方法名：endActivePlayerTurn
   * 作用：结束当前行动玩家的完整回合，推进全局回合并结算断线超时移除。
   * @param playerId 请求结束自身回合的玩家标识。
   * @returns 回合推进、超时离席事件与最新公开会话快照。
   * @throws 游戏未运行、请求者非当前玩家或请求者断线时抛出错误。
   */
  endActivePlayerTurn(playerId: PlayerId): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertActiveConnectedPlayer(playerId);
    this.#turn = advanceTurnState(this.#turn, this.#state.playerOrder, {
      unavailablePlayerIds: [...this.#disconnectedPlayers.keys()],
    });
    this.#revision += 1;
    const events: GameSessionEvent[] = [
      { type: "turn.advanced", gameId: this.#state.gameId, turn: this.#turn },
    ];
    events.push(...this.removeExpiredDisconnectedPlayers());
    return this.createResult(events);
  }

  /**
   * 方法名：markPlayerDisconnected
   * 作用：登记断线恢复期限；断线者若正在行动则立即跳过其未完成回合，避免阻塞对局。
   * @param playerId 已失去网络连接的玩家标识。
   * @returns 断线与可能的回合推进事件及最新公开会话快照。
   * @throws 玩家不属于当前游戏会话时抛出错误。
   */
  markPlayerDisconnected(playerId: PlayerId): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertPlayerExists(playerId);
    const existing = this.#disconnectedPlayers.get(playerId);

    if (existing !== undefined) {
      return this.createResult([]);
    }

    const disconnected: DisconnectedPlayerState = Object.freeze({
      playerId,
      disconnectedAtGlobalTurn: this.#turn.globalTurn,
      expiresAfterGlobalTurn: this.#turn.globalTurn + DISCONNECTED_PLAYER_RECOVERY_TURN_LIMIT,
    });
    this.#disconnectedPlayers.set(playerId, disconnected);
    this.#revision += 1;
    const events: GameSessionEvent[] = [
      {
        type: "player.disconnected",
        gameId: this.#state.gameId,
        playerId,
        expiresAfterGlobalTurn: disconnected.expiresAfterGlobalTurn,
      },
    ];

    if (this.#turn.activePlayerId === playerId) {
      const remainingOrder = this.#state.playerOrder.filter((candidate) => candidate !== playerId);

      if (remainingOrder.length > 0) {
        this.#turn = this.skipDisconnectedActiveTurn(playerId);
        events.push({ type: "turn.advanced", gameId: this.#state.gameId, turn: this.#turn });
      }
    }

    return this.createResult(events);
  }

  /**
   * 方法名：restorePlayerConnection
   * 作用：在恢复期限内重新授予原玩家控制既有角色的资格。
   * @param playerId 重新连接后请求恢复的稳定玩家标识。
   * @returns 恢复事件与当前公开会话快照。
   * @throws 玩家未处于断线恢复状态或已经超时移除时抛出错误。
   */
  restorePlayerConnection(playerId: PlayerId): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertPlayerExists(playerId);

    if (!this.#disconnectedPlayers.delete(playerId)) {
      throw new ServerGameSessionError(
        "PLAYER_NOT_DISCONNECTED",
        `Player is not awaiting reconnection: ${playerId}`,
      );
    }

    this.#revision += 1;
    return this.createResult([
      { type: "player.reconnected", gameId: this.#state.gameId, playerId },
    ]);
  }

  /**
   * 方法名：getSnapshot
   * 作用：读取不包含背包、使命、信仰等私有数据的公开权威会话摘要。
   * @returns 当前游戏会话的安全公开快照。
   */
  getSnapshot(): GameSessionSnapshot {
    return Object.freeze({
      gameId: this.#state.gameId,
      status: this.#state.status,
      revision: this.#revision,
      turn: { ...this.#turn },
      playerOrder: Object.freeze([...this.#state.playerOrder]),
      disconnectedPlayers: Object.freeze(
        [...this.#disconnectedPlayers.values()].map(({ playerId, expiresAfterGlobalTurn }) =>
          Object.freeze({ playerId, expiresAfterGlobalTurn }),
        ),
      ),
    });
  }

  /**
   * 方法名：getStateForServer
   * 作用：仅向服务端编排层提供完整权威状态，禁止直接发送给客户端。
   * @returns 当前完整游戏会话状态。
   */
  getStateForServer(): GameSessionState<ResourceId> {
    return this.#state;
  }

  /** 统一封装状态变更后的事件和不可变公开快照。 */
  private createResult(events: readonly GameSessionEvent[]): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    return Object.freeze({ events: Object.freeze([...events]), snapshot: this.getSnapshot() });
  }

  /** 断言请求者存在、游戏已开始、处于行动位且没有断线。 */
  private assertActiveConnectedPlayer(playerId: PlayerId): void {
    this.assertRunning();
    this.assertPlayerExists(playerId);

    if (this.#disconnectedPlayers.has(playerId)) {
      throw new ServerGameSessionError(
        "PLAYER_DISCONNECTED",
        `Disconnected player cannot submit commands: ${playerId}`,
      );
    }

    if (this.#turn.activePlayerId !== playerId) {
      throw new ServerGameSessionError(
        "NOT_ACTIVE_PLAYER",
        `Player is not the active player: ${playerId}`,
      );
    }
  }

  /** 断言会话已进入运行状态。 */
  private assertRunning(): void {
    if (this.#state.status !== "running") {
      throw new ServerGameSessionError("GAME_NOT_RUNNING", "Game session is not running");
    }
  }

  /** 断言玩家仍拥有当前会话中的角色状态。 */
  private assertPlayerExists(playerId: PlayerId): void {
    if (!this.#state.playerOrder.includes(playerId)) {
      throw new ServerGameSessionError(
        "PLAYER_NOT_IN_GAME",
        `Player does not belong to this game session: ${playerId}`,
      );
    }
  }

  /** 查找断线玩家之后第一名仍可行动的玩家。 */
  private findNextConnectedPlayer(playerId: PlayerId): PlayerId {
    const startIndex = this.#state.playerOrder.indexOf(playerId);

    for (let offset = 1; offset < this.#state.playerOrder.length; offset += 1) {
      const candidate =
        this.#state.playerOrder[(startIndex + offset) % this.#state.playerOrder.length]!;

      if (!this.#disconnectedPlayers.has(candidate)) {
        return candidate;
      }
    }

    return playerId;
  }

  /** 跳过断线行动者的剩余回合，不将未完成回合计入全局玩家回合数量。 */
  private skipDisconnectedActiveTurn(playerId: PlayerId): TurnState {
    const currentIndex = this.#state.playerOrder.indexOf(playerId);
    const nextPlayerId = this.findNextConnectedPlayer(playerId);
    const nextIndex = this.#state.playerOrder.indexOf(nextPlayerId);

    return Object.freeze({
      ...this.#turn,
      round: nextIndex <= currentIndex ? this.#turn.round + 1 : this.#turn.round,
      activePlayerId: nextPlayerId,
      phase: "turnStart",
    });
  }

  /** 在每个全局玩家回合结束后移除已超过恢复期限的角色及其全部专属状态。 */
  private removeExpiredDisconnectedPlayers(): GameSessionEvent[] {
    const events: GameSessionEvent[] = [];

    for (const disconnected of [...this.#disconnectedPlayers.values()]) {
      if (this.#turn.globalTurn < disconnected.expiresAfterGlobalTurn) {
        continue;
      }

      const previousOrder = this.#state.playerOrder;
      this.#state = removePlayerSessionState(
        this.#state,
        disconnected.playerId,
        this.#validationContext,
      );
      this.#turn = removePlayerFromTurnState(
        this.#turn,
        previousOrder,
        this.#state.playerOrder,
        disconnected.playerId,
      );
      this.#disconnectedPlayers.delete(disconnected.playerId);
      this.#revision += 1;
      events.push({
        type: "player.removedAfterDisconnect",
        gameId: this.#state.gameId,
        playerId: disconnected.playerId,
      });
    }

    return events;
  }
}
