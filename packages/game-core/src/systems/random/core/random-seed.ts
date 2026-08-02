import { MASTER_SEED_HEX_LENGTH, RANDOM_STREAM_SEED_HEX_LENGTH } from "./random-config.ts";

declare const masterSeedBrand: unique symbol;
declare const randomStreamSeedBrand: unique symbol;

/** 描述当前模块对外公开的业务数据契约。 */
export type MasterSeed = string & { readonly [masterSeedBrand]: "MasterSeed" };
/** 描述当前模块对外公开的业务数据契约。 */
export type RandomStreamSeed = string & {
  readonly [randomStreamSeedBrand]: "RandomStreamSeed";
};

/**
 * 方法名：createMasterSeed
 * 作用：创建并校验该方法所负责的业务对象。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function createMasterSeed(value: string): MasterSeed {
  return normalizeHexSeed(value, MASTER_SEED_HEX_LENGTH, "master seed") as MasterSeed;
}

/**
 * 方法名：createRandomStreamSeed
 * 作用：创建并校验该方法所负责的业务对象。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function createRandomStreamSeed(value: string): RandomStreamSeed {
  return normalizeHexSeed(
    value,
    RANDOM_STREAM_SEED_HEX_LENGTH,
    "random stream seed",
  ) as RandomStreamSeed;
}

/**
 * 方法名：normalizeHexSeed
 * 作用：执行该方法负责的单一业务操作。
 * @param value 待处理的值。
 * @param length 方法所需的 length 参数。
 * @param field 方法所需的 field 参数。
 * @returns 本次处理得到的结果。
 */
function normalizeHexSeed(value: string, length: number, field: string): string {
  if (value.length !== length || !/^[0-9a-fA-F]+$/.test(value)) {
    throw new TypeError(`${field} must be exactly ${length} hexadecimal characters`);
  }

  return value.toLowerCase();
}
