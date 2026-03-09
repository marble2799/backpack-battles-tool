// ドラッグ可能なアイテムの定義
import React from "react";
import {useDraggable} from '@dnd-kit/core';
import { ItemData } from "../types";


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

    // ドラッグ中は元の位置にゴースト表示（DragOverlay が実際の移動を担う）
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{ opacity: isDragging ? 0.3 : 1 }}
            className="flex flex-col items-center p-2 bg-slate-800 rounded border border-slate-600 cursor-grab hover:bg-slate-700 active:cursor-grabbing z-50"
        >
            <div
                className="w-12 h-12 flex items-center justify-center text-2xl"
                style={{ color: item.color }}
            >
                {item.shape.length}x{item.shape[0].length}
            </div>
            <span className="text-sm mt-1">{item.name}</span>
        </div>
    );
};