import React from "react";
import { DroppableCell } from "./DroppableCell";
import { PlacedItem, ItemData } from '../types';
import { DraggableGridItem } from "./DraggableGridItem";
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from "../constants";
import { getBagCells, getStarAbsolutePos } from "../utils/grid";

interface BackpackGridProps {
    rows: number;
    cols: number;
    placedItems: PlacedItem[];  // 配置済みのアイテムの一覧
    itemsData: ItemData[];      // アイコン表示用のマスターデータ
    litStars: Set<string>;      // 点灯している星のIDセット ("placedItemId-starIndex")

    // Method
    onRotate(instanceId: string): void;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({ rows, cols, placedItems, itemsData, litStars, onRotate }) => {
    const cells = Array.from({ length: rows * cols });

    // バッグアイテムが覆っているセルの集合を計算
    const bagCells = getBagCells(placedItems, itemsData);

    // セル座標 → ピクセル座標 (セル左上)
    const cellToPixel = (gx: number, gy: number) => ({
        left: gx * (CELL_SIZE + GAP_SIZE) + GRID_PADDING,
        top:  gy * (CELL_SIZE + GAP_SIZE) + GRID_PADDING,
    });

    return (
        <div
            className="relative bg-slate-800 rounded-lg border-2 border-slate-600"
            style={{
                width: cols * CELL_SIZE + (cols - 1) * GAP_SIZE + GRID_PADDING * 2,
                height: rows * CELL_SIZE + (rows - 1) * GAP_SIZE + GRID_PADDING * 2,
                padding: GRID_PADDING,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
                gap: `${GAP_SIZE}px`,
            }}
        >
            {/* マス目の描画 */}
            {cells.map((_, index) => {
                const x = index % cols;
                const y = Math.floor(index / cols);
                const isBagCell = bagCells.has(`${x},${y}`);
                return <DroppableCell key={`${x}-${y}`} x={x} y={y} isBagCell={isBagCell} />;
            })}

            {/* 配置済みアイテムの描画 */}
            {placedItems.map((placed) => {
                const itemData = itemsData.find(d => d.id === placed.itemId);
                if (!itemData) return null;
                return (
                    <DraggableGridItem
                        key={placed.id}
                        placedItem={placed}
                        itemData={itemData}
                        isBag={itemData.tags.includes('bag')}
                        onRotate={onRotate}
                    />
                );
            })}

            {/* 星マークの描画 (アイテム外側のグリッドセルに絶対配置) */}
            {placedItems.flatMap((placed) => {
                const itemData = itemsData.find(d => d.id === placed.itemId);
                if (!itemData?.stars) return [];

                return itemData.stars.map((star, starIndex) => {
                    const absPos = getStarAbsolutePos(
                        star, itemData.shape,
                        placed.position.x, placed.position.y,
                        placed.rotation,
                    );

                    // グリッド範囲外の星は描画しない
                    if (absPos.x < 0 || absPos.x >= cols || absPos.y < 0 || absPos.y >= rows) {
                        return null;
                    }

                    const isLit = litStars.has(`${placed.id}-${starIndex}`);
                    const { left, top } = cellToPixel(absPos.x, absPos.y);

                    return (
                        <div
                            key={`star-${placed.id}-${starIndex}`}
                            style={{
                                position: 'absolute',
                                left: `${left}px`,
                                top: `${top}px`,
                                width: `${CELL_SIZE}px`,
                                height: `${CELL_SIZE}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                lineHeight: 1,
                                zIndex: 20,
                                pointerEvents: 'none',
                                filter: isLit ? 'none' : 'grayscale(100%) opacity(35%)',
                            }}
                        >
                            ⭐
                        </div>
                    );
                });
            })}
        </div>
    );
};
