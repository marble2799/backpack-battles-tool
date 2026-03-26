// ドラッグ可能なアイテムの定義
import React from "react";
import { useDraggable } from '@dnd-kit/core';
import { ItemData } from "../types";
import { getOccupiedCells, getShapeCols } from "../utils/grid";

// ショップのアイテムプレビュー用のセルサイズ
const PREVIEW_CELL = 18;
const PREVIEW_GAP = 2;

interface DraggableShopItemProps {
    item: ItemData;
}

// アイテムリストに置かれたItemをドラッグアンドドロップ可能にする
export const DraggableShopItem: React.FC<DraggableShopItemProps> = ({ item }) => {
    // useDraggableフックを利用し、itemにドラッグ可能属性を付与
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `shop-${item.id}`,
        data: {
            type: 'shop',
            item: item,
        },
    });

    const cols = getShapeCols(item.shape);
    const rows = item.shape.length;
    const previewWidth  = cols * PREVIEW_CELL + (cols - 1) * PREVIEW_GAP;
    const previewHeight = rows * PREVIEW_CELL + (rows - 1) * PREVIEW_GAP;

    // 占有セルの集合（視覚座標）
    const occupiedSet = new Set(
        getOccupiedCells(item.shape, 0, 0, 0).map(p => `${p.x},${p.y}`)
    );

    // ドラッグ中は元の位置にゴースト表示（DragOverlay が実際の移動を担う）
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
                opacity: isDragging ? 0.3 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                cursor: 'grab',
                userSelect: 'none',
                gap: '6px',
            }}
        >
            {/* アイテム形状プレビュー */}
            <div style={{ position: 'relative', width: previewWidth, height: previewHeight }}>
                {Array.from({ length: rows * cols }, (_, i) => {
                    const vx = i % cols;
                    const vy = Math.floor(i / cols);
                    if (!occupiedSet.has(`${vx},${vy}`)) return null;
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: vx * (PREVIEW_CELL + PREVIEW_GAP),
                                top:  vy * (PREVIEW_CELL + PREVIEW_GAP),
                                width: PREVIEW_CELL,
                                height: PREVIEW_CELL,
                                backgroundColor: item.color,
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.3)',
                            }}
                        />
                    );
                })}
            </div>
            {/* アイテム名 */}
            <span style={{ fontSize: '0.75rem', color: '#e2e8f0', textAlign: 'center', lineHeight: 1.2 }}>
                {item.name}
            </span>
        </div>
    );
};
