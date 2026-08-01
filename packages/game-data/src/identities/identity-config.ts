import type { PrimaryAttribute, PrimaryAttributes } from "../attributes/primary-attributes.ts";
import { IDENTITY_NAMES } from "./identity-name-config.ts";

export type IdentityName = (typeof IDENTITY_NAMES)[number];
export type IdentityConfigId = `identity.${IdentityName}`;
export type IdentityNameKey = `identity.${IdentityName}.name`;
export type IdentityPortraitFile = `${IdentityName}.avif`;

export interface IdentityAttributePriorities {
  readonly primary: readonly PrimaryAttribute[];
  readonly secondary: readonly PrimaryAttribute[];
}

export interface IdentityConfig {
  readonly id: IdentityConfigId;
  readonly name: IdentityName;
  readonly nameKey: IdentityNameKey;
  readonly portraitFile: IdentityPortraitFile;
  readonly attributePriorities: IdentityAttributePriorities;
  readonly initialPrimaryAttributes: PrimaryAttributes;
}
