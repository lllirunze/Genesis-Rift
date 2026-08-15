import {
  acquireHandCardsFromSharedDeck,
  abandonTemporaryPickup,
  advanceCharacterStatusesAtTurnEnd,
  advanceDownedStateAtTurnEnd,
  advanceReincarnationProtectionAtTurnEnd,
  advanceSoulWaitAtOwnerTurnEnd,
  advanceTurnState,
  addPlayerSessionState,
  attemptReincarnation,
  breakReincarnationProtectionForHostileAction,
  canBeTargetedByHostileAction,
  completeReincarnation,
  completeMidGameJoin,
  createActiveCharacterSurvivalState,
  createBattleSettlement,
  createCoreConsumableEffectHandlerRegistry,
  createCombatAttributeSnapshot,
  createCharacterAttributeSnapshot,
  createEquipmentAttributeModifiers,
  createEventRuntimeState,
  createEncounterRuntimeState,
  createEventView,
  createGameplayEventEffectHandlerRegistry,
  createStatusAttributeModifiers,
  createWeatherMovementRuleResolver,
  equipItemFromBackpack,
  advanceEnvironmentRound,
  createTurnState,
  getEnvironmentPublicView,
  getCharacterMovementPointLimit,
  getCubeCoordinateDistance,
  getEquippedWeaponAttack,
  isTileExplored,
  recordBattleSettlement,
  recordSuccessfulTileEntry,
  getPlayerSessionState,
  mergeBackpackItemStacks,
  moveBackpackItem,
  removeBackpackItem,
  removePlayerFromTurnState,
  removePlayerSessionState,
  RandomManager,
  replacePlayerSessionState,
  resolveAttack,
  selectItemPoolDraws,
  settleCharacterDamage,
  settleNormalMovement,
  splitBackpackItemStack,
  storeTemporaryPickupInBackpack,
  unequipItemToBackpack,
  useConsumableItem,
  triggerEvent,
  settleEventOption,
  settleEventReveal,
  settleEventResolution,
  EventGameplayEffectStateAdapter,
  evaluateAttackEligibility,
  canCharacterPerformAttack,
  createSoulStateFromDeath,
  createSoulStateForMidGameJoin,
  type GameSessionState,
  type GameSessionValidationContext,
  type BackpackPosition,
  type EquipmentSlot,
  type EventConditionEvaluationContext,
  type EventDefinitionCatalog,
  type EventRuntimeState,
  type HexDirection,
  type HexTile,
  type PlayerSessionState,
  type TurnState,
} from "@genesis-rift/game-core";
import {
  CONSUMABLE_USAGE_CATALOG,
  DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
  EVENT_DEFINITION_CATALOG,
  EVENT_POOL_DEFINITION_CATALOG,
  ENCOUNTER_DEFINITION_CATALOG,
  ITEM_POOL_DEFINITION_CATALOG,
  MAP_CONTENT_DEFINITION_CATALOG,
  WEATHER_CARD_MAPPING_CATALOG,
  WEATHER_EFFECT_DEFINITION_CATALOG,
} from "@genesis-rift/game-data";
import type {
  GameId,
  LanCharacterSelection,
  LanGameSessionSnapshot,
  ItemDefinitionCatalog,
  PlayerId,
  TileId,
} from "@genesis-rift/shared";

import { createDefaultPlayerSessionState } from "./default-initial-game-session-factory.ts";
/** 断线玩家可恢复原角色的全局玩家回合数量。 */
export const DISCONNECTED_PLAYER_RECOVERY_TURN_LIMIT = 10;

/** 描述服务端游戏会话的稳定业务错误代码。 */
export type ServerGameSessionErrorCode =
  | "GAME_NOT_RUNNING"
  | "PLAYER_NOT_IN_GAME"
  | "NOT_ACTIVE_PLAYER"
  | "PLAYER_DISCONNECTED"
  | "PLAYER_NOT_DISCONNECTED"
  | "MOVE_NOT_AVAILABLE"
  | "ATTACK_NOT_AVAILABLE"
  | "REINCARNATION_NOT_AVAILABLE"
  | "ITEM_NOT_AVAILABLE"
  | "EVENT_NOT_AVAILABLE";

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

/** 描述运行中房间中途加入者完成角色选择后提交给游戏会话的基础信息。 */
export interface MidGamePlayerJoinInput {
  readonly playerId: PlayerId;
  readonly characterSelection: LanCharacterSelection;
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
    }
  | {
      readonly type: "player.moved";
      readonly gameId: GameId;
      readonly playerId: PlayerId;
      readonly originTileId: string;
      readonly targetTileId: string;
    }
  | {
      readonly type: "battle.attackResolved";
      readonly gameId: GameId;
      readonly attackId: string;
      readonly attackerId: PlayerId;
      readonly defenderId: PlayerId;
      readonly outcome: "RESOLVED" | "EVADED";
      readonly finalDamage: number;
      readonly defenderHealth: number;
      readonly defenderShield: number;
      readonly defenderSurvivalStatus: string;
    }
  | {
      readonly type: "player.survivalChanged";
      readonly gameId: GameId;
      readonly playerId: PlayerId;
      readonly status: string;
      readonly downedTurnsRemaining: number;
    }
  | {
      readonly type: "player.reincarnationResolved";
      readonly gameId: GameId;
      readonly playerId: PlayerId;
      readonly outcome: "FAILED" | "SUCCEEDED";
      readonly rolls: readonly number[];
      readonly spawnTileId: TileId | null;
      readonly protectionTurns: number;
    };

