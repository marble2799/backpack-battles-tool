// ドラッグ可能なアイテムの定義
import React from "react";
import { useDraggable } from '@dnd-kit/core';
import { ItemData, PlacedItem } from '../types';
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from '../constants';
import { getOccupiedCells, getShapeCols } from '../utils/grid';

interface DraggableGridItemProps {
    placedItem: PlacedItem;
    itemData: ItemData;
    isBag: boolean;              // バッグアイテムかどうか
}

// 6桁HEXカラーを rgba() 文字列に変換する
function hexToRgba(hex: string, alpha: number): string {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

// Gridに置かれたItemをドラッグアンドドロップ可能にする
export const DraggableGridItem: React.FC<DraggableGridItemProps> = ({
    placedItem, itemData, isBag,
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `grid-item-${placedItem.id}`,
        data: {
            type: 'grid',
            id: placedItem.id,
            item: itemData,
        },
    });

    const { shape } = itemData;
    const maxCols = getShapeCols(shape);
    const isRotated = placedItem.rotation === 90 || placedItem.rotation === 270;
    const itemCols = isRotated ? shape.length : maxCols;
    const itemRows = isRotated ? maxCols : shape.length;

    // 座標・サイズ計算
    const left   = placedItem.position.x * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const top    = placedItem.position.y * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const width  = itemCols * CELL_SIZE + (itemCols - 1) * GAP_SIZE;
    const height = itemRows * CELL_SIZE + (itemRows - 1) * GAP_SIZE;

    const translateStyle = transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined;

    // バッグ: 半透明塗り + 破線ボーダー、グリッドセルの下に配置
    if (isBag) {
        return (
            <div
                ref={setNodeRef}
                style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: hexToRgba(itemData.color, 0.18),
                    border: `2px dashed ${itemData.color}`,
                    borderRadius: '4px',
                    transform: translateStyle,
                    zIndex: isDragging ? 100 : 3,
                    opacity: isDragging ? 0.7 : 1,
                    cursor: 'grab',
                    pointerEvents: 'auto',
                }}
                {...listeners}
                {...attributes}
                onContextMenu={(e) => e.preventDefault()}
                className="flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
                <span
                    className="text-xs font-semibold select-none"
                    style={{ color: itemData.color, opacity: 0.9, pointerEvents: 'none' }}
                >
                    {itemData.name}
                </span>
            </div>
        );
    }

    // 回転後の視覚セル座標セット（原点基準）
    const visualCellSet = new Set(
        getOccupiedCells(shape, 0, 0, placedItem.rotation).map(p => `${p.x},${p.y}`)
    );

    // 通常アイテム: シェイプに沿った個別セル描画
    return (
        <div
            ref={setNodeRef}
            style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                transform: translateStyle,
                zIndex: isDragging ? 100 : 10,
                opacity: isDragging ? 0.8 : 1,
                cursor: 'grab',
            }}
            {...listeners}
            {...attributes}
            onContextMenu={(e) => e.preventDefault()}
            className="cursor-grab active:cursor-grabbing"
        >
            {/* シェイプに沿った個別セル */}
            {Array.from({ length: itemRows * itemCols }, (_, i) => {
                const vx = i % itemCols;
                const vy = Math.floor(i / itemCols);
                if (!visualCellSet.has(`${vx},${vy}`)) return null;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: vx * (CELL_SIZE + GAP_SIZE),
                            top: vy * (CELL_SIZE + GAP_SIZE),
                            width: CELL_SIZE,
                            height: CELL_SIZE,
                            backgroundColor: itemData.color,
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.25)',
                        }}
                    />
                );
            })}
            {/* アイテム名（バウンディングボックス中央に重ねて表示） */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#fff',
                    pointerEvents: 'none',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
            >
                {itemData.name}
            </div>
        </div>
    );
};
