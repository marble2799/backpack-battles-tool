import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableCellProps {
    x: number;
    y: number;
    isBagCell: boolean; // バッグアイテムが覆っているセルかどうか
}

export const DroppableCell: React.FC<DroppableCellProps> = ({ x, y, isBagCell }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `cell-${x}-${y}`, // マス目固有のID (例: cell-0-0)
        data: { x, y }, // ドロップ時に取り出す座標データ
    });

    return (
        <div
            ref={setNodeRef}
            className={`w-10 h-10 border rounded-sm transition-colors ${
                isBagCell
                    ? isOver
                        ? 'bg-slate-500 border-slate-400'
                        : 'bg-slate-700 border-slate-600'
                    : 'bg-slate-950 border-slate-800'
            }`}
        />
    );
};
