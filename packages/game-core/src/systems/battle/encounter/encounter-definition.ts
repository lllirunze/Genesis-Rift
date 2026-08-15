/** 描述由事件创建的敌对遭遇静态战斗数据。 */
export interface EncounterDefinition {
  readonly encounterDefinitionId: string;
  readonly name: string;
  readonly maximumHealth: number;
  readonly physicalAttack: number;
  readonly physicalDefense: number;
  readonly evasionRate: number;
}

/** 通过遭遇定义编号索引静态敌对单位配置。 */
export type EncounterDefinitionCatalog = Readonly<Record<string, EncounterDefinition>>;

/** 校验遭遇静态战斗数据的编号和非负整数数值。 */
export function validateEncounterDefinitionCatalog(catalog: EncounterDefinitionCatalog): void {
  for (const [encounterDefinitionId, definition] of Object.entries(catalog)) {
    if (
      definition.encounterDefinitionId !== encounterDefinitionId ||
      encounterDefinitionId.length === 0
    ) {
      throw new Error(`Invalid encounter definition id: ${encounterDefinitionId}`);
    }

    if (definition.name.trim().length === 0 || definition.maximumHealth <= 0) {
      throw new RangeError(`Invalid encounter definition: ${encounterDefinitionId}`);
    }

    for (const value of [
      definition.maximumHealth,
      definition.physicalAttack,
      definition.physicalDefense,
      definition.evasionRate,
    ]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(
          `Encounter values must be non-negative safe integers: ${encounterDefinitionId}`,
        );
      }
    }
  }
}
