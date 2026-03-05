// ドラッグ可能なアイテムの定義
import React from "react";
import {useDraggable} from '@dnd-kit/core';
import { ItemData, PlacedItem } from '../types';
import {CELL_SIZE, GAP_SIZE, GRID_PADDING} from '../constants';


interface DraggableGridItemProps {
    placedItem: PlacedItem;
    itemData: ItemData;

    // Method
    onRotate(instanceId:string): void;
}

// Gridに置かれたItemをドラッグアンドドロップ可能にする
export const DraggableGridItem: React.FC<DraggableGridItemProps> = ({ placedItem, itemData, onRotate }) => {
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

    // 2. 座標計算
    // 基本位置 (配置された座標)
    const left = placedItem.position.x * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    const top = placedItem.position.y * (CELL_SIZE + GAP_SIZE) + GRID_PADDING;
    // 幅・高さの計算
    const width = itemCols * CELL_SIZE + (itemCols - 1) * GAP_SIZE;
    const height = itemRows * CELL_SIZE + (itemRows - 1) * GAP_SIZE;    // ドラッグ中の移動量を設定

    // 右クリックで回転処理を呼び出す
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onRotate(placedItem.id);
    }

    // カーソルに合わせて移動させる
    const  style: React.CSSProperties = {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px` ,
        height: `${height}px`,
        backgroundColor: itemData.color,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)`: undefined,
        zIndex: isDragging ? 100 : 10, // ドラッグ中は手前に表示
        opacity: isDragging ? 0.8 : 1, // ドラッグ中は少し透明にする
        cursor: 'grab',
    };

    // attributes, listenersをdivで展開することで、マウスイベントやタッチイベントが自動で処理される
    return (
        <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onContextMenu={handleContextMenu}
        className="flex flex-col items-center p-2 bg-slate-800 rounded border border-slate-600 cursor-grab hover:bg-slate-700 active:cursor-grabbing z-50"
        >
            <div
            className="w-12 h-12 flex items-center justify-center text-2xl" style={{ transform: `rotate(${placedItem.rotation}deg)`, color: itemData.color }}
            >
                {itemData.shape.length}x{itemData.shape[0].length}
            </div>
            <span className="text-sm mt-1">{itemData.name}</span>
        </div>
    );
};