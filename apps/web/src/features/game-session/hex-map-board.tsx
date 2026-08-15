import { useRef, useState, type PointerEvent } from "react";

import type {
  LanGamePrivateMapSnapshot,
  LanGamePrivateMapTileSnapshot,
} from "@genesis-rift/shared";
import type { LanHexDirection } from "@genesis-rift/shared";

import {
  getHexMapLocationAssetPath,
  getHexMapLocationDisplayName,
  getHexMapTerrainAssetPath,
} from "./hex-map-config.ts";

/** 描述可在地图上公开显示的玩家位置标记。 */
export interface HexMapPlayerMarker {
  readonly playerId: string;
  readonly displayName: string;
  readonly currentTileId: string;
  readonly isLocalPlayer: boolean;
}

/** 描述平顶六边形地图面板所需的当前玩家私有地图数据。 */
export interface HexMapBoardProps {
  readonly map: LanGamePrivateMapSnapshot | null;
  readonly canMove: boolean;
  readonly playerMarkers: readonly HexMapPlayerMarker[];
  onMove(direction: LanHexDirection): void;
}

interface PositionedMapTile {
  readonly tile: LanGamePrivateMapTileSnapshot;
  readonly x: number;
  readonly y: number;
}

const HEX_RADIUS = 56;
const HEX_WIDTH = HEX_RADIUS * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS;
const BOARD_PADDING = HEX_RADIUS * 1.5;
const HEX_POINTS = createHexPoints(HEX_RADIUS);

/**
 * 方法名：HexMapBoard
 * 作用：使用平顶六边形 SVG 显示当前玩家已经掌握的地图地块，并支持本地缩放、拖动与选择。
 * @param props 服务端按查看者裁剪后的私有地图快照。
 * @returns 当前玩家可交互的地图展示面板。
 */
