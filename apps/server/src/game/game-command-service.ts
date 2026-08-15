import type { HexDirection } from "@genesis-rift/game-core";
import type { PlayerId } from "@genesis-rift/shared";

import type { Logger } from "../logging/index.ts";

import type { GameSessionEvent, GameSessionSnapshot, ServerGameSession } from "./game-session.ts";

/** 当前服务端已经开放执行的首批游戏命令类型。 */
export const SERVER_GAME_COMMAND_TYPES = [
  "turn.end",
  "map.move",
  "battle.attack",
  "revival.attemptReincarnation",
  "inventory.move",
  "inventory.merge",
  "inventory.split",
  "inventory.discard",
  "temporaryPickup.store",
  "temporaryPickup.abandon",
  "equipment.equip",
  "equipment.unequip",
  "item.use",
  "event.decideReveal",
  "event.selectOption",
] as const;

/** 描述首批可由客户端提交的服务端游戏命令。 */
interface ServerGameCommandBase {
  readonly commandId: string;
  readonly playerId: PlayerId;
}

/** 描述结束回合命令的服务端内部表示。 */
export interface EndTurnServerGameCommand extends ServerGameCommandBase {
  readonly type: "turn.end";
}

/** 描述普通移动命令的服务端内部表示。 */
export interface MoveServerGameCommand extends ServerGameCommandBase {
  readonly type: "map.move";
  readonly direction: HexDirection;
}

/** 描述普通攻击命令的服务端内部表示。 */
export interface AttackServerGameCommand extends ServerGameCommandBase {
  readonly type: "battle.attack";
  readonly targetPlayerId: PlayerId;
}

/** 描述当前行动灵魂申请一次轮回判定的服务端内部命令。 */
export interface AttemptReincarnationServerGameCommand extends ServerGameCommandBase {
  readonly type: "revival.attemptReincarnation";
}

/** 描述背包整理命令共享的位置参数。 */
interface InventoryPosition {
  readonly x: number;
  readonly y: number;
}

/** 描述移动背包物品的服务端内部命令。 */
export interface MoveInventoryItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "inventory.move";
  readonly itemInstanceId: string;
  readonly targetPosition: InventoryPosition;
}

/** 描述合并背包物品堆叠的服务端内部命令。 */
export interface MergeInventoryItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "inventory.merge";
  readonly sourceItemInstanceId: string;
  readonly targetItemInstanceId: string;
}

/** 描述拆分背包物品堆叠的服务端内部命令。 */
export interface SplitInventoryItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "inventory.split";
  readonly sourceItemInstanceId: string;
  readonly splitQuantity: number;
  readonly newItemInstanceId: string;
  readonly targetPosition: InventoryPosition;
}

/** 描述丢弃背包物品的服务端内部命令。 */
export interface DiscardInventoryItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "inventory.discard";
  readonly itemInstanceId: string;
}

/** 描述存入临时拾取区物品的服务端内部命令。 */
export interface StoreTemporaryPickupServerGameCommand extends ServerGameCommandBase {
  readonly type: "temporaryPickup.store";
  readonly targetPosition?: InventoryPosition;
}

/** 描述放弃临时拾取区物品的服务端内部命令。 */
export interface AbandonTemporaryPickupServerGameCommand extends ServerGameCommandBase {
  readonly type: "temporaryPickup.abandon";
}

/** 描述从背包穿戴装备的服务端内部命令。 */
export interface EquipItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "equipment.equip";
  readonly itemInstanceId: string;
  readonly slot: "weapon" | "armor" | "shoes" | "accessory1" | "accessory2" | "special";
  readonly replacedEquipmentPosition?: InventoryPosition;
}

/** 描述将装备卸回背包的服务端内部命令。 */
export interface UnequipItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "equipment.unequip";
  readonly slot: "weapon" | "armor" | "shoes" | "accessory1" | "accessory2" | "special";
  readonly targetPosition: InventoryPosition;
}

/** 描述使用消耗品的服务端内部命令。 */
export interface UseConsumableItemServerGameCommand extends ServerGameCommandBase {
  readonly type: "item.use";
  readonly itemDefinitionId: string;
}

/** 描述玩家决定揭露或放弃当前事件的服务端内部命令。 */
export interface DecideEventRevealServerGameCommand extends ServerGameCommandBase {
  readonly type: "event.decideReveal";
  readonly instanceId: string;
  readonly action: "REVEAL" | "DECLINE";
}

/** 描述玩家选择已揭露事件路线的服务端内部命令。 */
export interface SelectEventOptionServerGameCommand extends ServerGameCommandBase {
  readonly type: "event.selectOption";
  readonly instanceId: string;
  readonly optionId: string;
}

