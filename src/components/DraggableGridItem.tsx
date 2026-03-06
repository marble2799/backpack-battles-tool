// ドラッグ可能なアイテムの定義
import React from "react";
import { useDraggable } from '@dnd-kit/core';
import { ItemData, PlacedItem } from '../types';
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from '../constants';
import { getStarVisualPos } from '../utils/grid';

interface DraggableGridItemProps {
    placedItem: PlacedItem;
    itemData: ItemData;
    litStarIndices: Set<number>; // 点灯している星のインデックス集合
    onRotate(instanceId: string): void;
}

// Gridに置かれたItemをドラッグアンドドロップ可能にする
export const DraggableGridItem: React.FC<DraggableGridItemProps> = ({ placedItem, itemData, litStarIndices, onRotate }) => {
    // useDraggableフックを利用し、itemにドラッグ可能属性を付与
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `grid-item-${placedItem.id}`, // ショップのアイテムとIDが被らないようにする
        data: {
            type: 'grid',
            id: placedItem.id,     // どのアイテムのインスタンス？
            item: itemData         // サイズ計算用
        },
    });

    // 横向きになっているか判定
    const isRotated = placedItem.rotation === 90 || placedItem.rotation === 270;
    // 横向きなら行と列を入れ替える
    const itemCols = isRotated ? itemData.shape.length : itemData.shape[0].length;
    const itemRows = isRotated ? itemData.shape[0].length : itemData.shape.length;

    // 座標計算
    const left = placedItem.position.x * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const top = placedItem.position.y * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    // 幅・高さの計算
    const width = itemCols * CELL_SIZE + (itemCols - 1) * GAP_SIZE;
    const height = itemRows * CELL_SIZE + (itemRows - 1) * GAP_SIZE;

    // 右クリックで回転処理を呼び出す
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onRotate(placedItem.id);
    };

    // カーソルに合わせて移動させる
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: itemData.color,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 100 : 10,
        opacity: isDragging ? 0.8 : 1,
        cursor: 'grab',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onContextMenu={handleContextMenu}
            className="flex flex-col items-center p-1 bg-slate-800 rounded border border-slate-600 cursor-grab hover:bg-slate-700 active:cursor-grabbing z-50"
        >
            <div
                className="w-full h-full flex items-center justify-center text-xs font-bold"
                style={{ color: itemData.color }}
            >
                {itemData.name}
            </div>

            {/* 星マークの描画 */}
            {itemData.stars?.map((star, index) => {
                const visualPos = getStarVisualPos(star, itemData.shape, placedItem.rotation);
                const isLit = litStarIndices.has(index);
                const starLeft = visualPos.x * (CELL_SIZE + GAP_SIZE) + CELL_SIZE - 14;
                const starTop = visualPos.y * (CELL_SIZE + GAP_SIZE) + 2;

                return (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: `${starLeft}px`,
                            top: `${starTop}px`,
                            fontSize: '12px',
                            lineHeight: 1,
                            pointerEvents: 'none',
                            filter: isLit ? 'none' : 'grayscale(100%) opacity(40%)',
                        }}
                    >
                        ⭐
                    </div>
                );
            })}
        </div>
    );
};
