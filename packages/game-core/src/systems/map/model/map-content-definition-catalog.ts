import type { RegionDefinitionCatalog } from "./region-definition.ts";
import { validateRegionDefinitionCatalog } from "./region-definition.ts";
import type { TerrainDefinitionCatalog } from "./terrain-definition.ts";
import { validateTerrainDefinitionCatalog } from "./terrain-definition.ts";

export interface MapContentDefinitionCatalog {
  readonly terrains: TerrainDefinitionCatalog;
  readonly regions: RegionDefinitionCatalog;
}

export function validateMapContentDefinitionCatalog(catalog: MapContentDefinitionCatalog): void {
  validateTerrainDefinitionCatalog(catalog.terrains);
  validateRegionDefinitionCatalog(catalog.regions);
}
