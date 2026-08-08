import { RESOURCE_ID_PREFIXES } from "../config/resource-id-config.ts";

/** 静态资源 ID 当前支持的类型前缀。 */
export type ResourceIdPrefix = (typeof RESOURCE_ID_PREFIXES)[number];

/** 表示具有指定类型前缀的静态资源 ID。具体六位数字格式由运行时校验保证。 */
export type ResourceId<Prefix extends ResourceIdPrefix = ResourceIdPrefix> = `${Prefix}_${string}`;