/** 描述从角色最终数值解析一个新回合可用移动力的可替换规则。 */
export type MovementPointResolver<ResourceId extends string = string> = (
  player: PlayerSessionState<ResourceId>,
) => number;

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
  #remainingMovementPoints = 0;
  #activePlayerHasPrimaryAction = true;
  readonly #disconnectedPlayers = new Map<PlayerId, DisconnectedPlayerState>();
  readonly #movementPointResolver: MovementPointResolver<ResourceId>;

  /**
   * 方法名：constructor
   * 作用：接管已完成完整校验的游戏会话状态，并初始化行动顺序。
   * @param state 游戏规则层创建的完整权威状态。
   * @param validationContext 后续替换或移除玩家时需要使用的静态定义集合。
   * @param movementPointResolver 新回合读取角色最终移动力的可替换规则。
   * @returns 无返回值。
   */
  constructor(
    state: GameSessionState<ResourceId>,
    validationContext: GameSessionValidationContext<ResourceId, DerivedAttribute>,
    movementPointResolver: MovementPointResolver<ResourceId> = (player) =>
      resolveDefaultMovementPoints(player, validationContext),
  ) {
    this.#state = state;
    this.#validationContext = validationContext;
    this.#turn = createTurnState({ playerOrder: state.playerOrder });
    this.#movementPointResolver = movementPointResolver;
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
    this.resetActivePlayerMovementPoints();
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
    this.advanceActivePlayerStatusesAtTurnEnd(playerId);
    const survivalEvent = this.advanceActivePlayerSurvivalAtTurnEnd(playerId);
    this.advanceActivePlayerRevivalAtTurnEnd(playerId, survivalEvent !== null);
    const previousRound = this.#turn.round;
    this.#turn = advanceTurnState(this.#turn, this.#state.playerOrder, {
      unavailablePlayerIds: [...this.#disconnectedPlayers.keys()],
    });
    this.advanceEnvironmentAtRoundBoundary(previousRound);
    this.resetActivePlayerMovementPoints();
    this.#revision += 1;
    const events: GameSessionEvent[] = [
      { type: "turn.advanced", gameId: this.#state.gameId, turn: this.#turn },
    ];
    if (survivalEvent !== null) {
      events.unshift(survivalEvent);
    }
    events.push(...this.removeExpiredDisconnectedPlayers());
    return this.createResult(events);
  }

  /**
   * 方法名：attackActivePlayer
   * 作用：结算当前行动玩家对另一名相邻且可见玩家发起的一次普通物理攻击。
   * @param playerId 请求攻击的当前行动玩家标识。
   * @param targetPlayerId 被攻击的目标玩家标识。
   * @returns 攻击公开结果事件与最新权威会话快照。
   * @throws 攻击者不是当前行动者、目标不合法或攻击条件不满足时抛出错误。
   */
  attackActivePlayer(
    playerId: PlayerId,
    targetPlayerId: PlayerId,
  ): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertActiveConnectedPlayer(playerId);
    const attacker = getPlayerSessionState(this.#state, playerId);
    const defender = getPlayerSessionState(this.#state, targetPlayerId);
    const healthResourceId = "health" as ResourceId;
    const attackerTile = this.#state.world.map.getTileById(attacker.map.currentTileId);
    const defenderTile = this.#state.world.map.getTileById(defender.map.currentTileId);

    if (attackerTile === undefined || defenderTile === undefined) {
      throw new ServerGameSessionError(
        "ATTACK_NOT_AVAILABLE",
        "Attack participants must occupy map tiles",
      );
    }

    const eligibility = evaluateAttackEligibility({
      hasActionPermission: this.#activePlayerHasPrimaryAction,
      attackerCanAttack: canCharacterPerformAttack(attacker.battle.survival),
      targetIsAttackable:
        playerId !== targetPlayerId &&
        defender.battle.survival.status !== "DEAD" &&
        canBeTargetedByHostileAction(defender.revival.protection),
      targetIsVisible: isTileExplored(attacker.map.exploration, defender.map.currentTileId),
      targetIsInRange:
        getCubeCoordinateDistance(attackerTile.coordinate, defenderTile.coordinate) <= 1,
      resourcesAreSufficient: true,
      mapAllowsAttack: true,
    });

    if (!eligibility.allowed) {
      throw new ServerGameSessionError(
        "ATTACK_NOT_AVAILABLE",
        `Normal attack is not available: ${eligibility.reason}`,
      );
    }

    const equipmentDefinitions = Object.fromEntries(
      this.#validationContext.equipmentDefinitions.map((definition) => [
        definition.definitionId,
        definition,
      ]),
    );
    const attackerAttributes = createCombatAttributeSnapshot({
      character: attacker.character,
      equipment: attacker.equipment,
      equipmentDefinitions,
      statuses: attacker.statuses,
      statusDefinitions: this.#validationContext.statusDefinitions,
      derivedAttributeConfigs: DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
    }).attributes.derivedAttributes;
    const defenderAttributes = createCombatAttributeSnapshot({
      character: defender.character,
      equipment: defender.equipment,
      equipmentDefinitions,
      statuses: defender.statuses,
      statusDefinitions: this.#validationContext.statusDefinitions,
      derivedAttributeConfigs: DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
    }).attributes.derivedAttributes;
    const attackId = `attack:${this.#state.gameId}:${this.#revision}`;
    const random = RandomManager.restore(this.#state.random);
    const resolution = resolveAttack(random.getStream("combat"), {
      context: {
        attackId,
        parentFlowId: null,
        attackerId: playerId,
        defenderId: targetPlayerId,
        sourceType: "normal",
        sourceId: null,
        damageType: "PHYSICAL",
        actionConsumed: true,
        movementPointsConsumed: this.#remainingMovementPoints,
      },
      defense: { cancelled: false },
      targetEvasionRate: defenderAttributes.evasionRate,
      sourceCriticalRate: attackerAttributes.criticalRate,
      damage: {
        damageType: "PHYSICAL",
        characterAttack: attackerAttributes.physicalAttack,
        weaponAttack: getEquippedWeaponAttack(attacker.equipment, equipmentDefinitions),
        attackModifier: 0,
        targetDefense: defenderAttributes.physicalDefense,
        penetration: attackerAttributes.armorPenetration,
        minimumDamageEnabled: true,
        critical: {
          enabled: true,
          triggered: false,
          damagePercent: attackerAttributes.criticalDamage,
        },
      },
      targetVitals: {
        currentShield: defender.battle.currentShield,
        currentHealth: defender.resources.resources[healthResourceId].current,
        shieldCanAbsorb: true,
      },
    });
    const settlement = createBattleSettlement(
      `settlement:${attackId}`,
      resolution,
      defender.battle.survival,
    );
    const recorded = recordBattleSettlement(this.#state.world.battleSettlementLedger, settlement);

    if (recorded.outcome === "DUPLICATE") {
      throw new ServerGameSessionError("ATTACK_NOT_AVAILABLE", "Attack has already been settled");
    }

    let nextDefender = defender;

    if (resolution.vitals !== null) {
      const damage = settleCharacterDamage({
        resources: defender.resources,
        healthResourceId,
        currentShield: defender.battle.currentShield,
        survival: defender.battle.survival,
        damage: {
          damageType: resolution.vitals.damageType,
          finalDamage: resolution.vitals.finalDamage,
          shieldCanAbsorb: true,
        },
      });
      nextDefender = {
        ...defender,
        resources: damage.resources,
        battle: {
          currentShield: damage.currentShield,
          survival: damage.survival,
        },
      };
    }

    const nextAttacker =
      attacker.revival.protection === null
        ? attacker
        : {
            ...attacker,
            revival: {
              ...attacker.revival,
              protection: breakReincarnationProtectionForHostileAction(attacker.revival.protection),
            },
          };
    this.#state = replacePlayerSessionState(this.#state, nextDefender, this.#validationContext);
    this.#state = replacePlayerSessionState(this.#state, nextAttacker, this.#validationContext);
    this.#state = {
      ...this.#state,
      world: { ...this.#state.world, battleSettlementLedger: recorded.ledger },
      random: random.exportState(),
    };
    this.#remainingMovementPoints = 0;
    this.#activePlayerHasPrimaryAction = false;
    this.#revision += 1;

    return this.createResult([
      {
        type: "battle.attackResolved",
        gameId: this.#state.gameId,
        attackId,
        attackerId: playerId,
        defenderId: targetPlayerId,
        outcome: resolution.outcome === "EVADED" ? "EVADED" : "RESOLVED",
        finalDamage: resolution.damage?.finalDamage ?? 0,
        defenderHealth: nextDefender.resources.resources[healthResourceId].current,
        defenderShield: nextDefender.battle.currentShield,
        defenderSurvivalStatus: nextDefender.battle.survival.status,
      },
    ]);
  }

  /**
   * 方法名：attemptActivePlayerReincarnation
   * 作用：为当前行动位中已完成等待的灵魂执行一次 D20 轮回判定，并在成功后重新进入地图。
   * @param playerId 请求轮回判定的当前行动玩家标识。
   * @returns 轮回成功或失败的公开结果与最新权威快照。
   * @throws 玩家未处于可申请轮回的灵魂状态或安全出生点不可用时抛出错误。
   */
  attemptActivePlayerReincarnation(playerId: PlayerId): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertActiveConnectedPlayer(playerId);
    const player = getPlayerSessionState(this.#state, playerId);

    if (player.revival.soul === null) {
      throw new ServerGameSessionError(
        "REINCARNATION_NOT_AVAILABLE",
        "Player is not awaiting reincarnation",
      );
    }

    const random = RandomManager.restore(this.#state.random);
    let attempt;

    try {
      attempt = attemptReincarnation(
        player.revival.soul,
        random.getStream("reincarnation"),
        this.#turn.globalTurn,
      );
    } catch (error) {
      throw new ServerGameSessionError(
        "REINCARNATION_NOT_AVAILABLE",
        error instanceof Error ? error.message : "Reincarnation is not available",
      );
    }

    if (attempt.outcome === "FAILED") {
      this.#state = replacePlayerSessionState(
        this.#state,
        { ...player, revival: { ...player.revival, soul: attempt.state } },
        this.#validationContext,
      );
      this.#state = { ...this.#state, random: random.exportState() };
      this.#revision += 1;
      return this.createResult([
        {
          type: "player.reincarnationResolved",
          gameId: this.#state.gameId,
          playerId,
          outcome: "FAILED",
          rolls: attempt.rolls,
          spawnTileId: null,
          protectionTurns: 0,
        },
      ]);
    }

    const completion = player.revival.isMidGameJoin
      ? completeMidGameJoin(
          attempt.state,
          player.resources,
          this.getReincarnationSpawnCandidates(),
          random.getStream("reincarnation"),
        )
      : completeReincarnation(
          attempt.state,
          player.resources,
          "health" as ResourceId,
          this.getReincarnationSpawnCandidates(),
          random.getStream("reincarnation"),
        );
    const spawnedTile = this.#state.world.map.getTileById(completion.spawn.spawnId as TileId);

    if (spawnedTile === undefined) {
      throw new Error(`Reincarnation spawn tile is unavailable: ${completion.spawn.spawnId}`);
    }

    const initialHand = player.revival.isMidGameJoin
      ? acquireHandCardsFromSharedDeck(
          this.#state.world.handCardDeck,
          player.hand,
          this.#validationContext.handCardCatalog,
          random.getStream("deck"),
          { type: "specialEffect", sourceId: "revival.mid-game-join" },
          2,
        )
      : null;

    if (initialHand !== null) {
      this.#state = {
        ...this.#state,
        world: { ...this.#state.world, handCardDeck: initialHand.deckState },
      };
    }

    this.#state = replacePlayerSessionState(
      this.#state,
      {
        ...player,
        resources: completion.resources,
        hand: initialHand?.playerHandState ?? player.hand,
        map: {
          currentTileId: spawnedTile.tileId,
          exploration: recordSuccessfulTileEntry(
            player.map.exploration,
            spawnedTile.tileId,
            this.#state.world.map,
          ).explorationState,
        },
        battle: { currentShield: 0, survival: createActiveCharacterSurvivalState(playerId) },
        revival: { soul: null, protection: completion.protection, isMidGameJoin: false },
      },
      this.#validationContext,
    );
    this.#state = {
      ...this.#state,
      random: random.exportState(),
    };
    this.#remainingMovementPoints = player.revival.isMidGameJoin
      ? 0
      : this.#movementPointResolver(player);
    this.#activePlayerHasPrimaryAction = !player.revival.isMidGameJoin;
    this.#revision += 1;
    return this.createResult([
      {
        type: "player.reincarnationResolved",
        gameId: this.#state.gameId,
        playerId,
        outcome: "SUCCEEDED",
        rolls: attempt.rolls,
        spawnTileId: spawnedTile.tileId,
        protectionTurns: completion.protection.remainingTurns,
      },
    ]);
  }

  /**
   * 方法名：addMidGamePlayer
   * 作用：将运行中房间的新成员以可立即申请轮回的灵魂状态加入行动顺序。
   * @param input 中途加入者的稳定玩家标识与已确认角色选择。
   * @returns 包含新成员的公开会话快照。
   * @throws 游戏未运行、玩家重复或地图不存在安全出生格时抛出错误。
   */
  addMidGamePlayer(input: MidGamePlayerJoinInput): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertRunning();

    if (this.#state.playerOrder.includes(input.playerId)) {
      throw new ServerGameSessionError("PLAYER_NOT_IN_GAME", "Player already belongs to this game");
    }

    const fallbackSpawn = this.getReincarnationSpawnCandidates()[0]!;
    const baseline = createDefaultPlayerSessionState({
      playerId: input.playerId,
      selection: input.characterSelection,
      map: this.#state.world.map,
      spawnTileId: fallbackSpawn.spawnId,
    });
    const player = {
      ...baseline,
      battle: {
        currentShield: 0,
        survival: { ...baseline.battle.survival, status: "DEAD" as const },
      },
      revival: {
        soul: createSoulStateForMidGameJoin(input.playerId),
        protection: null,
        isMidGameJoin: true,
      },
    };
    // 默认中途加入工厂当前固定使用 health 资源，服务端正式会话同样使用该资源标识。
    this.#state = addPlayerSessionState(
      this.#state,
      player as unknown as PlayerSessionState<ResourceId>,
      this.#validationContext,
    );
    this.#revision += 1;
    return this.createResult([]);
  }

  /**
   * 方法名：moveActivePlayer
   * 作用：结算当前行动玩家向指定相邻方向的一步普通移动与首次探索。
   * @param playerId 请求移动的当前行动玩家标识。
   * @param direction 平顶六边形地图中的目标相邻方向。
   * @returns 移动事件与包含新位置、探索后移动力的公开快照。
   * @throws 玩家不可行动、方向无法进入或移动力不足时抛出错误。
   */
  moveActivePlayer(
    playerId: PlayerId,
    direction: HexDirection,
  ): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertActiveConnectedPlayer(playerId);
    const player = getPlayerSessionState(this.#state, playerId);
    const settlement = settleNormalMovement({
      map: this.#state.world.map,
      currentTileId: player.map.currentTileId,
      explorationState: player.map.exploration,
      terrainDefinitions: MAP_CONTENT_DEFINITION_CATALOG.terrains,
      availableMovementPoints: this.#remainingMovementPoints,
      directions: [direction],
      ruleResolver: createWeatherMovementRuleResolver(
        this.#state.world.environment.weather,
        MAP_CONTENT_DEFINITION_CATALOG.terrains,
        {
          weatherDefinitions: this.#validationContext.weatherDefinitions,
          disasterDefinitions: this.#validationContext.weatherDisasterDefinitions,
          effectDefinitions: WEATHER_EFFECT_DEFINITION_CATALOG,
        },
      ),
    });

    const step = settlement.steps[0];

    if (step === undefined) {
      const reason = settlement.interruption?.reason ?? "unknown";
      throw new ServerGameSessionError(
        "MOVE_NOT_AVAILABLE",
        `Unable to move player in direction ${direction}: ${reason}`,
      );
    }

    this.#state = replacePlayerSessionState(
      this.#state,
      {
        ...player,
        map: {
          currentTileId: settlement.finalTileId,
          exploration: settlement.explorationState,
        },
      },
      this.#validationContext,
    );
    this.#remainingMovementPoints = settlement.remainingMovementPoints;
    this.triggerFirstExplorationEvent(playerId, step.targetTileId, step.isFirstExploration);
    this.#revision += 1;

    return this.createResult([
      {
        type: "player.moved",
        gameId: this.#state.gameId,
        playerId,
        originTileId: step.originTileId,
        targetTileId: step.targetTileId,
      },
    ]);
  }

  /**
   * 方法名：decideActivePlayerEventReveal
   * 作用：处理当前行动玩家对自己可选择揭露事件作出的揭露或放弃决定。
   * @param playerId 提交决定的当前行动玩家标识。
   * @param instanceId 需要处理的事件实例标识。
   * @param action 揭露或放弃事件的决定。
   * @returns 更新后的私有事件快照与公开会话快照。
   * @throws 事件不属于玩家、状态不正确或当前不能操作时抛出错误。
   */
  decideActivePlayerEventReveal(
    playerId: PlayerId,
    instanceId: string,
    action: "REVEAL" | "DECLINE",
  ): { readonly events: readonly GameSessionEvent[]; readonly snapshot: GameSessionSnapshot } {
    this.assertActiveConnectedPlayer(playerId);
    const runtime = this.requirePlayerEventInstance(playerId, instanceId, "PENDING_REVEAL");

    try {
      const result = settleEventReveal(runtime, EVENT_DEFINITION_CATALOG, {
        instanceId,
        actingPlayerId: playerId,
        action,
        decidedAtTurn: this.getEventTurn(),
      });
      this.updateEventRuntime(result.state);

      if (result.instruction.type === "READY_TO_RESOLVE") {
        this.resolveEventEffects(result.state, instanceId);
      }
    } catch (error) {
      throw this.createEventUnavailableError(error);
    }

    this.#revision += 1;
    return this.createResult([]);
  }

  /**
   * 方法名：selectActivePlayerEventOption
   * 作用：校验并结算当前行动玩家为已揭露事件选择的一条可用路线。
   * @param playerId 提交选项的当前行动玩家标识。
   * @param instanceId 已揭露事件实例标识。
   * @param optionId 需要执行的事件选项标识。
   * @returns 完成效果结算后的权威会话快照。
   * @throws 事件不属于玩家、选项不可用或状态不正确时抛出错误。
   */
  selectActivePlayerEventOption(
    playerId: PlayerId,
    instanceId: string,
    optionId: string,
  ): { readonly events: readonly GameSessionEvent[]; readonly snapshot: GameSessionSnapshot } {
    this.assertActiveConnectedPlayer(playerId);
    const runtime = this.requirePlayerEventInstance(playerId, instanceId, "REVEALED");
    const player = getPlayerSessionState(this.#state, playerId);
    const tile = this.requirePlayerCurrentTile(player);

    try {
      const result = settleEventOption(runtime, EVENT_DEFINITION_CATALOG, {
        instanceId,
        actingPlayerId: playerId,
        optionId,
        selectedAtTurn: this.getEventTurn(),
        conditionContext: createEventConditionContext(
          player,
          tile,
          this.#state.world.environment,
          runtime,
          false,
        ),
      });
      this.resolveEventEffects(result.state, instanceId);
    } catch (error) {
      throw this.createEventUnavailableError(error);
    }

    this.#revision += 1;
    return this.createResult([]);
  }

  /**
   * 方法名：moveInventoryItem
   * 作用：移动本人背包中的单个物品，不消耗回合行动或移动力。
   * @param playerId 请求整理背包的在线玩家标识。
   * @param itemInstanceId 需要移动的物品实例标识。
   * @param targetPosition 物品左上角需要放置的目标坐标。
   * @returns 更新背包后的公开会话结果。
   */
  moveInventoryItem(playerId: PlayerId, itemInstanceId: string, targetPosition: BackpackPosition) {
    return this.updatePlayerItemState(playerId, (player) => ({
      ...player,
      inventory: {
        ...player.inventory,
        backpack: moveBackpackItem(
          player.inventory.backpack,
          itemInstanceId,
          targetPosition,
          this.#validationContext.itemDefinitions,
        ),
      },
    }));
  }

  /**
   * 方法名：mergeInventoryItemStacks
   * 作用：将同类且可兼容的两个背包堆叠合并，不消耗回合行动或移动力。
   * @param playerId 请求合并物品的在线玩家标识。
   * @param sourceItemInstanceId 提供数量的来源物品实例标识。
   * @param targetItemInstanceId 接收数量的目标物品实例标识。
   * @returns 更新背包后的公开会话结果。
   */
  mergeInventoryItemStacks(
    playerId: PlayerId,
    sourceItemInstanceId: string,
    targetItemInstanceId: string,
  ) {
    return this.updatePlayerItemState(playerId, (player) => {
      const result = mergeBackpackItemStacks(
        player.inventory.backpack,
        sourceItemInstanceId,
        targetItemInstanceId,
        this.#validationContext.itemDefinitions,
      );

      return { ...player, inventory: { ...player.inventory, backpack: result.backpack } };
    });
  }

  /**
   * 方法名：splitInventoryItemStack
   * 作用：拆分一组可叠加物品到新的实例与指定背包位置，不消耗回合行动或移动力。
   * @param playerId 请求拆分物品的在线玩家标识。
   * @param sourceItemInstanceId 被拆分的来源物品实例标识。
   * @param splitQuantity 新堆叠需要包含的物品数量。
   * @param newItemInstanceId 新生成物品堆叠的唯一实例标识。
   * @param targetPosition 新堆叠的左上角背包坐标。
   * @returns 更新背包后的公开会话结果。
   */
  splitInventoryItemStack(
    playerId: PlayerId,
    sourceItemInstanceId: string,
    splitQuantity: number,
    newItemInstanceId: string,
    targetPosition: BackpackPosition,
  ) {
    return this.updatePlayerItemState(playerId, (player) => ({
      ...player,
      inventory: {
        ...player.inventory,
        backpack: splitBackpackItemStack(
          player.inventory.backpack,
          sourceItemInstanceId,
          splitQuantity,
          newItemInstanceId,
          targetPosition,
          this.#validationContext.itemDefinitions,
        ),
      },
    }));
  }

  /**
   * 方法名：discardInventoryItem
   * 作用：主动移除本人背包中的一个物品实例，不自动替换或影响其他物品。
   * @param playerId 请求丢弃物品的在线玩家标识。
   * @param itemInstanceId 需要丢弃的物品实例标识。
   * @returns 更新背包后的公开会话结果。
   */
  discardInventoryItem(playerId: PlayerId, itemInstanceId: string) {
    return this.updatePlayerItemState(playerId, (player) => {
      const result = removeBackpackItem(player.inventory.backpack, itemInstanceId);
      return { ...player, inventory: { ...player.inventory, backpack: result.backpack } };
    });
  }

  /**
   * 方法名：storeTemporaryPickup
   * 作用：将临时拾取区中唯一的新获得物品放入合法背包位置。
   * @param playerId 请求处理临时拾取物的在线玩家标识。
   * @param targetPosition 可选的目标左上角背包坐标，未提供时自动寻找合法位置。
   * @returns 更新临时拾取区与背包后的公开会话结果。
   */
  storeTemporaryPickup(playerId: PlayerId, targetPosition?: BackpackPosition) {
    return this.updatePlayerItemState(playerId, (player) => ({
      ...player,
      inventory: storeTemporaryPickupInBackpack(
        player.inventory,
        this.#validationContext.itemDefinitions,
        targetPosition,
      ),
    }));
  }

  /**
   * 方法名：abandonTemporaryPickup
   * 作用：主动放弃临时拾取区中唯一的新获得物品，禁止将背包原有物品移入该区域。
   * @param playerId 请求放弃临时拾取物的在线玩家标识。
   * @returns 清空临时拾取区后的公开会话结果。
   */
  abandonTemporaryPickup(playerId: PlayerId) {
    return this.updatePlayerItemState(playerId, (player) => ({
      ...player,
      inventory: abandonTemporaryPickup(player.inventory).inventory,
    }));
  }

  /**
   * 方法名：equipInventoryItem
   * 作用：将本人背包中的装备穿戴到指定兼容栏位，并在替换时原子放回旧装备。
   * @param playerId 请求穿戴装备的在线玩家标识。
   * @param itemInstanceId 背包中待穿戴装备的物品实例标识。
   * @param slot 目标装备栏位。
   * @param replacedEquipmentPosition 替换已有装备时旧装备需要放回的背包位置。
   * @returns 更新背包与公开装备栏后的会话结果。
   */
  equipInventoryItem(
    playerId: PlayerId,
    itemInstanceId: string,
    slot: EquipmentSlot,
    replacedEquipmentPosition?: BackpackPosition,
  ) {
    return this.updatePlayerItemState(playerId, (player) => {
      const equipmentDefinitions = Object.fromEntries(
        this.#validationContext.equipmentDefinitions.map((definition) => [
          definition.definitionId,
          definition,
        ]),
      );
      const state = equipItemFromBackpack(
        { inventory: player.inventory, loadout: player.equipment },
        {
          itemInstanceId,
          slot,
          ...(replacedEquipmentPosition === undefined ? {} : { replacedEquipmentPosition }),
        },
        this.#validationContext.itemDefinitions,
        equipmentDefinitions,
      );

      return { ...player, inventory: state.inventory, equipment: state.loadout };
    });
  }

  /**
   * 方法名：unequipInventoryItem
   * 作用：将本人已穿戴装备放回指定合法背包位置。
   * @param playerId 请求卸下装备的在线玩家标识。
   * @param slot 需要卸下的装备栏位。
   * @param targetPosition 装备在背包中的目标左上角坐标。
   * @returns 更新背包与公开装备栏后的会话结果。
   */
  unequipInventoryItem(playerId: PlayerId, slot: EquipmentSlot, targetPosition: BackpackPosition) {
    return this.updatePlayerItemState(playerId, (player) => {
      const equipmentDefinitions = Object.fromEntries(
        this.#validationContext.equipmentDefinitions.map((definition) => [
          definition.definitionId,
          definition,
        ]),
      );
      const state = unequipItemToBackpack(
        { inventory: player.inventory, loadout: player.equipment },
        { slot, targetPosition },
        this.#validationContext.itemDefinitions,
        equipmentDefinitions,
      );

      return { ...player, inventory: state.inventory, equipment: state.loadout };
    });
  }

  /**
   * 方法名：useConsumableItem
   * 作用：使用本人背包中已经配置效果的消耗品，并原子更新资源、状态与物品数量。
   * @param playerId 请求使用物品的在线玩家标识。
   * @param itemDefinitionId 需要使用的消耗品定义编号。
   * @returns 更新资源、状态与背包后的公开会话结果。
   */
  useConsumableItem(playerId: PlayerId, itemDefinitionId: string) {
    return this.updatePlayerItemState(playerId, (player) => {
      const result = useConsumableItem(
        player.inventory,
        player.resources,
        player.statuses,
        this.#validationContext.itemDefinitions,
        CONSUMABLE_USAGE_CATALOG,
        createCoreConsumableEffectHandlerRegistry(this.#validationContext.statusDefinitions),
        {
          playerId,
          itemDefinitionId,
          createdAtSequence: this.#revision + 1,
          createStatusInstanceId: (effectIndex, statusDefinitionId) =>
            `status:${playerId}:${this.#revision + 1}:${effectIndex}:${statusDefinitionId}`,
        },
      );

      return {
        ...player,
        inventory: result.inventory,
        resources: result.resourceState as PlayerSessionState<ResourceId>["resources"],
        statuses: result.statusState,
      };
    });
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
        this.resetActivePlayerMovementPoints();
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
    return this.createSnapshot(null);
  }

  /**
   * 方法名：getSnapshotForPlayer
   * 作用：为指定玩家创建包含本人私有背包与手牌、但不包含他人私有数据的会话快照。
   * @param viewerPlayerId 请求读取快照的已加入玩家标识。
   * @returns 可安全发送给该玩家客户端的会话快照。
   * @throws 查看者不属于当前游戏会话时抛出错误。
   */
  getSnapshotForPlayer(viewerPlayerId: PlayerId): GameSessionSnapshot {
    this.assertPlayerExists(viewerPlayerId);
    return this.createSnapshot(viewerPlayerId);
  }

  /** 根据可选查看者创建公开状态，并仅附加该玩家有权读取的私有数据。 */
  private createSnapshot(viewerPlayerId: PlayerId | null): GameSessionSnapshot {
    const viewer =
      viewerPlayerId === null
        ? null
        : createViewerSnapshot(
            getPlayerSessionState(this.#state, viewerPlayerId),
            this.#validationContext,
            this.#state.world.map,
            this.#state.world.eventRuntime,
            this.#state.world.environment,
          );

    return Object.freeze({
      gameId: this.#state.gameId,
      status: this.#state.status,
      revision: this.#revision,
      turn: { ...this.#turn, remainingMovementPoints: this.#remainingMovementPoints },
      environment: this.createEnvironmentSnapshot(),
      playerOrder: Object.freeze([...this.#state.playerOrder]),
      players: Object.freeze(
        this.#state.players.map((player) =>
          Object.freeze({
            playerId: player.playerId,
            gender: player.character.gender ?? null,
            identityId: player.character.identityId,
            raceId: player.character.raceId,
            currentTileId: player.map.currentTileId,
            survivalStatus: player.battle?.survival.status ?? null,
            currentHealth: player.resources?.resources["health" as ResourceId]?.current ?? null,
            maximumHealth: player.resources?.resources["health" as ResourceId]?.maximum ?? null,
            currentShield: player.battle?.currentShield ?? 0,
            equipment: Object.freeze({
              weapon: player.equipment?.slots.weapon?.definitionId ?? null,
              armor: player.equipment?.slots.armor?.definitionId ?? null,
              shoes: player.equipment?.slots.shoes?.definitionId ?? null,
              accessory1: player.equipment?.slots.accessory1?.definitionId ?? null,
              accessory2: player.equipment?.slots.accessory2?.definitionId ?? null,
              special: player.equipment?.slots.special?.definitionId ?? null,
            }),
            backpack: createBackpackMaskSnapshot(player, this.#validationContext.itemDefinitions),
          }),
        ),
      ),
      disconnectedPlayers: Object.freeze(
        [...this.#disconnectedPlayers.values()].map(({ playerId, expiresAfterGlobalTurn }) =>
          Object.freeze({ playerId, expiresAfterGlobalTurn }),
        ),
      ),
      viewer,
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

  /** 在物品规则成功后原子替换本人状态，并将底层规则异常映射为稳定业务错误。 */
  private updatePlayerItemState(
    playerId: PlayerId,
    operation: (player: PlayerSessionState<ResourceId>) => PlayerSessionState<ResourceId>,
  ): {
    readonly events: readonly GameSessionEvent[];
    readonly snapshot: GameSessionSnapshot;
  } {
    this.assertConnectedPlayer(playerId);
    const player = getPlayerSessionState(this.#state, playerId);

    try {
      this.#state = replacePlayerSessionState(
        this.#state,
        operation(player),
        this.#validationContext,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Item operation failed";
      throw new ServerGameSessionError("ITEM_NOT_AVAILABLE", message);
    }

    this.#revision += 1;
    return this.createResult([]);
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

  /** 断言玩家属于运行中会话且当前连接有效，不要求其位于行动顺序。 */
  private assertConnectedPlayer(playerId: PlayerId): void {
    this.assertRunning();
    this.assertPlayerExists(playerId);

    if (this.#disconnectedPlayers.has(playerId)) {
      throw new ServerGameSessionError(
        "PLAYER_DISCONNECTED",
        `Disconnected player cannot manage items: ${playerId}`,
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

  /** 为当前行动玩家读取最终移动力，并在不存在行动者时清空该回合资源。 */
  private resetActivePlayerMovementPoints(): void {
    const playerId = this.#turn.activePlayerId;

    if (playerId === null) {
      this.#remainingMovementPoints = 0;
      return;
    }

    const player = getPlayerSessionState(this.#state, playerId);
    const normalMovementPoints = this.#movementPointResolver(player);
    this.#remainingMovementPoints =
      player.battle === undefined
        ? normalMovementPoints
        : getCharacterMovementPointLimit(player.battle.survival, normalMovementPoints);
    this.#activePlayerHasPrimaryAction = true;
  }

  /** 在完整轮次切换时推进昼夜、天气持续时间及下一轮应抽取的天气牌。 */
  private advanceEnvironmentAtRoundBoundary(previousRound: number): void {
    if (this.#turn.round <= previousRound || this.#state.world.environment === undefined) {
      return;
    }

    const random = RandomManager.restore(this.#state.random);
    const result = advanceEnvironmentRound({
      state: this.#state.world.environment,
      randomStream: random.getStream("weather"),
      weatherMappings: WEATHER_CARD_MAPPING_CATALOG,
      weatherDefinitions: this.#validationContext.weatherDefinitions,
      weatherDisasterDefinitions: this.#validationContext.weatherDisasterDefinitions,
      createWeatherInstanceId: (cardId, round) => `weather-instance:${round}:${cardId}`,
      resolveWeatherScopeTargetId: (weatherId) => this.resolveWeatherScopeTargetId(weatherId),
    });

    this.#state = {
      ...this.#state,
      world: { ...this.#state.world, environment: result.state },
      random: random.exportState(),
    };
  }

  /** 为非全域天气选择当前地图中稳定排序后的第一个区域作为默认作用范围。 */
  private resolveWeatherScopeTargetId(weatherId: string): string | null {
    const definition =
      this.#validationContext.weatherDefinitions[weatherId] ??
      this.#validationContext.weatherDisasterDefinitions[weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown weather or disaster definition: ${weatherId}`);
    }

    if (definition.scopeType === "WORLD") {
      return null;
    }

    const regionId = [
      ...new Set(this.#state.world.map.tiles.map((tile) => tile.regionDefinitionId)),
    ].sort()[0];

    if (regionId === undefined) {
      throw new Error("Cannot resolve a regional weather scope without map regions");
    }

    return regionId;
  }

  /** 生成不包含天气牌顺序和随机状态的公开环境摘要。 */
  private createEnvironmentSnapshot(): GameSessionSnapshot["environment"] {
    if (this.#state.world.environment === undefined) {
      return null;
    }

    const environment = getEnvironmentPublicView(this.#state.world.environment);

    return Object.freeze({
      currentRound: environment.currentRound,
      dayNight: Object.freeze({
        periodId: environment.dayNight.periodId,
        elapsedRounds: environment.dayNight.elapsedRounds,
        remainingRounds: environment.dayNight.remainingRounds,
        visionModifier: environment.dayNight.visionModifier,
      }),
      activeWeatherIds: Object.freeze([...environment.activeWeatherIds]),
      activeDisaster:
        environment.activeDisaster === null
          ? null
          : Object.freeze({ ...environment.activeDisaster }),
    });
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

    this.resetActivePlayerMovementPoints();

    return events;
  }

  /**
   * 方法名：advanceActivePlayerStatusesAtTurnEnd
   * 作用：在当前玩家结束自身回合时递减其状态持续时间，并移除已经到期的状态。
   * @param playerId 当前结束回合的玩家标识。
   * @returns 无返回值。
   */
  private advanceActivePlayerStatusesAtTurnEnd(playerId: PlayerId): void {
    const player = getPlayerSessionState(this.#state, playerId);

    // 测试使用的最小会话壳不包含完整角色状态，因此不参与状态生命周期结算。
    if (player.statuses === undefined) {
      return;
    }

    const result = advanceCharacterStatusesAtTurnEnd(
      player.statuses,
      this.#validationContext.statusDefinitions,
    );

    if (result.ticked.length === 0 && result.expired.length === 0) {
      return;
    }

    this.#state = replacePlayerSessionState(
      this.#state,
      {
        ...player,
        statuses: result.state,
      },
      this.#validationContext,
    );
  }

  /**
   * 方法名：advanceActivePlayerSurvivalAtTurnEnd
   * 作用：结算击倒角色的自身回合倒计时，并在倒计时结束时转换为正式死亡。
   * @param playerId 当前结束回合的玩家标识。
   * @returns 发生击倒倒计时或死亡变化时返回可公开广播的状态事件，否则返回 null。
   */
  private advanceActivePlayerSurvivalAtTurnEnd(playerId: PlayerId): GameSessionEvent | null {
    const player = getPlayerSessionState(this.#state, playerId);

    // 测试使用的最小会话壳不包含完整战斗状态，因此不参与生存生命周期结算。
    if (player.battle === undefined) {
      return null;
    }

    const result = advanceDownedStateAtTurnEnd(player.battle.survival);

    if (result.outcome === "UNCHANGED") {
      return null;
    }

    this.#state = replacePlayerSessionState(
      this.#state,
      {
        ...player,
        battle: { ...player.battle, survival: result.state },
        revival:
          result.outcome === "DIED"
            ? { ...player.revival, soul: createSoulStateFromDeath(result.state), protection: null }
            : player.revival,
      },
      this.#validationContext,
    );

    return {
      type: "player.survivalChanged",
      gameId: this.#state.gameId,
      playerId,
      status: result.state.status,
      downedTurnsRemaining: result.state.downedTurnsRemaining,
    };
  }

  /**
   * 方法名：advanceActivePlayerRevivalAtTurnEnd
   * 作用：推进灵魂等待和轮回保护；本回合刚刚死亡时只创建灵魂，不额外减少等待时间。
   * @param playerId 当前结束自身回合的玩家标识。
   * @param survivalChanged 本回合是否刚完成击倒或死亡状态转换。
   * @returns 无返回值。
   */
  private advanceActivePlayerRevivalAtTurnEnd(playerId: PlayerId, survivalChanged: boolean): void {
    const player = getPlayerSessionState(this.#state, playerId);

    // 最小会话壳不包含轮回状态，因此不参与完整轮回生命周期结算。
    if (player.revival === undefined) {
      return;
    }

    const protection =
      player.revival.protection === null
        ? null
        : advanceReincarnationProtectionAtTurnEnd(player.revival.protection);
    const soul =
      player.revival.soul === null || survivalChanged
        ? player.revival.soul
        : advanceSoulWaitAtOwnerTurnEnd(player.revival.soul).state;

    if (soul === player.revival.soul && protection === player.revival.protection) {
      return;
    }

    this.#state = replacePlayerSessionState(
      this.#state,
      { ...player, revival: { soul, protection, isMidGameJoin: player.revival.isMidGameJoin } },
      this.#validationContext,
    );
  }

  /** 从当前地图的安全文明区域筛选稳定排序后的轮回出生点候选。 */
  private getReincarnationSpawnCandidates(): readonly {
    readonly spawnId: TileId;
    readonly settlementType: "TOWN";
  }[] {
    const candidates = this.#state.world.map.tiles
      .filter((tile) => {
        const region = (
          Object.values(MAP_CONTENT_DEFINITION_CATALOG.regions) as readonly {
            readonly definitionId: string;
            readonly tags: readonly string[];
          }[]
        ).find((definition) => definition.definitionId === tile.regionDefinitionId);
        return region?.tags.includes("safe-area") === true && tile.passability === "passable";
      })
      .sort((left, right) => left.tileId.localeCompare(right.tileId))
      .map((tile) => ({ spawnId: tile.tileId, settlementType: "TOWN" as const }));

    if (candidates.length === 0) {
      throw new ServerGameSessionError(
        "REINCARNATION_NOT_AVAILABLE",
        "No safe reincarnation spawn is available",
      );
    }

    return candidates;
  }

  /** 在首次进入野外或遗迹时从对应事件池抽取一张事件，并持久化独立事件随机流。 */
  private triggerFirstExplorationEvent(
    playerId: PlayerId,
    targetTileId: TileId,
    isFirstExploration: boolean,
  ): void {
    if (!isFirstExploration) {
      return;
    }

    const targetTile = this.#state.world.map.getTileById(targetTileId);

    if (targetTile === undefined) {
      throw new Error(`Exploration event target tile does not exist: ${targetTileId}`);
    }

    const poolIds = getExplorationEventPoolIds(
      targetTile.features.map((feature) => feature.featureId),
      targetTile.regionDefinitionId,
    );

    if (poolIds.length === 0) {
      return;
    }

    const runtime = this.#state.world.eventRuntime ?? createEventRuntimeState();
    const random = RandomManager.restore(this.#state.random);
    const triggeringPlayer = getPlayerSessionState(this.#state, playerId);
    const result = triggerEvent(
      runtime,
      random.getStream("event"),
      EVENT_DEFINITION_CATALOG,
      EVENT_POOL_DEFINITION_CATALOG,
      {
        instanceId: `event-instance:${this.getEventTurn()}:${runtime.instances.length + 1}`,
        poolIds,
        triggeringPlayerId: playerId,
        currentTurn: this.getEventTurn(),
        conditionContext: createEventConditionContext(
          triggeringPlayer,
          targetTile,
          this.#state.world.environment,
          runtime,
          true,
        ),
      },
    );

    this.updateEventRuntime(result.state, random.exportState());

    if (result.instruction.type === "READY_TO_RESOLVE") {
      this.resolveEventEffects(result.state, result.instruction.instance.instanceId);
    }
  }

  /** 将事件运行时状态写回会话，并在需要时同步独立事件随机流的最新状态。 */
  private updateEventRuntime(
    eventRuntime: EventRuntimeState,
    randomState: GameSessionState<ResourceId>["random"] = this.#state.random,
  ): void {
    this.#state = {
      ...this.#state,
      world: { ...this.#state.world, eventRuntime },
      random: randomState,
    };
  }

  /** 执行已选定事件路线，并将复用系统产出的玩家、地图与天气状态合并回权威会话。 */
  private resolveEventEffects(runtime: EventRuntimeState, instanceId: string): void {
    let generatedInstanceSequence = 0;
    const random = RandomManager.restore(this.#state.random);
    const adapter = new EventGameplayEffectStateAdapter<ResourceId>(
      {
        map: this.#state.world.map,
        players: this.#state.players.map((player) => ({
          playerId: player.playerId,
          resources: player.resources,
          inventory: player.inventory,
          statuses: player.statuses,
          currentTileId: player.map.currentTileId,
          exploration: player.map.exploration,
        })),
        weather: this.#state.world.environment.weather,
      },
      {
        itemDefinitions: this.#validationContext.itemDefinitions,
        statusDefinitions: this.#validationContext.statusDefinitions,
        createItemInstanceIds: (context, quantity) =>
          Array.from(
            { length: quantity },
            () => `event-item:${context.instanceId}:${generatedInstanceSequence++}`,
          ),
        drawItemPool: (_, itemPoolId, drawCount) =>
          selectItemPoolDraws(
            random.getStream("event"),
            ITEM_POOL_DEFINITION_CATALOG,
            itemPoolId,
            drawCount,
          ),
        createStatusInstanceId: (context, targetPlayerId) =>
          `event-status:${context.instanceId}:${targetPlayerId}:${generatedInstanceSequence++}`,
        getUpdateSequence: () => this.#revision + 1,
        weatherDefinitions: this.#validationContext.weatherDefinitions,
        createWeatherInstanceId: (context) =>
          `event-weather:${context.instanceId}:${generatedInstanceSequence++}`,
      },
    );
    const result = settleEventResolution(
      runtime,
      EVENT_DEFINITION_CATALOG,
      createGameplayEventEffectHandlerRegistry(adapter),
      {
        instanceId,
        currentTurn: this.getEventTurn(),
        durationInstanceId: `event-duration:${instanceId}:${this.#revision + 1}`,
        updateSequence: this.#revision + 1,
      },
    );
    if (result.instruction.type !== "COMPLETED") {
      throw new Error(`Event resolution did not complete: ${result.instruction.type}`);
    }
    const applied = adapter.getState();
    const encounters = this.createEventEncounters(
      result.instruction.instance.effectResults,
      instanceId,
      result.instruction.instance.triggeringPlayerId,
    );

    for (const state of applied.players) {
      const current = getPlayerSessionState(this.#state, state.playerId as PlayerId);
      this.#state = replacePlayerSessionState(
        this.#state,
        {
          ...current,
          resources: state.resources,
          inventory: state.inventory,
          statuses: state.statuses,
          map: {
            currentTileId: state.currentTileId,
            exploration: state.exploration,
          },
        },
        this.#validationContext,
      );
    }

    this.#state = {
      ...this.#state,
      world: {
        ...this.#state.world,
        eventRuntime: result.state,
        encounters,
        environment: { ...this.#state.world.environment, weather: applied.weather },
      },
      random: random.exportState(),
    };
  }

  /** 将事件结算产生的战斗延迟指令转换为可保存的敌对遭遇实例。 */
  private createEventEncounters(
    effectResults: readonly { readonly effectId: string; readonly output: unknown }[],
    eventInstanceId: string,
    triggeringPlayerId: string | null,
  ) {
    const encounters = [...(this.#state.world.encounters ?? [])];

    for (const effect of effectResults) {
      if (effect.effectId !== "battle.start" || !isBattleStartInstruction(effect.output)) {
        continue;
      }

      const definition = (
        ENCOUNTER_DEFINITION_CATALOG as Readonly<
          Record<
            string,
            (typeof ENCOUNTER_DEFINITION_CATALOG)[keyof typeof ENCOUNTER_DEFINITION_CATALOG]
          >
        >
      )[effect.output.parameters.encounterDefinitionId];

      if (definition === undefined) {
        throw new Error(
          `Unknown encounter definition: ${effect.output.parameters.encounterDefinitionId}`,
        );
      }

      if (triggeringPlayerId === null) {
        throw new Error("Battle event requires a triggering player");
      }

      const triggeringPlayer = getPlayerSessionState(this.#state, triggeringPlayerId as PlayerId);
      const instanceId = `encounter-instance:${eventInstanceId}:${encounters.length + 1}`;
      encounters.push(
        createEncounterRuntimeState(
          instanceId,
          definition,
          triggeringPlayer.playerId,
          triggeringPlayer.map.currentTileId,
        ),
      );
    }

    return Object.freeze(encounters);
  }

  /** 校验事件实例归属与预期状态，并返回当前会话事件运行时。 */
  private requirePlayerEventInstance(
    playerId: PlayerId,
    instanceId: string,
    expectedStatus: "PENDING_REVEAL" | "REVEALED",
  ): EventRuntimeState {
    const runtime = this.#state.world.eventRuntime;
    const instance = runtime?.instances.find((candidate) => candidate.instanceId === instanceId);

    if (
      runtime === undefined ||
      instance === undefined ||
      instance.triggeringPlayerId !== playerId ||
      instance.status !== expectedStatus
    ) {
      throw new ServerGameSessionError(
        "EVENT_NOT_AVAILABLE",
        "Event is not available to this player",
      );
    }

    return runtime;
  }

  /** 读取玩家当前所在的有效地图地块，避免事件条件使用不完整上下文。 */
  private requirePlayerCurrentTile(player: PlayerSessionState<ResourceId>): HexTile {
    const tile = this.#state.world.map.getTileById(player.map.currentTileId);

    if (tile === undefined) {
      throw new ServerGameSessionError("EVENT_NOT_AVAILABLE", "Player event tile is unavailable");
    }

    return tile;
  }

  /** 将事件核心或效果适配器异常转换为稳定的服务端业务错误。 */
  private createEventUnavailableError(error: unknown): ServerGameSessionError {
    if (error instanceof ServerGameSessionError) {
      return error;
    }

    return new ServerGameSessionError(
      "EVENT_NOT_AVAILABLE",
      error instanceof Error ? error.message : "Event operation is unavailable",
    );
  }

  /** 将初始行动位的全局回合零值归一为事件系统使用的首个有效回合编号。 */
  private getEventTurn(): number {
    return Math.max(1, this.#turn.globalTurn);
  }
}

/** 校验事件延迟结果是否为包含有效遭遇定义编号的战斗启动指令。 */
function isBattleStartInstruction(
  output: unknown,
): output is { readonly parameters: { readonly encounterDefinitionId: string } } {
  if (typeof output !== "object" || output === null || !("parameters" in output)) {
    return false;
  }

  const parameters = output.parameters;

  return (
    typeof parameters === "object" &&
    parameters !== null &&
    "encounterDefinitionId" in parameters &&
    typeof parameters.encounterDefinitionId === "string" &&
    parameters.encounterDefinitionId.length > 0
  );
}

/** 为拥有者生成完整角色、背包与手牌私有视图，绝不用于房间公共广播。 */
function createViewerSnapshot(
  player: PlayerSessionState,
  validationContext: GameSessionValidationContext,
  map: GameSessionState["world"]["map"],
  eventRuntime: EventRuntimeState | undefined,
  environment: GameSessionState["world"]["environment"],
) {
  const temporaryPickup = player.inventory.temporaryPickup;
  const equipmentDefinitions = Object.fromEntries(
    validationContext.equipmentDefinitions.map((definition) => [
      definition.definitionId,
      definition,
    ]),
  );
  const attributeSnapshot = createCharacterAttributeSnapshot(
    player.character,
    DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
    [
      ...createEquipmentAttributeModifiers(player.equipment, equipmentDefinitions),
      ...createStatusAttributeModifiers(
        player.statuses.instances,
        validationContext.statusDefinitions,
      ),
    ],
  );

  return Object.freeze({
    playerId: player.playerId,
    character: Object.freeze({
      level: player.character.levelProgression.currentLevel,
      experience: player.character.levelProgression.currentExperience,
      currentPrimaryAttributes: Object.freeze({ ...attributeSnapshot.currentPrimaryAttributes }),
      effectivePrimaryAttributes: Object.freeze({
        ...attributeSnapshot.effectivePrimaryAttributes,
      }),
      derivedAttributes: Object.freeze({ ...attributeSnapshot.derivedAttributes }),
      resources: Object.freeze(
        Object.fromEntries(
          Object.entries(player.resources.resources).map(([resourceId, value]) => [
            resourceId,
            Object.freeze({ ...value }),
          ]),
        ),
      ),
      statuses: Object.freeze(
        player.statuses.instances.map((instance) =>
          Object.freeze({
            instanceId: instance.instanceId,
            definitionId: instance.definitionId,
            currentStacks: instance.currentStacks,
            remainingTurns: instance.remainingTurns,
          }),
        ),
      ),
    }),
    inventory: Object.freeze({
      backpack: Object.freeze({
        level: player.inventory.backpack.level,
        entries: Object.freeze(
          player.inventory.backpack.entries.map((entry) =>
            Object.freeze({
              instanceId: entry.item.instanceId,
              definitionId: entry.item.definitionId,
              quantity: entry.item.quantity,
              position: Object.freeze({ ...entry.position }),
            }),
          ),
        ),
      }),
      temporaryPickup:
        temporaryPickup === null
          ? null
          : Object.freeze({
              instanceId: temporaryPickup.item.instanceId,
              definitionId: temporaryPickup.item.definitionId,
              quantity: temporaryPickup.item.quantity,
              sourceId: temporaryPickup.sourceId,
              remainingOwnerTurns: temporaryPickup.remainingOwnerTurns,
            }),
    }),
    handCardIds: Object.freeze([...player.hand.handCardIds]),
    map: createPrivateMapSnapshot(player, map),
    activeEvent: createPrivateActiveEventSnapshot(player, map, eventRuntime, environment),
  });
}

/** 将触发玩家尚未完成的最新事件转换为不泄露效果配置的私有界面数据。 */
function createPrivateActiveEventSnapshot(
  player: PlayerSessionState,
  map: GameSessionState["world"]["map"],
  eventRuntime: EventRuntimeState | undefined,
  environment: GameSessionState["world"]["environment"],
) {
  const instance = [...(eventRuntime?.instances ?? [])]
    .reverse()
    .find(
      (candidate) =>
        candidate.triggeringPlayerId === player.playerId &&
        (candidate.status === "PENDING_REVEAL" || candidate.status === "REVEALED"),
    );

  if (instance === undefined) {
    return null;
  }

  const definition = (EVENT_DEFINITION_CATALOG as EventDefinitionCatalog)[instance.eventId];

  if (definition === undefined) {
    throw new Error(`Missing event definition for active instance: ${instance.eventId}`);
  }

  const currentTile = map.getTileById(player.map.currentTileId);

  if (currentTile === undefined) {
    throw new Error(`Active event player tile does not exist: ${player.map.currentTileId}`);
  }

  const view = createEventView(
    instance,
    definition,
    player.playerId,
    createEventConditionContext(
      player,
      currentTile,
      environment,
      eventRuntime ?? createEventRuntimeState(),
      false,
    ),
  );

  if (view.status === "PENDING_REVEAL") {
    return Object.freeze({
      instanceId: view.instanceId,
      status: view.status,
      revealMode: view.revealMode,
      allowedRevealActions: Object.freeze([...view.allowedActions]),
      content: null,
    });
  }

  if (view.status !== "REVEALED") {
    return null;
  }

  return Object.freeze({
    instanceId: view.instanceId,
    status: view.status,
    revealMode: definition.revealMode,
    allowedRevealActions: Object.freeze([]),
    content: Object.freeze({
      eventId: view.content.eventId,
      name: view.content.name,
      description: view.content.description,
      category: view.content.category,
      rarity: view.content.rarity,
      options: Object.freeze(
        view.content.resolution.type === "CHOICE"
          ? view.content.resolution.options.map((option) => Object.freeze({ ...option }))
          : [],
      ),
    }),
  });
}

/** 将玩家已探索的地块投影为仅本人可读取的地图快照。 */
function createPrivateMapSnapshot(
  player: PlayerSessionState,
  map: GameSessionState["world"]["map"],
) {
  const exploredTileIds = new Set(player.map.exploration.exploredTileIds);

  return Object.freeze({
    tiles: Object.freeze(
      map.tiles
        .filter((tile) => exploredTileIds.has(tile.tileId))
        .sort((left, right) => left.tileId.localeCompare(right.tileId))
        .map((tile) =>
          Object.freeze({
            tileId: tile.tileId,
            coordinate: Object.freeze({ ...tile.coordinate }),
            elevation: tile.elevation,
            terrainDefinitionId: tile.terrainDefinitionId,
            regionDefinitionId: tile.regionDefinitionId,
            passability: tile.passability,
            featureTypes: Object.freeze(tile.features.map((feature) => feature.type)),
            featureReferenceIds: Object.freeze(tile.features.map((feature) => feature.referenceId)),
            isCurrentPlayerTile: tile.tileId === player.map.currentTileId,
          }),
        ),
    ),
  });
}

/** 根据首次探索地块的设施与区域确定应参与抽取的事件池。 */
function getExplorationEventPoolIds(
  featureIds: readonly string[],
  regionDefinitionId: string,
): readonly string[] {
  if (featureIds.includes("map-feature.ancient-ruins")) {
    return ["event-pool.ancient-ruins.exploration"];
  }

  if (regionDefinitionId === "region_000001") {
    return ["event-pool.wilderness.exploration"];
  }

  return [];
}

/** 从当前玩家、地块、环境和事件历史聚合事件条件所需的只读事实。 */
function createEventConditionContext(
  player: PlayerSessionState,
  tile: HexTile,
  environment: GameSessionState["world"]["environment"],
  eventRuntime: EventRuntimeState,
  isFirstVisit: boolean,
): EventConditionEvaluationContext {
  const itemQuantities = new Map<string, number>();

  for (const entry of player.inventory.backpack.entries) {
    itemQuantities.set(
      entry.item.definitionId,
      (itemQuantities.get(entry.item.definitionId) ?? 0) + entry.item.quantity,
    );
  }

  const equippedDefinitionIds = new Set<string>();

  for (const equipment of Object.values(player.equipment.slots)) {
    if (equipment !== null) {
      equippedDefinitionIds.add(equipment.definitionId);
    }
  }

  return {
    regionDefinitionId: tile.regionDefinitionId,
    terrainDefinitionId: tile.terrainDefinitionId,
    featureIds: new Set(tile.features.map((feature) => feature.featureId)),
    weatherId: environment.weather.activeWeathers[0]?.weatherId ?? null,
    periodId: getEnvironmentPublicView(environment).dayNight.periodId,
    player: {
      level: player.character.levelProgression.currentLevel,
      identityId: player.character.identityId,
      raceId: player.character.raceId,
      // 信仰系统尚未写入角色运行时状态；使用空标识保证相关条件在接入前不会误命中。
      faithId: "",
      isInBattle: false,
      itemQuantities,
      equippedDefinitionIds,
      resourceValues: new Map(
        Object.entries(player.resources.resources).map(([resourceId, resource]) => [
          resourceId,
          resource.current,
        ]),
      ),
    },
    questStages: new Map(),
    dungeonId: null,
    worldStateIds: new Set(),
    revealedEventIds: new Set(
      eventRuntime.instances
        .filter((instance) => "revealedAtTurn" in instance)
        .map((instance) => instance.eventId),
    ),
    isFirstVisit,
  };
}

/** 将背包物品转换为不包含物品身份和数量的公开二维遮罩。 */
function createBackpackMaskSnapshot(
  player: PlayerSessionState,
  itemDefinitions: ItemDefinitionCatalog,
) {
  if (player.inventory === undefined) {
    return Object.freeze({ level: 1, occupiedCells: Object.freeze([]) });
  }

  const occupiedCells: { readonly x: number; readonly y: number }[] = [];

  for (const entry of player.inventory.backpack.entries) {
    const definition = itemDefinitions[entry.item.definitionId];

    if (definition === undefined) {
      continue;
    }

    for (let yOffset = 0; yOffset < definition.height; yOffset += 1) {
      for (let xOffset = 0; xOffset < definition.width; xOffset += 1) {
        occupiedCells.push(
          Object.freeze({
            x: entry.position.x + xOffset,
            y: entry.position.y + yOffset,
          }),
        );
      }
    }
  }

  return Object.freeze({
    level: player.inventory.backpack.level,
    occupiedCells: Object.freeze(occupiedCells),
  });
}

/**
 * 方法名：resolveDefaultMovementPoints
 * 作用：使用当前基础属性公式计算新回合的默认移动力，为未来完整属性聚合服务保留替换入口。
 * @param player 需要读取移动力的玩家完整运行时状态。
 * @returns 不小于零的整数移动力；不完整测试壳状态返回零。
 */
function resolveDefaultMovementPoints(
  player: PlayerSessionState,
  validationContext: GameSessionValidationContext,
): number {
  if (player.character.currentPrimaryAttributes === undefined) {
    return 0;
  }

  const equipmentDefinitions = Object.fromEntries(
    validationContext.equipmentDefinitions.map((definition) => [
      definition.definitionId,
      definition,
    ]),
  );
  const modifiers = [
    ...createEquipmentAttributeModifiers(player.equipment, equipmentDefinitions),
    ...createStatusAttributeModifiers(
      player.statuses.instances,
      validationContext.statusDefinitions,
    ),
  ];

  return createCharacterAttributeSnapshot(
    player.character,
    DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
    modifiers,
  ).derivedAttributes.movementRange;
}
