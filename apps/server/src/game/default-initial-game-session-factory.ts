import { randomUUID } from "node:crypto";

import {
  calculateDerivedAttributes,
  createCharacter,
  createCharacterResourceState,
  createCharacterStatusState,
  createActiveCharacterSurvivalState,
  createBattleSettlementLedger,
  createEmptyEquipmentLoadout,
  createEnvironmentRuntimeState,
  createGameSessionState,
  createHexTile,
  createPlayerExplorationState,
  createPlayerHandState,
  createPlayerInventory,
  createWeatherDeck,
  createWeatherRuntimeState,
  dealInitialHandCards,
  generateBaseMapCoordinates,
  HexMap,
  initializeSharedHandCardDeck,
  RandomManager,
  type GameSessionValidationContext,
  type PlayerSessionState,
} from "@genesis-rift/game-core";
import {
  CHARACTER_RESOURCE_DEFINITIONS,
  DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
  EQUIPMENT_DEFINITION_CATALOG,
  HAND_CARD_CATALOG,
  IDENTITY_CONFIGS,
  MAP_CONTENT_DEFINITION_CATALOG,
  RACE_CONFIGS,
  STATUS_DEFINITION_CATALOG,
  WEATHER_DEFINITION_CATALOG,
  WEATHER_DISASTER_DEFINITION_CATALOG,
} from "@genesis-rift/game-data";
import type { GameId, LanCharacterSelection, PlayerId, TileId } from "@genesis-rift/shared";

import { generateMasterSeed } from "../random/generate-master-seed.ts";
import type { InitialGameSessionFactory } from "./start-game-service.ts";

/** 根据正式静态资源创建并校验完整游戏会话时使用的定义集合。 */
const VALIDATION_CONTEXT: GameSessionValidationContext<"health", "maxHealth"> = {
  characterResourceDefinitions: CHARACTER_RESOURCE_DEFINITIONS,
  itemDefinitions: {},
  equipmentDefinitions: Object.values(EQUIPMENT_DEFINITION_CATALOG),
  handCardCatalog: HAND_CARD_CATALOG,
  statusDefinitions: STATUS_DEFINITION_CATALOG,
  weatherDefinitions: WEATHER_DEFINITION_CATALOG,
  weatherDisasterDefinitions: WEATHER_DISASTER_DEFINITION_CATALOG,
};

/** 使用当前正式资源创建单局游戏所需地图、世界、角色与初始手牌。 */
export class DefaultInitialGameSessionFactory implements InitialGameSessionFactory<
  "health",
  "maxHealth"
> {
  /**
   * 方法名：create
   * 作用：从锁定的大厅成员创建完整权威会话，并为每人发放两张初始手牌。
   * @param input 当前房间标识与已锁定成员。
   * @returns 可直接交由服务端游戏会话管理器接管的状态及校验上下文。
   */
  create(input: {
    readonly roomId: string;
    readonly players: readonly {
      readonly playerId: PlayerId;
      readonly displayName: string;
      readonly characterSelection: LanCharacterSelection | null;
    }[];
  }) {
    if (input.players.length === 0) {
      throw new Error("Cannot initialize a game without players");
    }

    const random = RandomManager.create(generateMasterSeed());
    const map = createDefaultMap();
    const playerStates = createPlayerStates(input.players, map, random);
    const initialDeck = initializeSharedHandCardDeck(
      `deck:${input.roomId}`,
      Object.values(HAND_CARD_CATALOG).map((card) => card.cardId),
      HAND_CARD_CATALOG,
      random.getStream("deck"),
    );
    const dealtHands = dealInitialHandCards(
      initialDeck,
      playerStates.map((player) => player.hand),
      HAND_CARD_CATALOG,
    );
    const players = playerStates.map((player, index) => ({
      ...player,
      hand: dealtHands.playerHandStates[index]!,
    }));

    return {
      state: createGameSessionState(
        {
          gameId: `game:${randomUUID()}` as GameId,
          players,
          world: {
            map,
            handCardDeck: dealtHands.deckState,
            environment: createEnvironmentRuntimeState(
              createWeatherDeck(random.getStream("weather")),
              createWeatherRuntimeState(),
            ),
            battleSettlementLedger: createBattleSettlementLedger(),
          },
          random: random.exportState(),
        },
        VALIDATION_CONTEXT,
      ),
      validationContext: VALIDATION_CONTEXT,
    };
  }
}

