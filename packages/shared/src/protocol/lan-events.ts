import type { PlayerId, RoomId, TileId } from "../types/ids.ts";

/** 描述平顶六边形地图按照正北顺时针排列的六个移动方向。 */
export type LanHexDirection =
  "NORTH" | "NORTH_EAST_60" | "SOUTH_EAST_60" | "SOUTH" | "SOUTH_WEST_60" | "NORTH_WEST_60";

/** 描述角色立绘与展示层使用的性别分类。 */
export type CharacterGender = "female" | "male";

/** 描述大厅阶段由玩家自主确定的角色创建选择。 */
export interface LanCharacterSelection {
  readonly gender: CharacterGender;
  readonly identityName: string;
  readonly raceName: string;
}

/** 服务端完成启动后向客户端公布的协议元数据。 */
export interface ServerReadyPayload {
  protocolVersion: number;
}

/** 描述可在房间大厅展示的玩家公开信息。 */
export interface LanRoomPlayerSnapshot {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly characterSelection: LanCharacterSelection | null;
}

/** 描述服务端权威维护的房间大厅快照。 */
export interface LanRoomSnapshot {
  readonly roomId: RoomId;
  readonly hostPlayerId: PlayerId;
  readonly status: "lobby" | "running" | "closed";
  readonly revision: number;
  readonly players: readonly LanRoomPlayerSnapshot[];
}

/** 描述客户端创建局域网房间的请求。 */
export interface CreateLanRoomRequest {
  readonly requestId: string;
  readonly roomId: RoomId;
  readonly host: LanRoomPlayerSnapshot;
}

/** 描述客户端加入现有局域网房间的请求。 */
export interface JoinLanRoomRequest {
  readonly requestId: string;
  readonly player: LanRoomPlayerSnapshot;
}

/** 描述客户端主动获取当前房间快照的请求。 */
export interface RequestLanRoomSnapshot {
  readonly requestId: string;
}

/** 描述已加入房间的玩家更新自己角色创建选择的请求。 */
export interface UpdateLanCharacterSelectionRequest {
  readonly requestId: string;
  readonly selection: LanCharacterSelection;
}

/** 描述客户端请求读取当前游戏公开快照的输入。 */
export interface RequestGameSnapshot {
  readonly requestId: string;
}

/** 描述房主请求将大厅锁定并开始当前唯一对局的输入。 */
export interface StartLanGameRequest {
  readonly requestId: string;
}

/** 描述所有客户端游戏命令共有的请求与幂等标识。 */
interface SubmitGameCommandRequestBase {
  readonly requestId: string;
  readonly commandId: string;
}

/** 描述客户端结束当前行动回合的权威命令。 */
export interface EndTurnGameCommandRequest extends SubmitGameCommandRequestBase {
  readonly type: "turn.end";
}

/** 描述客户端请求向一个相邻六边形方向普通移动的权威命令。 */
export interface MoveGameCommandRequest extends SubmitGameCommandRequestBase {
  readonly type: "map.move";
  readonly direction: LanHexDirection;
}

/** 描述客户端请求当前行动角色对另一名玩家发起普通攻击的权威命令。 */
export interface AttackGameCommandRequest extends SubmitGameCommandRequestBase {
  readonly type: "battle.attack";
  readonly targetPlayerId: PlayerId;
}

/** 描述客户端请求为已准备灵魂执行一次 D20 轮回判定的权威命令。 */
export interface AttemptReincarnationGameCommandRequest extends SubmitGameCommandRequestBase {
  readonly type: "revival.attemptReincarnation";
}

/** 描述客户端可以提交的首批权威游戏命令。 */
export type SubmitGameCommandRequest =
  | EndTurnGameCommandRequest
  | MoveGameCommandRequest
  | AttackGameCommandRequest
  | AttemptReincarnationGameCommandRequest;

/** 描述公开游戏快照中的全局回合位置。 */
export interface LanGameTurnSnapshot {
  readonly globalTurn: number;
  readonly round: number;
  readonly activePlayerId: PlayerId | null;
  readonly phase: string;
  readonly remainingMovementPoints: number;
}

