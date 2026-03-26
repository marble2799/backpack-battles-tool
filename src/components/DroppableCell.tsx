import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CELL_SIZE } from '../constants';

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

    let backgroundColor: string;
    let borderColor: string;
    if (isBagCell) {
        backgroundColor = isOver ? '#64748b' : '#334155';
        borderColor = isOver ? '#94a3b8' : '#475569';
    } else {
        backgroundColor = '#020617';
        borderColor = '#1e293b';
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '2px',
                transition: 'background-color 0.1s',
                boxSizing: 'border-box',
            }}
        />
    );
};
