import type { PlayerId } from "@genesis-rift/shared";

import type { GameSessionEvent, GameSessionSnapshot, ServerGameSession } from "./game-session.ts";

/** 当前服务端已经开放执行的首批游戏命令类型。 */
export const SERVER_GAME_COMMAND_TYPES = ["turn.end"] as const;

/** 描述首批可由客户端提交的服务端游戏命令。 */
export type ServerGameCommand = {
  readonly commandId: string;
  readonly playerId: PlayerId;
  readonly type: (typeof SERVER_GAME_COMMAND_TYPES)[number];
};

/** 描述一次命令执行完成后的权威结果。 */
export interface GameCommandExecutionResult {
  readonly commandId: string;
  readonly events: readonly GameSessionEvent[];
  readonly snapshot: GameSessionSnapshot;
}

/** 将客户端命令统一映射为服务端游戏会话操作的编排服务。 */
export class GameCommandService<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  readonly #session: ServerGameSession<ResourceId, DerivedAttribute>;

  /**
   * 方法名：constructor
   * 作用：绑定一局权威游戏会话，后续所有命令都由该会话校验并提交。
   * @param session 当前房间唯一的服务端游戏会话。
   * @returns 无返回值。
   */
  constructor(session: ServerGameSession<ResourceId, DerivedAttribute>) {
    this.#session = session;
  }

  /**
   * 方法名：execute
   * 作用：统一执行已注册命令并返回事件与最新权威快照。
   * @param command 客户端提交且已绑定玩家身份的命令。
   * @returns 本次命令产生的公开事件与会话快照。
   * @throws 命令编号为空或类型未注册时抛出错误。
   */
  execute(command: ServerGameCommand): GameCommandExecutionResult {
    if (command.commandId.trim().length === 0) {
      throw new TypeError("commandId must be a non-empty string");
    }

    switch (command.type) {
      case "turn.end": {
        const result = this.#session.endActivePlayerTurn(command.playerId);
        return Object.freeze({ commandId: command.commandId, ...result });
      }
    }
  }
}
