import React from "react";
import { DroppableCell } from "./DroppableCell";
import { PlacedItem, ItemData } from '../types';
import { DraggableGridItem } from "./DraggableGridItem";
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from "../constants";
import { getBagCells } from "../utils/grid";

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

                // このアイテムの点灯星インデックスを抽出
                const litStarIndices = new Set<number>();
                if (itemData.stars) {
                    itemData.stars.forEach((_, i) => {
                        if (litStars.has(`${placed.id}-${i}`)) {
                            litStarIndices.add(i);
                        }
                    });
                }

                return (
                    <DraggableGridItem
                        key={placed.id}
                        placedItem={placed}
                        itemData={itemData}
                        isBag={itemData.tags.includes('bag')}
                        litStarIndices={litStarIndices}
                        onRotate={onRotate}
                    />
                );
            })}
        </div>
    );
};
