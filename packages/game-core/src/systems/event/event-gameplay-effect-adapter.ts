import type { ItemDefinitionCatalog, TileId } from "@genesis-rift/shared";

import {
  applyStatusToCharacter,
  type CharacterStatusState,
  type StatusDefinitionCatalog,
} from "../battle/status/index.ts";
import {
  decreaseCharacterResource,
  increaseCharacterResource,
} from "../character/character-resource-operations.ts";
import type { CharacterResourceState } from "../character/character-resource-state.ts";
import { receiveCoin, spendCoin } from "../economy/coin.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import {
  applyWeather,
  type WeatherDefinitionCatalog,
  type WeatherRuntimeState,
} from "../environment/index.ts";
import {
  recordSuccessfulTileEntry,
  type HexMap,
  type PlayerExplorationState,
} from "../map/index.ts";
import type {
  EventEffectDefinitionById,
  EventEffectExecutionContext,
} from "./event-effect-handler.ts";
import type { GameplayEventEffectAdapter } from "./event-effect-handlers.ts";

/** 描述事件效果执行所需的一名玩家的可变业务状态快照。 */
export interface EventEffectPlayerState<ResourceId extends string = string> {
  readonly playerId: string;
  readonly resources: CharacterResourceState<ResourceId>;
  readonly inventory: PlayerInventoryState;
  readonly statuses: CharacterStatusState;
  readonly currentTileId: TileId;
  readonly exploration: PlayerExplorationState;
}

/** 描述事件效果层在一次结算过程中维护的最小对局状态。 */
export interface EventGameplayEffectState<ResourceId extends string = string> {
  readonly map: HexMap;
  readonly players: readonly EventEffectPlayerState<ResourceId>[];
  readonly weather: WeatherRuntimeState;
}

/** 描述事件适配器执行物品和状态效果时所需的静态定义与实例编号来源。 */
export interface EventGameplayEffectAdapterDependencies {
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly statusDefinitions: StatusDefinitionCatalog;
  readonly createItemInstanceIds: (
    context: EventEffectExecutionContext,
    quantity: number,
  ) => readonly string[];
  readonly drawItemPool: (
    context: EventEffectExecutionContext,
    itemPoolId: string,
    drawCount: number,
  ) => readonly { readonly itemDefinitionId: string; readonly quantity: number }[];
  readonly createStatusInstanceId: (
    context: EventEffectExecutionContext,
    targetPlayerId: string,
  ) => string;
  readonly getUpdateSequence: (context: EventEffectExecutionContext) => number;
  readonly weatherDefinitions: WeatherDefinitionCatalog;
  readonly createWeatherInstanceId: (context: EventEffectExecutionContext) => string;
}

/**
 * 通过现有业务系统完成事件效果，并在内部保存每一步产生的不可变状态快照。
 * 调用方应在整项事件结算成功后读取 state；若 STOP 效果抛错，则丢弃该适配器即可回滚。
 */
export class EventGameplayEffectStateAdapter<
  ResourceId extends string = string,
