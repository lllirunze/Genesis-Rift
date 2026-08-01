import { MASTER_SEED_HEX_LENGTH, RANDOM_STREAM_SEED_HEX_LENGTH } from "./random-config.ts";

declare const masterSeedBrand: unique symbol;
declare const randomStreamSeedBrand: unique symbol;

export type MasterSeed = string & { readonly [masterSeedBrand]: "MasterSeed" };
export type RandomStreamSeed = string & {
  readonly [randomStreamSeedBrand]: "RandomStreamSeed";
};

export function createMasterSeed(value: string): MasterSeed {
  return normalizeHexSeed(value, MASTER_SEED_HEX_LENGTH, "master seed") as MasterSeed;
}

export function createRandomStreamSeed(value: string): RandomStreamSeed {
  return normalizeHexSeed(
    value,
    RANDOM_STREAM_SEED_HEX_LENGTH,
    "random stream seed",
  ) as RandomStreamSeed;
}

function normalizeHexSeed(value: string, length: number, field: string): string {
  if (value.length !== length || !/^[0-9a-fA-F]+$/.test(value)) {
    throw new TypeError(`${field} must be exactly ${length} hexadecimal characters`);
  }

  return value.toLowerCase();
}
