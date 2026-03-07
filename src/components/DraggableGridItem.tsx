// ドラッグ可能なアイテムの定義
import React from "react";
import { useDraggable } from '@dnd-kit/core';
import { ItemData, PlacedItem } from '../types';
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from '../constants';

interface DraggableGridItemProps {
    placedItem: PlacedItem;
    itemData: ItemData;
    isBag: boolean;              // バッグアイテムかどうか
    onRotate(instanceId: string): void;
}

// 6桁HEXカラーを rgba() 文字列に変換する
function hexToRgba(hex: string, alpha: number): string {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

// Gridに置かれたItemをドラッグアンドドロップ可能にする
export const DraggableGridItem: React.FC<DraggableGridItemProps> = ({
    placedItem, itemData, isBag, onRotate,
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `grid-item-${placedItem.id}`,
        data: {
            type: 'grid',
            id: placedItem.id,
            item: itemData,
        },
    });

    // 横向きになっているか判定
    const isRotated = placedItem.rotation === 90 || placedItem.rotation === 270;
    const itemCols = isRotated ? itemData.shape.length : itemData.shape[0].length;
    const itemRows = isRotated ? itemData.shape[0].length : itemData.shape.length;

    // 座標・サイズ計算
    const left = placedItem.position.x * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const top  = placedItem.position.y * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const width  = itemCols * CELL_SIZE + (itemCols - 1) * GAP_SIZE;
    const height = itemRows * CELL_SIZE + (itemRows - 1) * GAP_SIZE;

    // 右クリック: ドラッグ中のときだけ回転を許可
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isDragging) {
            onRotate(placedItem.id);
        }
    };

    const translateStyle = transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined;

    // バッグ: 半透明塗り + 破線ボーダー、グリッドセルの下に配置
    // 通常アイテム: アイテムカラーで塗りつぶし
    const style: React.CSSProperties = isBag
        ? {
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
        }
        : {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: itemData.color,
            transform: translateStyle,
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
            className={
                isBag
                    ? 'flex items-center justify-center cursor-grab active:cursor-grabbing'
                    : 'flex flex-col items-center p-1 bg-slate-800 rounded border border-slate-600 cursor-grab hover:bg-slate-700 active:cursor-grabbing'
            }
        >
            {isBag ? (
                <span
                    className="text-xs font-semibold select-none"
                    style={{ color: itemData.color, opacity: 0.9, pointerEvents: 'none' }}
                >
                    {itemData.name}
                </span>
            ) : (
                <div
                    className="w-full h-full flex items-center justify-center text-xs font-bold"
                    style={{ color: itemData.color }}
                >
                    {itemData.name}
                </div>
            )}
        </div>
    );
};
