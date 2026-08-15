import { describe, expect, it } from "vitest";

import {
  getHexMapLocationAssetPath,
  getHexMapLocationDisplayName,
  getHexMapTerrainAssetPath,
} from "./hex-map-config.ts";

describe("hex map asset configuration", () => {
  it("selects a stable asset variant for every configured terrain", () => {
    expect(getHexMapTerrainAssetPath("terrain_000005", "tile.desert")).toMatch(
      /^\/assets\/images\/board\/tiles\/desert\/desert-0[1-6]\.avif$/,
    );
    expect(getHexMapTerrainAssetPath("terrain_000006", "tile.snow")).toMatch(
      /^\/assets\/images\/board\/tiles\/snow\/snow-0[1-6]\.avif$/,
    );
    expect(getHexMapTerrainAssetPath("terrain_unknown", "tile.fallback")).toMatch(
      /^\/assets\/images\/board\/tiles\/plain\/plain-0[1-6]\.avif$/,
    );
  });

  it("prefers an enabled location asset over the underlying terrain image", () => {
    expect(getHexMapLocationAssetPath(["location.town"], "tile.town")).toMatch(
      /^\/assets\/images\/board\/locations\/town\/town-0[1-6]\.avif$/,
    );
    expect(getHexMapLocationAssetPath([], "tile.empty")).toBeNull();
    expect(getHexMapLocationAssetPath(["location.unknown"], "tile.unknown")).toBeNull();
  });

  it("provides display names for known locations without exposing unknown references", () => {
    expect(getHexMapLocationDisplayName(["location.temple"])).toBe("神殿");
    expect(getHexMapLocationDisplayName(["location.unknown"])).toBeNull();
  });
});
