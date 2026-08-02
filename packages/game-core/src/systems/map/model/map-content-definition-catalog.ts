import type { RegionDefinitionCatalog } from "./region-definition.ts";
import { validateRegionDefinitionCatalog } from "./region-definition.ts";
import type { TerrainDefinitionCatalog } from "./terrain-definition.ts";
import { validateTerrainDefinitionCatalog } from "./terrain-definition.ts";

/** 描述以标识索引业务定义的只读注册表。 */
export interface MapContentDefinitionCatalog {
  readonly terrains: TerrainDefinitionCatalog;
  readonly regions: RegionDefinitionCatalog;
}

/**
 * 方法名：validateMapContentDefinitionCatalog
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateMapContentDefinitionCatalog(catalog: MapContentDefinitionCatalog): void {
  validateTerrainDefinitionCatalog(catalog.terrains);
  validateRegionDefinitionCatalog(catalog.regions);
}
