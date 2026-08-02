import type { PrimaryAttribute, PrimaryAttributes } from "../attributes/primary-attributes.ts";
import { IDENTITY_NAMES } from "./identity-name-config.ts";

/** 可供玩家选择的职业英文名称。 */
export type IdentityName = (typeof IDENTITY_NAMES)[number];
/** 职业在配置资源中的全局标识格式。 */
export type IdentityConfigId = `identity.${IdentityName}`;
/** 职业本地化名称使用的资源键格式。 */
export type IdentityNameKey = `identity.${IdentityName}.name`;
/** 职业立绘资源使用的文件名格式。 */
export type IdentityPortraitFile = `${IdentityName}.avif`;

/** 职业在初始属性分配上的主要与次要倾向。 */
export interface IdentityAttributePriorities {
  readonly primary: readonly PrimaryAttribute[];
  readonly secondary: readonly PrimaryAttribute[];
}

/** 单个职业的静态身份与初始数值配置。 */
export interface IdentityConfig {
  readonly id: IdentityConfigId;
  readonly name: IdentityName;
  readonly nameKey: IdentityNameKey;
  readonly portraitFile: IdentityPortraitFile;
  readonly attributePriorities: IdentityAttributePriorities;
  readonly initialPrimaryAttributes: PrimaryAttributes;
}
