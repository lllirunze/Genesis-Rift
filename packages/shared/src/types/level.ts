export interface LevelDefinition {
  readonly level: number;
  readonly experienceRequired: number;
  readonly freePrimaryAttributePoints: number;
}

export interface LevelSystemConfig {
  readonly initialLevel: number;
  readonly maximumLevel: number;
  readonly levels: readonly LevelDefinition[];
}
