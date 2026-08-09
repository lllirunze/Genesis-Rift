import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";

import { ServerGameSession } from "./game-session.ts";

/** 描述游戏会话管理器返回的稳定初始化错误。 */
export class GameSessionManagerError extends Error {
  readonly code = "GAME_NOT_INITIALIZED" as const;

  /**
   * 方法名：constructor
   * 作用：创建游戏会话尚未初始化时使用的稳定业务异常。
   * @returns 无返回值。
   */
  constructor() {
    super("The active game session has not been initialized");
  }
}

/** 管理单局局域网游戏唯一权威会话的服务端入口。 */
export class GameSessionManager<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  #session: ServerGameSession<ResourceId, DerivedAttribute> | null = null;

  /**
   * 方法名：createSession
   * 作用：根据已创建的规则层会话状态创建当前房间唯一的服务端权威会话。
   * @param state 已完成初始化和校验的完整游戏状态。
   * @param validationContext 后续会话状态变更所需的静态定义集合。
   * @returns 新建的服务端游戏会话。
   * @throws 当前进程已经存在活动游戏会话时抛出错误。
   */
  createSession(
    state: GameSessionState<ResourceId>,
    validationContext: GameSessionValidationContext<ResourceId, DerivedAttribute>,
  ): ServerGameSession<ResourceId, DerivedAttribute> {
    if (this.#session !== null) {
      throw new Error("The active game session already exists");
    }

    const session = new ServerGameSession(state, validationContext);
    this.#session = session;
    return session;
  }

  /**
   * 方法名：getSession
   * 作用：读取当前房间已经创建的唯一权威游戏会话。
   * @returns 当前服务端游戏会话。
   * @throws 游戏尚未开始初始化时抛出错误。
   */
  getSession(): ServerGameSession<ResourceId, DerivedAttribute> {
    if (this.#session === null) {
      throw new GameSessionManagerError();
    }

    return this.#session;
  }
}
