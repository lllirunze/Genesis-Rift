export type CharacterResourceInitialValue =
  | { readonly kind: "maximum" }
  | { readonly kind: "minimum" }
  | { readonly kind: "fixed"; readonly value: number };

export interface CharacterResourceDefinition<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  readonly resourceId: ResourceId;
  readonly maximumDerivedAttribute: DerivedAttribute;
  readonly minimum: number;
  readonly initialValue: CharacterResourceInitialValue;
}

export type CharacterResourceDefinitionCatalog<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> = Readonly<Record<ResourceId, CharacterResourceDefinition<ResourceId, DerivedAttribute>>>;
