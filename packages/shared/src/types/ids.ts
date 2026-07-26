declare const brand: unique symbol;

type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

export type GameId = Brand<string, "GameId">;
export type PlayerId = Brand<string, "PlayerId">;
export type TileId = Brand<string, "TileId">;
export type ConfigId = Brand<string, "ConfigId">;