/** 描述可安全广播给全体玩家的昼夜、天气与灾害环境摘要。 */
export interface LanGameEnvironmentSnapshot {
  readonly currentRound: number;
  readonly dayNight: {
    readonly periodId: string;
    readonly elapsedRounds: number;
    readonly remainingRounds: number;
    readonly visionModifier: number;
  };
  readonly activeWeatherIds: readonly string[];
  readonly activeDisaster: { readonly weatherId: string; readonly phase: string } | null;
}

/** 描述其他玩家可见的断线恢复期限信息。 */
export interface LanDisconnectedPlayerSnapshot {
  readonly playerId: PlayerId;
  readonly expiresAfterGlobalTurn: number;
}

/** 描述可安全公开给房间成员的角色位置与身份摘要。 */
export interface LanGamePlayerSnapshot {
  readonly playerId: PlayerId;
  readonly gender: CharacterGender | null;
  readonly identityId: string;
  readonly raceId: string;
  readonly currentTileId: TileId;
  readonly survivalStatus: string | null;
  readonly currentHealth: number | null;
  readonly maximumHealth: number | null;
  readonly currentShield: number;
  readonly equipment: LanGameEquipmentSnapshot;
  readonly backpack: LanGameBackpackMaskSnapshot;
}

/** 描述可公开查看的装备栏位，仅保留穿戴装备的静态定义编号。 */
export interface LanGameEquipmentSnapshot {
  readonly weapon: string | null;
  readonly armor: string | null;
  readonly shoes: string | null;
  readonly accessory1: string | null;
  readonly accessory2: string | null;
  readonly special: string | null;
}

/** 描述其他玩家背包中被遮罩的物品占格范围。 */
export interface LanGameBackpackMaskSnapshot {
  readonly level: number;
  readonly occupiedCells: readonly { readonly x: number; readonly y: number }[];
}

/** 描述仅允许当前查看者读取的完整背包物品信息。 */
export interface LanGamePrivateInventorySnapshot {
  readonly backpack: {
    readonly level: number;
    readonly entries: readonly {
      readonly instanceId: string;
      readonly definitionId: string;
      readonly quantity: number;
      readonly position: { readonly x: number; readonly y: number };
    }[];
  };
  readonly temporaryPickup: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly quantity: number;
    readonly sourceId: string;
    readonly remainingOwnerTurns: number;
  } | null;
}

/** 描述仅允许当前查看者读取的手牌、背包等私有运行时信息。 */
export interface LanGameViewerSnapshot {
  readonly playerId: PlayerId;
  readonly inventory: LanGamePrivateInventorySnapshot;
  readonly handCardIds: readonly string[];
}

/** 描述可安全广播给整个房间的游戏权威状态摘要。 */
export interface LanGameSessionSnapshot {
  readonly gameId: string;
  readonly status: "lobby" | "running" | "finished";
  readonly revision: number;
  readonly turn: LanGameTurnSnapshot;
  readonly environment: LanGameEnvironmentSnapshot | null;
  readonly playerOrder: readonly PlayerId[];
  readonly players: readonly LanGamePlayerSnapshot[];
  readonly disconnectedPlayers: readonly LanDisconnectedPlayerSnapshot[];
  readonly viewer: LanGameViewerSnapshot | null;
}

/** 描述可安全广播给房间成员的一次普通攻击结算结果。 */
export interface LanBattleAttackResolvedEvent {
  readonly type: "battle.attackResolved";
  readonly gameId: string;
  readonly attackId: string;
  readonly attackerId: PlayerId;
  readonly defenderId: PlayerId;
  readonly outcome: "RESOLVED" | "EVADED";
  readonly finalDamage: number;
  readonly defenderHealth: number;
  readonly defenderShield: number;
  readonly defenderSurvivalStatus: string;
}

/** 描述角色在击倒倒计时或死亡后发生的公开生存状态变化。 */
export interface LanPlayerSurvivalChangedEvent {
  readonly type: "player.survivalChanged";
  readonly gameId: string;
  readonly playerId: PlayerId;
  readonly status: string;
  readonly downedTurnsRemaining: number;
}

