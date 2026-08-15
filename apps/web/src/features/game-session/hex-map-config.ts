/** 地形图块资源目录与可稳定选择的切片数量。 */
export const HEX_MAP_TERRAIN_ASSET_CONFIG: Readonly<
  Record<string, { readonly directory: string; readonly variantCount: number }>
> = {
  terrain_000001: { directory: "plain", variantCount: 6 },
  terrain_000002: { directory: "forest", variantCount: 6 },
  terrain_000003: { directory: "mountain", variantCount: 6 },
  terrain_000004: { directory: "water", variantCount: 6 },
  terrain_000005: { directory: "desert", variantCount: 6 },
  terrain_000006: { directory: "snow", variantCount: 6 },
};

/** 未配置专属资源时使用的默认地形图块。 */
export const DEFAULT_HEX_MAP_TERRAIN_ASSET = {
  directory: "plain",
  variantCount: 6,
} as const;

/** 完整替代基础地形视觉表现的特殊地点资源配置。 */
export const HEX_MAP_LOCATION_ASSET_CONFIG: Readonly<
  Record<
    string,
    {
      readonly directory: string;
      readonly variantCount: number;
      readonly enabled: boolean;
      readonly displayName: string;
    }
  >
> = {
  "location.town": { directory: "town", variantCount: 6, enabled: true, displayName: "城镇" },
  "location.village": { directory: "village", variantCount: 6, enabled: true, displayName: "村庄" },
  "location.temple": { directory: "temple", variantCount: 6, enabled: true, displayName: "神殿" },
  "location.port": { directory: "port", variantCount: 6, enabled: true, displayName: "港口" },
  "location.ruin": { directory: "ruin", variantCount: 6, enabled: true, displayName: "遗迹" },
};

/** 根据地块标识稳定选择一个地形切片，避免同一对局中资源随机跳变。 */
export function getHexMapTerrainAssetPath(terrainDefinitionId: string, tileId: string): string {
  const config = HEX_MAP_TERRAIN_ASSET_CONFIG[terrainDefinitionId] ?? DEFAULT_HEX_MAP_TERRAIN_ASSET;
  const variant = (getStableStringHash(tileId) % config.variantCount) + 1;
  const fileName = `${config.directory}-${String(variant).padStart(2, "0")}.avif`;

  return `/assets/images/board/tiles/${config.directory}/${fileName}`;
}

/** 根据地点设施引用返回完整地块资源路径；未配置地点时保留基础地形显示。 */
export function getHexMapLocationAssetPath(
  featureReferenceIds: readonly string[],
  tileId: string,
): string | null {
  const referenceId = featureReferenceIds.find(
    (candidate) => HEX_MAP_LOCATION_ASSET_CONFIG[candidate] !== undefined,
  );

  if (referenceId === undefined || !HEX_MAP_LOCATION_ASSET_CONFIG[referenceId]!.enabled) {
    return null;
  }

  const config = HEX_MAP_LOCATION_ASSET_CONFIG[referenceId]!;
  const variant = (getStableStringHash(tileId) % config.variantCount) + 1;
  const fileName = `${config.directory}-${String(variant).padStart(2, "0")}.avif`;

  return `/assets/images/board/locations/${config.directory}/${fileName}`;
}

/** 根据地点设施引用返回可展示名称；未配置地点时不显示标签。 */
export function getHexMapLocationDisplayName(
  featureReferenceIds: readonly string[],
): string | null {
  const referenceId = featureReferenceIds.find(
    (candidate) => HEX_MAP_LOCATION_ASSET_CONFIG[candidate] !== undefined,
  );

  return referenceId === undefined ? null : HEX_MAP_LOCATION_ASSET_CONFIG[referenceId]!.displayName;
}

/** 使用确定性整数哈希为静态资源选择生成稳定索引。 */
function getStableStringHash(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}
