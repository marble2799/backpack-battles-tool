import React from "react";
import { DroppableCell } from "./DroppableCell";
import { PlacedItem, ItemData } from '../types';
import { DraggableGridItem } from "./DraggableGridItem";
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from "../constants";

interface BackpackGridProps {
    rows: number;
    cols: number;
    placedItems: PlacedItem[]; // 配置済みのアイテムの一覧
    itemsData: ItemData[]; // アイコン表示用のマスターデータ

    // Method
    onRotate(instanceId: string): void;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({rows, cols, placedItems, itemsData, onRotate}) => {
    // 配列を生成してマス目の数だけループする
    const cells = Array.from({length: rows*cols});

    return (
        <div
        className="relative grid gap-1 bg-slate-800 p-2 rounded-lg border-2 border-slate-600"
        // CSS Gridではなく、絶対配置のコンテナとして固定する
        style={{
            // パディングを含めた全体のサイズを計算
            width: cols * CELL_SIZE + (cols - 1) * GAP_SIZE + GRID_PADDING * 2,
            height: rows * CELL_SIZE + (rows - 1) * GAP_SIZE + GRID_PADDING * 2,
            padding: GRID_PADDING,
            // グリッドレイアウトも維持（DroppableCellの配置用）
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
            gap: `${GAP_SIZE}px`,
        }}
        >
            {/* マス目の描画 */}
            {cells.map((_, index) => {
                const x = index % cols;
                const y = Math.floor(index/cols);
                return <DroppableCell key={`${x}-${y}`} x={x} y={y}/>;
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
                        onRotate={onRotate}
                    />
                );
            })}
        </div>
    );
};