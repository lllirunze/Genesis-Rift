import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";
import type { PlayerId } from "@genesis-rift/shared";

import { RoomManager } from "../rooms/room-manager.ts";
import { GameSessionManager } from "./game-session-manager.ts";
import type { GameSessionSnapshot } from "./game-session.ts";

/** 描述创建完整初始规则层会话所需的可替换工厂。 */
export interface InitialGameSessionFactory<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  create(input: {
    readonly roomId: string;
    readonly players: readonly { readonly playerId: PlayerId; readonly displayName: string }[];
  }): {
    readonly state: GameSessionState<ResourceId>;
    readonly validationContext: GameSessionValidationContext<ResourceId, DerivedAttribute>;
  };
}

/** 统一执行房主开始游戏、锁定房间及启动权威会话的服务。 */
export class StartGameService<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  readonly #roomManager: RoomManager;
  readonly #gameSessionManager: GameSessionManager<ResourceId, DerivedAttribute>;
  readonly #factory: InitialGameSessionFactory<ResourceId, DerivedAttribute>;

  /**
   * 方法名：constructor
   * 作用：保存开始游戏时需要协调的房间、会话与初始化工厂依赖。
   * @param roomManager 当前唯一大厅的权威管理器。
   * @param gameSessionManager 当前唯一游戏会话管理器。
   * @param factory 根据锁定成员创建完整初始游戏状态的工厂。
   * @returns 无返回值。
   */
  constructor(
    roomManager: RoomManager,
    gameSessionManager: GameSessionManager<ResourceId, DerivedAttribute>,
    factory: InitialGameSessionFactory<ResourceId, DerivedAttribute>,
  ) {
    this.#roomManager = roomManager;
    this.#gameSessionManager = gameSessionManager;
    this.#factory = factory;
  }

  /**
   * 方法名：start
   * 作用：校验房主权限、锁定大厅成员、创建完整状态并启动首个全局回合。
   * @param playerId 请求开始游戏的房主标识。
   * @returns 运行中的公开游戏快照。
   * @throws 房间不可开始、初始化失败或游戏会话已存在时抛出错误。
   */
  start(playerId: PlayerId): GameSessionSnapshot {
    const room = this.#roomManager.startRoom(playerId);
    const initialSession = this.#factory.create({ roomId: room.roomId, players: room.players });
    const session = this.#gameSessionManager.createSession(
      initialSession.state,
      initialSession.validationContext,
    );
    return session.start().snapshot;
  }
}
