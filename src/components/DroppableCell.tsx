import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Point } from '../types';

interface DroppableCellProps {
    x: number;
    y: number;
}

export const DroppableCell: React.FC<DroppableCellProps> = ({ x, y }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `cell-${x}-${y}`, // マス目固有のID (例: cell-0-0)
        data: { x, y }, // ドロップ時に取り出す座標データ
    });

    return (
        <div
            ref={setNodeRef}
            className={`w-10 h-10 border border-slate-600 rounded-sm transition-colors ${
                isOver ? 'bg-slate-500' : 'bg-slate-700' // ドラッグ中のアイテムが上に来たら色を変える
            }`}
        />
    );
};