/** 描述灵魂轮回判定的公开结果，成功时包含重新进入地图的安全位置。 */
export interface LanPlayerReincarnationResolvedEvent {
  readonly type: "player.reincarnationResolved";
  readonly gameId: string;
  readonly playerId: PlayerId;
  readonly outcome: "FAILED" | "SUCCEEDED";
  readonly rolls: readonly number[];
  readonly spawnTileId: TileId | null;
  readonly protectionTurns: number;
}

/** 描述当前阶段可公开广播的游戏领域事件。 */
export type LanGameEvent =
  | LanBattleAttackResolvedEvent
  | LanPlayerSurvivalChangedEvent
  | LanPlayerReincarnationResolvedEvent;

/** 描述服务端拒绝一项局域网请求时返回的稳定信息。 */
export interface LanRequestRejectedPayload {
  readonly requestId: string;
  readonly code:
    | "ROOM_NOT_FOUND"
    | "ROOM_ALREADY_EXISTS"
    | "PLAYER_ALREADY_JOINED"
    | "ROOM_NOT_JOINABLE"
    | "NOT_ROOM_HOST"
    | "CHARACTER_SELECTION_INVALID"
    | "CHARACTER_SELECTION_INCOMPLETE"
    | "SOCKET_IDENTITY_MISMATCH"
    | "NOT_JOINED"
    | "GAME_NOT_INITIALIZED"
    | "GAME_NOT_RUNNING"
    | "PLAYER_NOT_IN_GAME"
    | "NOT_ACTIVE_PLAYER"
    | "PLAYER_DISCONNECTED"
    | "PLAYER_NOT_DISCONNECTED"
    | "MOVE_NOT_AVAILABLE"
    | "ATTACK_NOT_AVAILABLE"
    | "REINCARNATION_NOT_AVAILABLE"
    | "REQUEST_INVALID";
  readonly message: string;
}

/** 客户端可以主动发送给服务端的事件契约。 */
export interface ClientToServerEvents {
  "client:hello": (payload: { protocolVersion: number }) => void;
  "room:create": (payload: CreateLanRoomRequest) => void;
  "room:join": (payload: JoinLanRoomRequest) => void;
  "room:requestSnapshot": (payload: RequestLanRoomSnapshot) => void;
  "room:updateCharacterSelection": (payload: UpdateLanCharacterSelectionRequest) => void;
  "game:start": (payload: StartLanGameRequest) => void;
  "game:requestSnapshot": (payload: RequestGameSnapshot) => void;
  "game:command": (payload: SubmitGameCommandRequest) => void;
}

/** 服务端可以主动发送给客户端的事件契约。 */
export interface ServerToClientEvents {
  "server:ready": (payload: ServerReadyPayload) => void;
  "room:created": (payload: { readonly requestId: string; readonly room: LanRoomSnapshot }) => void;
  "room:joined": (payload: { readonly requestId: string; readonly room: LanRoomSnapshot }) => void;
  "room:snapshot": (payload: {
    readonly requestId: string;
    readonly room: LanRoomSnapshot;
  }) => void;
  "room:rejected": (payload: LanRequestRejectedPayload) => void;
  "game:snapshot": (payload: {
    readonly requestId: string;
    readonly game: LanGameSessionSnapshot;
  }) => void;
  "game:commandAccepted": (payload: {
    readonly requestId: string;
    readonly commandId: string;
    readonly game: LanGameSessionSnapshot;
  }) => void;
  "game:event": (payload: { readonly event: LanGameEvent }) => void;
  "game:rejected": (payload: LanRequestRejectedPayload) => void;
  "game:started": (payload: {
    readonly requestId: string;
    readonly game: LanGameSessionSnapshot;
  }) => void;
}

/** 服务端多实例之间的事件契约，当前版本暂未启用。 */
export interface InterServerEvents {}

/** 绑定在单个网络连接上的服务端会话数据。 */
export interface ServerSocketData {
  playerId?: PlayerId;
  roomId?: RoomId;
}