/** 创建当前 V1 默认的全平原野外地图，后续地图配置加载器可替换此实现。 */
function createDefaultMap(): HexMap {
  const tiles = generateBaseMapCoordinates().map((coordinate, index) =>
    createHexTile(
      {
        tileId: `tile:${index}` as TileId,
        coordinate,
        elevation: 0,
        terrainDefinitionId: "terrain_000001",
        regionDefinitionId: "region_000001",
        passability: "passable",
      },
      MAP_CONTENT_DEFINITION_CATALOG,
    ),
  );

  return HexMap.create(tiles, MAP_CONTENT_DEFINITION_CATALOG);
}

/** 按地图随机流从外围环为每名玩家分配不同的初始出生点。 */
function createPlayerStates(
  players: readonly {
    readonly playerId: PlayerId;
    readonly displayName: string;
    readonly characterSelection: LanCharacterSelection | null;
  }[],
  map: HexMap,
  random: RandomManager,
): readonly PlayerSessionState<"health">[] {
  const spawnTiles = random
    .getStream("map")
    .shuffle(map.tiles.filter((tile) => tile.ring >= 8 && tile.ring <= 10));

  if (spawnTiles.length < players.length) {
    throw new Error("Not enough outer-ring spawn tiles for every player");
  }

  return players.map((player, index) => {
    const selection = getRequiredCharacterSelection(player);
    const character = createCharacter({
      playerId: player.playerId,
      gender: selection.gender,
      identity: getIdentityConfig(selection),
      race: getRaceConfig(selection),
    });
    const derivedAttributes = calculateDerivedAttributes({
      currentPrimaryAttributes: character.currentPrimaryAttributes,
      configs: { maxHealth: DERIVED_ATTRIBUTE_FORMULA_CONFIGS.maxHealth },
    });
    const spawnTile = spawnTiles[index]!;

    return {
      playerId: player.playerId,
      character,
      resources: createCharacterResourceState(
        player.playerId,
        CHARACTER_RESOURCE_DEFINITIONS,
        derivedAttributes,
      ),
      statuses: createCharacterStatusState(player.playerId),
      inventory: createPlayerInventory(player.playerId),
      equipment: createEmptyEquipmentLoadout(player.playerId),
      hand: createPlayerHandState(player.playerId),
      map: {
        currentTileId: spawnTile.tileId,
        exploration: createPlayerExplorationState(player.playerId, spawnTile.tileId, map),
      },
      battle: {
        survival: createActiveCharacterSurvivalState(player.playerId),
        currentShield: 0,
      },
    };
  });
}

/** 读取已在大厅锁定前完成校验的角色选择，拒绝任何不完整初始化请求。 */
function getRequiredCharacterSelection(player: {
  readonly playerId: PlayerId;
  readonly characterSelection: LanCharacterSelection | null;
}): LanCharacterSelection {
  if (player.characterSelection === null) {
    throw new Error(`Character selection is missing for player: ${player.playerId}`);
  }

  return player.characterSelection;
}

/** 从静态职业配置中读取已由大厅服务验证的职业。 */
function getIdentityConfig(selection: LanCharacterSelection) {
  const identity = IDENTITY_CONFIGS[selection.identityName as keyof typeof IDENTITY_CONFIGS];

  if (identity === undefined) {
    throw new Error(`Unknown identity selection: ${selection.identityName}`);
  }

  return identity;
}

/** 从静态种族配置中读取已由大厅服务验证的种族。 */
function getRaceConfig(selection: LanCharacterSelection) {
  const race = RACE_CONFIGS[selection.raceName as keyof typeof RACE_CONFIGS];

  if (race === undefined) {
    throw new Error(`Unknown race selection: ${selection.raceName}`);
  }

  return race;
}
