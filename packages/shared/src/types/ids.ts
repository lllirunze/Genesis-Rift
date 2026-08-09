declare const brand: unique symbol;

/** 为基础类型附加仅在编译期生效的语义品牌。 */
type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

/** 游戏对局的唯一标识。 */
export type GameId = Brand<string, "GameId">;
/** 局域网房间的唯一标识。 */
export type RoomId = Brand<string, "RoomId">;
/** 玩家在对局中的唯一标识。 */
export type PlayerId = Brand<string, "PlayerId">;
/** 地图地块的唯一标识。 */
export type TileId = Brand<string, "TileId">;
/** 数据配置项的唯一标识。 */
export type ConfigId = Brand<string, "ConfigId">;