/** 描述首批可由客户端提交的服务端游戏命令。 */
export type ServerGameCommand =
  | EndTurnServerGameCommand
  | MoveServerGameCommand
  | AttackServerGameCommand
  | AttemptReincarnationServerGameCommand
  | MoveInventoryItemServerGameCommand
  | MergeInventoryItemServerGameCommand
  | SplitInventoryItemServerGameCommand
  | DiscardInventoryItemServerGameCommand
  | StoreTemporaryPickupServerGameCommand
  | AbandonTemporaryPickupServerGameCommand
  | EquipItemServerGameCommand
  | UnequipItemServerGameCommand
  | UseConsumableItemServerGameCommand
  | DecideEventRevealServerGameCommand
  | SelectEventOptionServerGameCommand;

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
  readonly #logger: Logger | null;

  /**
   * 方法名：constructor
   * 作用：绑定一局权威游戏会话，后续所有命令都由该会话校验并提交。
   * @param session 当前房间唯一的服务端游戏会话。
   * @returns 无返回值。
   */
  constructor(
    session: ServerGameSession<ResourceId, DerivedAttribute>,
    logger: Logger | null = null,
  ) {
    this.#session = session;
    this.#logger = logger;
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
        return this.createExecutionResult(command.commandId, result);
      }
      case "map.move": {
        const result = this.#session.moveActivePlayer(command.playerId, command.direction);
        return this.createExecutionResult(command.commandId, result);
      }
      case "battle.attack": {
        const result = this.#session.attackActivePlayer(command.playerId, command.targetPlayerId);
        return this.createExecutionResult(command.commandId, result);
      }
      case "revival.attemptReincarnation": {
        const result = this.#session.attemptActivePlayerReincarnation(command.playerId);
        return this.createExecutionResult(command.commandId, result);
      }
      case "inventory.move":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.moveInventoryItem(
            command.playerId,
            command.itemInstanceId,
            command.targetPosition,
          ),
        );
      case "inventory.merge":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.mergeInventoryItemStacks(
            command.playerId,
            command.sourceItemInstanceId,
            command.targetItemInstanceId,
          ),
        );
      case "inventory.split":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.splitInventoryItemStack(
            command.playerId,
            command.sourceItemInstanceId,
            command.splitQuantity,
            command.newItemInstanceId,
            command.targetPosition,
          ),
        );
      case "inventory.discard":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.discardInventoryItem(command.playerId, command.itemInstanceId),
        );
      case "temporaryPickup.store":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.storeTemporaryPickup(command.playerId, command.targetPosition),
        );
      case "temporaryPickup.abandon":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.abandonTemporaryPickup(command.playerId),
        );
      case "equipment.equip":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.equipInventoryItem(
            command.playerId,
            command.itemInstanceId,
            command.slot,
            command.replacedEquipmentPosition,
          ),
        );
      case "equipment.unequip":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.unequipInventoryItem(
            command.playerId,
            command.slot,
            command.targetPosition,
          ),
        );
      case "item.use":
        return this.createItemExecutionResult(
          command,
          command.commandId,
          this.#session.useConsumableItem(command.playerId, command.itemDefinitionId),
        );
      case "event.decideReveal":
        return this.createExecutionResult(
          command.commandId,
          this.#session.decideActivePlayerEventReveal(
            command.playerId,
            command.instanceId,
            command.action,
          ),
        );
      case "event.selectOption":
        return this.createExecutionResult(
          command.commandId,
          this.#session.selectActivePlayerEventOption(
            command.playerId,
            command.instanceId,
            command.optionId,
          ),
        );
    }
  }

  /**
   * 方法名：createExecutionResult
   * 作用：统一封装命令执行结果，并记录其中可公开的战斗结算事件。
   * @param commandId 客户端提交的幂等命令标识。
   * @param result 服务端会话完成规则结算后的事件与快照。
   * @returns 包含原命令标识的不可变执行结果。
   */
  private createExecutionResult(
    commandId: string,
    result: Omit<GameCommandExecutionResult, "commandId">,
  ): GameCommandExecutionResult {
    for (const event of result.events) {
      if (event.type === "battle.attackResolved") {
        this.#logger?.info({
          action: "Battle",
          module: "GameCommandService",
          message: `Player ${event.attackerId} attacked ${event.defenderId} with ${event.outcome.toLowerCase()} outcome.`,
          gameId: event.gameId,
          context: {
            attackId: event.attackId,
            attackerId: event.attackerId,
            defenderId: event.defenderId,
            outcome: event.outcome,
            finalDamage: event.finalDamage,
            defenderHealth: event.defenderHealth,
            defenderShield: event.defenderShield,
            defenderSurvivalStatus: event.defenderSurvivalStatus,
          },
        });
        continue;
      }

      if (event.type === "player.reincarnationResolved") {
        this.#logger?.info({
          action: "Player",
          module: "GameCommandService",
          message: `Player ${event.playerId} reincarnation attempt ${event.outcome.toLowerCase()}.`,
          gameId: event.gameId,
          context: {
            playerId: event.playerId,
            outcome: event.outcome,
            rolls: event.rolls,
            spawnTileId: event.spawnTileId,
            protectionTurns: event.protectionTurns,
          },
        });
      }
    }

    return Object.freeze({ commandId, ...result });
  }

  /** 记录成功物品操作，并统一封装对应的权威会话结果。 */
  private createItemExecutionResult(
    command:
      | MoveInventoryItemServerGameCommand
      | MergeInventoryItemServerGameCommand
      | SplitInventoryItemServerGameCommand
      | DiscardInventoryItemServerGameCommand
      | StoreTemporaryPickupServerGameCommand
      | AbandonTemporaryPickupServerGameCommand
      | EquipItemServerGameCommand
      | UnequipItemServerGameCommand
      | UseConsumableItemServerGameCommand,
    commandId: string,
    result: Omit<GameCommandExecutionResult, "commandId">,
  ): GameCommandExecutionResult {
    const execution = this.createExecutionResult(commandId, result);
    const action = command.type.startsWith("equipment.") ? "Equip" : "Item";

    this.#logger?.info({
      action,
      module: "GameCommandService",
      message: `Player completed ${command.type} command successfully.`,
      target: {
        kind: "player",
        playerId: command.playerId,
        displayName: command.playerId,
      },
      context: { commandId, commandType: command.type },
    });

    return execution;
  }
}
