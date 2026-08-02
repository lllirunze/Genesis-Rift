/** 单个等级对应的升级成本与成长收益配置。 */
export interface LevelDefinition {
  readonly level: number;
  readonly experienceRequired: number;
  readonly freePrimaryAttributePoints: number;
}

/** 一局游戏采用的完整等级范围与逐级配置。 */
export interface LevelSystemConfig {
  readonly initialLevel: number;
  readonly maximumLevel: number;
  readonly levels: readonly LevelDefinition[];
}
