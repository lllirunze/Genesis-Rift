import type { SkillDefinition, SkillDefinitionCatalog } from "./skill-definition.ts";

/** 描述单项已掌握技能在运行时保存的冷却与回合使用次数。 */
export interface SkillRuntimeEntry {
  readonly definitionId: string;
  readonly remainingCooldownTurns: number;
  readonly usesThisTurn: number;
  readonly totalUses: number;
}

/** 描述角色已经掌握的技能及其运行时限制状态。 */
export interface CharacterSkillState {
  readonly ownerId: string;
  readonly entries: Readonly<Record<string, SkillRuntimeEntry>>;
}

/**
 * 方法名：createCharacterSkillState
 * 作用：根据角色已掌握的技能标识创建初始运行时状态。
 * @param ownerId 技能所属角色或玩家标识。
 * @param skillDefinitionIds 已掌握的技能定义标识。
 * @param definitions 技能定义注册表。
 * @returns 可供技能资格和结算流程使用的初始状态。
 * @throws 所属者、技能标识重复或技能定义不存在时抛出错误。
 */
export function createCharacterSkillState(
  ownerId: string,
  skillDefinitionIds: readonly string[],
  definitions: SkillDefinitionCatalog,
): CharacterSkillState {
  assertNonEmptyString(ownerId, "ownerId");
  const entries: Record<string, SkillRuntimeEntry> = {};

  for (const definitionId of skillDefinitionIds) {
    if (entries[definitionId] !== undefined) {
      throw new Error(`Duplicate learned skill: ${definitionId}`);
    }

    getSkillDefinition(definitions, definitionId);
    entries[definitionId] = createSkillRuntimeEntry(definitionId);
  }

  return { ownerId, entries };
}

/**
 * 方法名：getSkillRuntimeEntry
 * 作用：读取角色已掌握技能的运行时冷却与使用状态。
 * @param state 角色当前技能状态。
 * @param definitionId 需要读取的技能定义标识。
 * @returns 对应技能的运行时状态。
 * @throws 技能未被角色掌握时抛出错误。
 */
export function getSkillRuntimeEntry(
  state: CharacterSkillState,
  definitionId: string,
): SkillRuntimeEntry {
  const entry = state.entries[definitionId];

  if (entry === undefined) {
    throw new Error(`Character has not learned skill: ${definitionId}`);
  }

  return entry;
}

/**
 * 方法名：commitSkillUse
 * 作用：在技能效果执行前记录本回合使用次数并进入配置指定的冷却时间。
 * @param state 角色当前技能状态。
 * @param definition 已通过资格检查的技能定义。
 * @returns 更新后的角色技能状态和本次使用后的技能条目。
 * @throws 技能未掌握、冷却未结束或本回合次数耗尽时抛出错误。
 */
export function commitSkillUse(
  state: CharacterSkillState,
  definition: SkillDefinition,
): { readonly state: CharacterSkillState; readonly entry: SkillRuntimeEntry } {
  const previous = getSkillRuntimeEntry(state, definition.definitionId);

  if (previous.remainingCooldownTurns > 0) {
    throw new Error(`Skill is on cooldown: ${definition.definitionId}`);
  }

  if (previous.usesThisTurn >= definition.maxUsesPerTurn) {
    throw new Error(`Skill usage limit reached: ${definition.definitionId}`);
  }

  const entry: SkillRuntimeEntry = {
    ...previous,
    remainingCooldownTurns: definition.cooldownTurns,
    usesThisTurn: previous.usesThisTurn + 1,
    totalUses: previous.totalUses + 1,
  };

  return {
    state: {
      ...state,
      entries: { ...state.entries, [definition.definitionId]: entry },
    },
    entry,
  };
}

/**
 * 方法名：advanceCharacterSkillStateAtTurnEnd
 * 作用：在角色自身回合结束时递减冷却并重置本回合技能使用次数。
 * @param state 角色当前技能状态。
 * @returns 已完成回合末更新的新技能状态。
 */
export function advanceCharacterSkillStateAtTurnEnd(
  state: CharacterSkillState,
): CharacterSkillState {
  const entries: Record<string, SkillRuntimeEntry> = {};

  for (const [definitionId, entry] of Object.entries(state.entries)) {
    entries[definitionId] = {
      ...entry,
      remainingCooldownTurns: Math.max(0, entry.remainingCooldownTurns - 1),
      usesThisTurn: 0,
    };
  }

  return { ...state, entries };
}

/**
 * 方法名：validateCharacterSkillState
 * 作用：校验角色技能状态只引用已存在定义且运行时计数保持非负。
 * @param state 需要校验的角色技能状态。
 * @param definitions 技能定义注册表。
 * @returns 无返回值。
 * @throws 所属者、条目键或运行时计数不合法时抛出错误。
 */
export function validateCharacterSkillState(
  state: CharacterSkillState,
  definitions: SkillDefinitionCatalog,
): void {
  assertNonEmptyString(state.ownerId, "ownerId");

  for (const [definitionId, entry] of Object.entries(state.entries)) {
    getSkillDefinition(definitions, definitionId);

    if (entry.definitionId !== definitionId) {
      throw new Error(`Skill runtime entry key does not match definition id: ${definitionId}`);
    }

    assertNonNegativeSafeInteger(entry.remainingCooldownTurns, "remainingCooldownTurns");
    assertNonNegativeSafeInteger(entry.usesThisTurn, "usesThisTurn");
    assertNonNegativeSafeInteger(entry.totalUses, "totalUses");
  }
}

/**
 * 方法名：createSkillRuntimeEntry
 * 作用：为一个新掌握的技能建立零冷却、零使用次数的运行时条目。
 * @param definitionId 技能定义标识。
 * @returns 新建的技能运行时条目。
 */
function createSkillRuntimeEntry(definitionId: string): SkillRuntimeEntry {
  return {
    definitionId,
    remainingCooldownTurns: 0,
    usesThisTurn: 0,
    totalUses: 0,
  };
}

/**
 * 方法名：getSkillDefinition
 * 作用：从注册表读取已存在的技能定义。
 * @param definitions 技能定义注册表。
 * @param definitionId 技能定义标识。
 * @returns 已注册的技能定义。
 * @throws 技能定义不存在时抛出错误。
 */
function getSkillDefinition(
  definitions: SkillDefinitionCatalog,
  definitionId: string,
): SkillDefinition {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Skill definition not found: ${definitionId}`);
  }

  return definition;
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入为包含有效内容的字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空白时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入为非负安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值为负数、小数或超出安全整数范围时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
