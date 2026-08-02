import type { MasterSeed, RandomStreamSeed } from "./random-seed.ts";
import { createRandomStreamSeed } from "./random-seed.ts";
import { RANDOM_ALGORITHM_ID } from "./random-config.ts";
import type { RandomStreamType } from "./random-stream-type.ts";

const UINT64_MASK = 0xffff_ffff_ffff_ffffn;
const FNV_OFFSET_BASIS_64 = 0xcbf2_9ce4_8422_2325n;
const FNV_PRIME_64 = 0x0000_0100_0000_01b3n;

/** 描述当前模块对外公开的业务数据契约。 */
export interface DeriveRandomStreamSeedInput {
  readonly masterSeed: MasterSeed;
  readonly streamType: RandomStreamType;
  readonly scopeId?: string | null;
}

/**
 * 方法名：deriveRandomStreamSeed
 * 作用：根据输入执行确定性计算并返回结果。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function deriveRandomStreamSeed(input: DeriveRandomStreamSeedInput): RandomStreamSeed {
  const scopeId = input.scopeId ?? "";

  if (input.scopeId !== undefined && input.scopeId !== null && scopeId.length === 0) {
    throw new TypeError("scopeId must not be empty");
  }

  const derivationInput = serializeComponents([
    input.masterSeed,
    RANDOM_ALGORITHM_ID,
    input.streamType,
    scopeId,
  ]);
  const hash = fnv1a64(derivationInput);

  return createRandomStreamSeed(hash.toString(16).padStart(16, "0"));
}

/**
 * 方法名：serializeComponents
 * 作用：将输入转换为稳定、可保存或可传输的表示。
 * @param components 方法所需的 components 参数。
 * @returns 本次处理得到的结果。
 */
function serializeComponents(components: readonly string[]): string {
  return components.map((component) => `${component.length}:${component}`).join("|");
}

/**
 * 方法名：fnv1a64
 * 作用：执行该方法负责的单一业务操作。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
function fnv1a64(value: string): bigint {
  let hash = FNV_OFFSET_BASIS_64;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    hash ^= BigInt(codeUnit & 0xff);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
    hash ^= BigInt(codeUnit >>> 8);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
  }

  return hash;
}