export function HexMapBoard(props: HexMapBoardProps) {
  const [scale, setScale] = useState(1);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const viewportReference = useRef<HTMLDivElement>(null);
  const dragReference = useRef<{
    readonly x: number;
    readonly y: number;
    readonly left: number;
    readonly top: number;
  } | null>(null);

  if (props.map === null || props.map.tiles.length === 0) {
    return (
      <section className="hex-map-board" aria-labelledby="hex-map-heading">
        <div className="hex-map-board__heading">
          <div>
            <p>Known World</p>
            <h3 id="hex-map-heading">已探索地图</h3>
          </div>
        </div>
        <p className="hex-map-board__empty">尚未收到可显示的地图信息。</p>
      </section>
    );
  }

  const layout = createMapLayout(props.map.tiles);
  const selectedTile =
    props.map.tiles.find((tile) => tile.tileId === selectedTileId) ??
    props.map.tiles.find((tile) => tile.isCurrentPlayerTile) ??
    props.map.tiles[0]!;
  const currentTile = props.map.tiles.find((tile) => tile.isCurrentPlayerTile)!;
  const selectedLocationDisplayName = getHexMapLocationDisplayName(
    selectedTile.featureReferenceIds,
  );

  /** 开始拖动可滚动地图容器。 */
  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    const viewport = viewportReference.current;

    if (viewport === null) {
      return;
    }

    dragReference.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
  }

  /** 根据指针位移更新地图容器的滚动位置。 */
  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const viewport = viewportReference.current;
    const drag = dragReference.current;

    if (viewport === null || drag === null) {
      return;
    }

    viewport.scrollLeft = drag.left - (event.clientX - drag.x);
    viewport.scrollTop = drag.top - (event.clientY - drag.y);
  }

  /** 结束当前地图拖动。 */
  function handlePointerEnd(event: PointerEvent<HTMLDivElement>): void {
    dragReference.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="hex-map-board" aria-labelledby="hex-map-heading">
      <div className="hex-map-board__heading">
        <div>
          <p>Known World</p>
          <h3 id="hex-map-heading">已探索地图</h3>
        </div>
        <div className="hex-map-board__controls" aria-label="地图缩放控制">
          <button type="button" onClick={() => setScale((value) => Math.max(0.7, value - 0.15))}>
            缩小
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((value) => Math.min(1.6, value + 0.15))}>
            放大
          </button>
        </div>
      </div>

      <div
        className="hex-map-board__viewport"
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        ref={viewportReference}
      >
        <svg
          aria-label="已探索平顶六边形地图"
          className="hex-map-board__canvas"
          height={layout.height * scale}
          style={{ width: layout.width * scale }}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width * scale}
        >
          <defs>
            <clipPath id="hex-map-tile-clip">
              <polygon points={HEX_POINTS} />
            </clipPath>
          </defs>
          {layout.tiles.map(({ tile, x, y }) => {
            const isSelected = tile.tileId === selectedTile.tileId;
            const direction = getAdjacentDirection(currentTile, tile);
            const canMoveToTile =
              props.canMove && direction !== null && tile.passability === "passable";
            const locationAssetPath = getHexMapLocationAssetPath(
              tile.featureReferenceIds,
              tile.tileId,
            );
            const locationDisplayName = getHexMapLocationDisplayName(tile.featureReferenceIds);
            const visibleMarkers = props.playerMarkers.filter(
              (marker) => marker.currentTileId === tile.tileId,
            );

            return (
              <g
                className={
                  canMoveToTile
                    ? "hex-map-tile hex-map-tile--movable"
                    : tile.isCurrentPlayerTile
                      ? "hex-map-tile hex-map-tile--current"
                      : "hex-map-tile"
                }
                key={tile.tileId}
                onClick={() => {
                  if (canMoveToTile && direction !== null) {
                    props.onMove(direction);
                    return;
                  }

                  setSelectedTileId(tile.tileId);
                }}
                transform={`translate(${x} ${y})`}
              >
                <image
                  clipPath="url(#hex-map-tile-clip)"
                  height={HEX_HEIGHT}
                  href={getHexMapTerrainAssetPath(tile.terrainDefinitionId, tile.tileId)}
                  preserveAspectRatio="xMidYMid slice"
                  width={HEX_WIDTH}
                  x={-HEX_RADIUS}
                  y={-HEX_HEIGHT / 2}
                />
                {locationAssetPath === null ? null : (
                  <image
                    clipPath="url(#hex-map-tile-clip)"
                    height={HEX_HEIGHT}
                    href={locationAssetPath}
                    preserveAspectRatio="xMidYMid slice"
                    width={HEX_WIDTH}
                    x={-HEX_RADIUS}
                    y={-HEX_HEIGHT / 2}
                  />
                )}
                {locationDisplayName === null ? null : (
                  <text
                    aria-hidden="true"
                    className="hex-map-tile__location-label"
                    textAnchor="middle"
                    y={-HEX_HEIGHT / 2 + 18}
                  >
                    {locationDisplayName}
                  </text>
                )}
                <polygon
                  className={
                    isSelected
                      ? "hex-map-tile__outline hex-map-tile__outline--selected"
                      : "hex-map-tile__outline"
                  }
                  points={HEX_POINTS}
                />
                {visibleMarkers.map((marker, index) => (
                  <g
                    aria-label={`${marker.displayName} 位于此地块`}
                    className={
                      marker.isLocalPlayer
                        ? "hex-map-tile__player-marker hex-map-tile__player-marker--local"
                        : "hex-map-tile__player-marker"
                    }
                    key={marker.playerId}
                    transform={getPlayerMarkerTransform(index, visibleMarkers.length)}
                  >
                    <title>{marker.displayName}</title>
                    <circle r="10" />
                    <text aria-hidden="true" textAnchor="middle" y="4">
                      {getPlayerMarkerSymbol(marker.displayName)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="hex-map-board__detail">
        <strong>{selectedTile.isCurrentPlayerTile ? "当前位置" : "已探索地块"}</strong>
        <span>{selectedTile.terrainDefinitionId}</span>
        <span>高度 {selectedTile.elevation}</span>
        <span>{selectedTile.passability === "passable" ? "可通行" : "不可通行"}</span>
        {selectedLocationDisplayName === null ? null : <span>{selectedLocationDisplayName}</span>}
      </div>
    </section>
  );
}

/** 根据同格玩家数量生成简洁且不重叠的标记位置。 */
function getPlayerMarkerTransform(index: number, total: number): string {
  if (total === 1) {
    return "translate(0 4)";
  }

  const radius = total > 3 ? 17 : 13;
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;

  return `translate(${Math.cos(angle) * radius} ${4 + Math.sin(angle) * radius})`;
}

/** 从显示名称提取一个简短标记字符，避免地图上的玩家名称过长。 */
function getPlayerMarkerSymbol(displayName: string): string {
  return displayName.trim().slice(0, 1).toUpperCase() || "?";
}

/** 根据两个地块的立方坐标差读取标准六方向，非相邻地块返回空值。 */
function getAdjacentDirection(
  origin: LanGamePrivateMapTileSnapshot,
  target: LanGamePrivateMapTileSnapshot,
): LanHexDirection | null {
  const vector = {
    x: target.coordinate.x - origin.coordinate.x,
    y: target.coordinate.y - origin.coordinate.y,
    z: target.coordinate.z - origin.coordinate.z,
  };
  const directions: readonly {
    readonly direction: LanHexDirection;
    readonly vector: typeof vector;
  }[] = [
    { direction: "NORTH", vector: { x: 0, y: 1, z: -1 } },
    { direction: "NORTH_EAST_60", vector: { x: 1, y: 0, z: -1 } },
    { direction: "SOUTH_EAST_60", vector: { x: 1, y: -1, z: 0 } },
    { direction: "SOUTH", vector: { x: 0, y: -1, z: 1 } },
    { direction: "SOUTH_WEST_60", vector: { x: -1, y: 0, z: 1 } },
    { direction: "NORTH_WEST_60", vector: { x: -1, y: 1, z: 0 } },
  ];

  return (
    directions.find(
      (candidate) =>
        candidate.vector.x === vector.x &&
        candidate.vector.y === vector.y &&
        candidate.vector.z === vector.z,
    )?.direction ?? null
  );
}

/** 将立方坐标转换为平顶六边形 SVG 中心点，并归一化至可视区域。 */
function createMapLayout(tiles: readonly LanGamePrivateMapTileSnapshot[]) {
  const rawTiles = tiles.map((tile) => ({
    tile,
    x: HEX_RADIUS * 1.5 * tile.coordinate.x,
    y: HEX_HEIGHT * (tile.coordinate.z + tile.coordinate.x / 2),
  }));
  const minimumX = Math.min(...rawTiles.map((tile) => tile.x));
  const maximumX = Math.max(...rawTiles.map((tile) => tile.x));
  const minimumY = Math.min(...rawTiles.map((tile) => tile.y));
  const maximumY = Math.max(...rawTiles.map((tile) => tile.y));

  return {
    width: maximumX - minimumX + BOARD_PADDING * 2,
    height: maximumY - minimumY + BOARD_PADDING * 2,
    tiles: rawTiles.map(({ tile, x, y }): PositionedMapTile => ({
      tile,
      x: x - minimumX + BOARD_PADDING,
      y: y - minimumY + BOARD_PADDING,
    })),
  };
}

/** 生成以原点为中心的平顶六边形顶点序列。 */
function createHexPoints(radius: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((index * 60) / 180) * Math.PI;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(" ");
}
