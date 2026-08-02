import {
  validateMapContentDefinitionCatalog,
  type MapContentDefinitionCatalog,
} from "@genesis-rift/game-core";

import { REGION_DEFINITION_CATALOG } from "./region-definitions.ts";
import { TERRAIN_DEFINITION_CATALOG } from "./terrain-definitions.ts";

/** 当前模块使用的只读配置注册表。 */
export const MAP_CONTENT_DEFINITION_CATALOG = {
  terrains: TERRAIN_DEFINITION_CATALOG,
  regions: REGION_DEFINITION_CATALOG,
} as const satisfies MapContentDefinitionCatalog;

validateMapContentDefinitionCatalog(MAP_CONTENT_DEFINITION_CATALOG);
