import type { PlayerId } from "@genesis-rift/shared";

/** 描述当前模块对外公开的业务数据契约。 */
export interface EquipmentInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity: 1;
  readonly stackCompatibilityKey: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateEquipmentInstanceInput {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity?: 1;
  readonly stackCompatibilityKey?: string;
}

/**
 * 方法名：createEquipmentInstance
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function createEquipmentInstance(input: CreateEquipmentInstanceInput): EquipmentInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.definitionId, "definitionId");
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";
  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    ownerPlayerId: input.ownerPlayerId,
    quantity: 1,
    stackCompatibilityKey,
  };
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
