/** 角色资源创建时相对于资源边界的初始化方式。 */
export type CharacterResourceInitialValue =
  | { readonly kind: "maximum" }
  | { readonly kind: "minimum" }
  | { readonly kind: "fixed"; readonly value: number };

/** 角色运行时资源与其上限派生属性之间的声明式关系。 */
export interface CharacterResourceDefinition<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  /** 在资源系统内保持唯一的资源标识。 */
  readonly resourceId: ResourceId;
  /** 决定该资源当前最大值的派生属性标识。 */
  readonly maximumDerivedAttribute: DerivedAttribute;
  /** 资源在任何情况下都不能低于的值。 */
  readonly minimum: number;
  /** 新建角色资源时采用的初始值规则。 */
  readonly initialValue: CharacterResourceInitialValue;
}

/** 以资源标识索引的只读角色资源定义表。 */
export type CharacterResourceDefinitionCatalog<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> = Readonly<Record<ResourceId, CharacterResourceDefinition<ResourceId, DerivedAttribute>>>;