> implements GameplayEventEffectAdapter {
  private state: EventGameplayEffectState<ResourceId>;

  /**
   * 方法名：constructor
   * 作用：创建一次事件效果结算使用的业务状态适配器。
   * @param state 结算开始前的地图与玩家状态快照。
   * @param dependencies 物品、状态定义及确定性实例编号来源。
   */
  constructor(
    state: EventGameplayEffectState<ResourceId>,
    private readonly dependencies: EventGameplayEffectAdapterDependencies,
  ) {
    this.state = freezeState(state);
  }

  /**
   * 方法名：getState
   * 作用：读取当前已应用全部成功效果的业务状态快照。
   * @returns 最新事件效果业务状态。
   */
  getState(): EventGameplayEffectState<ResourceId> {
    return this.state;
  }

  /**
   * 方法名：modifyCharacterResource
   * 作用：通过角色资源系统增加或扣除目标玩家的当前资源值。
   * @param effect 角色资源变化效果。
   * @param context 当前事件效果执行上下文。
   * @returns 每名目标玩家实际应用的资源变化结果。
   */
  modifyCharacterResource(
    effect: EventEffectDefinitionById<"characterResource.modify">,
    context: EventEffectExecutionContext,
  ): unknown {
    const outputs: unknown[] = [];

    this.updateTargets(effect.targetType, context, (player) => {
      const resourceId = effect.parameters.resourceId as ResourceId;
      const result =
        effect.parameters.amount > 0
          ? increaseCharacterResource(player.resources, resourceId, effect.parameters.amount)
          : decreaseCharacterResource(player.resources, resourceId, -effect.parameters.amount);
      outputs.push(result);
      return { ...player, resources: result.state };
    });

    return Object.freeze(outputs);
  }

  /**
   * 方法名：modifyCoin
   * 作用：通过背包中的元宝物品完成目标玩家的元宝增加或扣除。
   * @param effect 元宝变化效果。
   * @param context 当前事件效果执行上下文。
   * @returns 每名目标玩家的元宝结算结果。
   */
  modifyCoin(
    effect: EventEffectDefinitionById<"coin.modify">,
    context: EventEffectExecutionContext,
  ): unknown {
    const outputs: unknown[] = [];

    this.updateTargets(effect.targetType, context, (player) => {
      if (effect.parameters.amount > 0) {
        const result = receiveCoin(
          player.inventory,
          {
            quantity: effect.parameters.amount,
            sourceId: context.eventId,
            newItemInstanceIds: this.dependencies.createItemInstanceIds(
              context,
              effect.parameters.amount,
            ),
          },
          this.dependencies.itemDefinitions,
        );
        outputs.push(result);
        return { ...player, inventory: result.inventory };
      }

      const result = spendCoin(player.inventory, {
        coinQuantity: -effect.parameters.amount,
        reasonId: context.eventId,
      });
      outputs.push(result);
      return { ...player, inventory: result.inventory };
    });

    return Object.freeze(outputs);
  }

  /**
   * 方法名：obtainItem
   * 作用：通过统一物品拾取流程向触发玩家发放确定物品。
   * @param effect 确定物品获取效果。
   * @param context 当前事件效果执行上下文。
   * @returns 物品进入背包、临时拾取区或未解决列表的结果。
   */
  obtainItem(
    effect: EventEffectDefinitionById<"item.obtain">,
    context: EventEffectExecutionContext,
  ): unknown {
    let output: unknown = null;

    this.updateTargets(effect.targetType, context, (player) => {
      const result = receiveItem(
        player.inventory,
        {
          definitionId: effect.parameters.itemDefinitionId,
          quantity: effect.parameters.quantity,
          sourceId: context.eventId,
          newItemInstanceIds: this.dependencies.createItemInstanceIds(
            context,
            effect.parameters.quantity,
          ),
        },
        this.dependencies.itemDefinitions,
      );
      output = result;
      return { ...player, inventory: result.inventory };
    });

    return output;
  }

  /**
   * 方法名：obtainItemFromPool
   * 作用：从调用方提供的确定性物品池抽取结果中逐项走统一背包接收流程。
   * @param effect 随机物品池获取效果。
   * @param context 当前事件效果执行上下文。
   * @returns 每次抽取对应的背包接收结算结果。
   */
  obtainItemFromPool(
    effect: EventEffectDefinitionById<"item.obtainFromPool">,
    context: EventEffectExecutionContext,
  ): unknown {
    const draws = this.dependencies.drawItemPool(
      context,
      effect.parameters.itemPoolId,
      effect.parameters.drawCount,
    );
    const outputs: unknown[] = [];

    this.updateTargets(effect.targetType, context, (player) => {
      let inventory = player.inventory;

      for (const draw of draws) {
        const result = receiveItem(
          inventory,
          {
            definitionId: draw.itemDefinitionId,
            quantity: draw.quantity,
            sourceId: context.eventId,
            newItemInstanceIds: this.dependencies.createItemInstanceIds(context, draw.quantity),
          },
          this.dependencies.itemDefinitions,
        );
        inventory = result.inventory;
        outputs.push(result);
      }

      return { ...player, inventory };
    });

    return Object.freeze(outputs);
  }

  /**
   * 方法名：applyStatus
   * 作用：通过状态系统向目标玩家添加指定层数的 Buff 或 Debuff。
   * @param effect 状态添加效果。
   * @param context 当前事件效果执行上下文。
   * @returns 每名目标玩家最后一次状态应用结果。
   */
  applyStatus(
    effect: EventEffectDefinitionById<"status.add">,
    context: EventEffectExecutionContext,
  ): unknown {
    const outputs: unknown[] = [];

    this.updateTargets(effect.targetType, context, (player) => {
      let statuses = player.statuses;
      let latestResult: unknown = null;

      for (let stack = 0; stack < effect.parameters.stacks; stack += 1) {
        const result = applyStatusToCharacter(statuses, this.dependencies.statusDefinitions, {
          definitionId: effect.parameters.statusDefinitionId,
          newInstanceId: this.dependencies.createStatusInstanceId(context, player.playerId),
          sourceId: context.eventId,
          createdAtSequence: this.dependencies.getUpdateSequence(context),
        });
        statuses = result.state;
        latestResult = result;
      }

      outputs.push(latestResult);
      return { ...player, statuses };
    });

    return Object.freeze(outputs);
  }

  /**
   * 方法名：teleport
   * 作用：将触发玩家传送至目标地块，并通过地图探索系统记录成功进入。
   * @param effect 目标地块传送效果。
   * @param context 当前事件效果执行上下文。
   * @returns 最终地块标识与是否首次探索的信息。
   */
  teleport(
    effect: EventEffectDefinitionById<"movement.teleport">,
    context: EventEffectExecutionContext,
  ): unknown {
    let output: unknown = null;

    this.updateTargets(effect.targetType, context, (player) => {
      const destinationTileId = effect.parameters.destinationTileId as TileId;

      if (this.state.map.getTileById(destinationTileId) === undefined) {
        throw new Error(`Teleport destination tile does not exist: ${destinationTileId}`);
      }

      const entry = recordSuccessfulTileEntry(
        player.exploration,
        destinationTileId,
        this.state.map,
      );
      output = Object.freeze({
        destinationTileId,
        isFirstExploration: entry.isFirstExploration,
      });

      return {
        ...player,
        currentTileId: destinationTileId,
        exploration: entry.explorationState,
      };
    });

    return output;
  }

  /**
   * 方法名：changeWeather
   * 作用：通过天气运行时系统创建事件指定的全域或当前区域天气。
   * @param effect 天气变化效果。
   * @param context 当前事件效果执行上下文。
   * @returns 新创建的活动天气实例。
   */
  changeWeather(
    effect: EventEffectDefinitionById<"weather.change">,
    context: EventEffectExecutionContext,
  ): unknown {
    const definition = this.dependencies.weatherDefinitions[effect.parameters.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown event weather definition: ${effect.parameters.weatherId}`);
    }

    const isWorldWeather = effect.targetType === "WORLD";
    const scopeTargetId = isWorldWeather ? null : this.getTriggeringPlayerRegionId(context);
    const weatherInstanceId = this.dependencies.createWeatherInstanceId(context);
    const weather = applyWeather(this.state.weather, definition, {
      instanceId: weatherInstanceId,
      sourceType: "EVENT",
      sourceId: context.eventId,
      startedRound: context.resolvedAtTurn,
      scopeType: isWorldWeather ? "WORLD" : "REGION",
      coexistencePolicy: isWorldWeather ? "REPLACE" : "COEXIST",
      scopeTargetId,
      ...(effect.parameters.durationRounds === undefined
        ? {}
        : { durationRounds: effect.parameters.durationRounds }),
    });
    this.state = freezeState({ ...this.state, weather });

    return weather.activeWeathers.find((instance) => instance.instanceId === weatherInstanceId);
  }

  /**
   * 方法名：getTriggeringPlayerRegionId
   * 作用：根据事件触发玩家当前位置解析当前区域标识。
   * @param context 当前事件效果执行上下文。
   * @returns 触发玩家当前地块的区域定义标识。
   */
  private getTriggeringPlayerRegionId(context: EventEffectExecutionContext): string {
    const playerId = requireTriggeringPlayerId(context);
    const player = this.state.players.find((candidate) => candidate.playerId === playerId);

    if (player === undefined) {
      throw new Error(`Event effect target player does not exist: ${playerId}`);
    }

    const tile = this.state.map.getTileById(player.currentTileId);

    if (tile === undefined) {
      throw new Error(`Event effect player tile does not exist: ${player.currentTileId}`);
    }

    return tile.regionDefinitionId;
  }

  /**
   * 方法名：updateTargets
   * 作用：解析事件效果目标并不可变更新对应玩家状态。
   * @param targetType 当前效果支持的触发玩家或全部玩家目标。
   * @param context 当前事件效果执行上下文。
   * @param update 单名目标玩家的业务状态更新函数。
   * @returns 无返回值。
   * @throws 触发玩家缺失或目标玩家不存在时抛出错误。
   */
  private updateTargets(
    targetType: "TRIGGER_PLAYER" | "ALL_PLAYERS",
    context: EventEffectExecutionContext,
    update: (player: EventEffectPlayerState<ResourceId>) => EventEffectPlayerState<ResourceId>,
  ): void {
    const targetPlayerIds =
      targetType === "ALL_PLAYERS"
        ? this.state.players.map((player) => player.playerId)
        : [requireTriggeringPlayerId(context)];
    const targetSet = new Set(targetPlayerIds);

    for (const playerId of targetSet) {
      if (!this.state.players.some((player) => player.playerId === playerId)) {
        throw new Error(`Event effect target player does not exist: ${playerId}`);
      }
    }

    this.state = freezeState({
      ...this.state,
      players: this.state.players.map((player) =>
        targetSet.has(player.playerId) ? update(player) : player,
      ),
    });
  }
}

/**
 * 方法名：requireTriggeringPlayerId
 * 作用：读取必须存在的事件触发玩家标识。
 * @param context 当前事件效果执行上下文。
 * @returns 非空触发玩家标识。
 * @throws 世界事件缺少玩家但效果要求触发玩家时抛出错误。
 */
function requireTriggeringPlayerId(context: EventEffectExecutionContext): string {
  if (context.triggeringPlayerId === null) {
    throw new Error("Event effect requires a triggering player");
  }

  return context.triggeringPlayerId;
}

/**
 * 方法名：freezeState
 * 作用：冻结事件效果状态的玩家集合，避免结算外部修改内部快照。
 * @param state 需要冻结的事件效果状态。
 * @returns 玩家集合不可变的新状态。
 */
function freezeState<ResourceId extends string>(
  state: EventGameplayEffectState<ResourceId>,
): EventGameplayEffectState<ResourceId> {
  return Object.freeze({ ...state, players: Object.freeze([...state.players]) });
}
