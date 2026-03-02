import React from "react";
import { DroppableCell } from "./DroppableCell";
import { PlacedItem, ItemData } from '../types';

interface BackpackGridProps {
    rows: number;
    cols: number;
    placedItems: PlacedItem[]; // 配置済みのアイテムの一覧
    itemsData: ItemData[]; // アイコン表示用のマスターデータ
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({rows, cols, placedItems, itemsData}) => {
    // 配列を生成してマス目の数だけループする
    const cells = Array.from({length: rows*cols});

    return (
        <div
        className="relative grid gap-1 bg-slate-800 p-2 rounded-lg border-2 border-slate-600"
        // CSSでGridのサイズに合わせて自動生成
        style={{
            gridTemplateColumns: `repeat(${cols}, 40px)`,
            gridTemplateRows: `repeat(${rows}, 40px)`
        }}
        >
            {/* マス目の描画 */}
            {cells.map((_, index) => {
                const x = index % cols;
                const y = Math.floor(index/cols);
                return <DroppableCell key={`${x}-${y}`} x={x} y={y}/>;
            })}

            {/* 配置済みアイテムの描画(Layer分けをすることでアイテムを上に表示) */}
            {placedItems.map((placed) => {
                const itemData = itemsData.find(d => d.id === placed.itemId);
                if (!itemData) return null;
                return (
                    <div
                    key={placed.id} // Reactのレンダリング最適化に必須らしい...
                    className="absolute bg-opacity-80 border-2 border-white rounded pointer-events-none flex items-center justify-center"
                    style={{
                        // グリッド座標をピクセルに変換(実際には1マス40px + gap 4pxの計算が必要なので注意)
                        left: `calc(0.5rem + ${placed.position.x * 44}px)`,
                        top: `calc(0.5rem + ${placed.position.y * 44}px)`,
                        width: `${itemData.shape[0].length * 40 + (itemData.shape[0].length - 1)*4}px`,
                        height: `${itemData.shape.length*40 + (itemData.shape.length - 1)*4}px`,
                        backgroundColor: itemData.color,
                    }}
                    >
                        {/* 配置後はシンプルに名前だけを表示する */}
                        <span className="text-xs font-bold text-black">{itemData.name}</span>
                    </div>
                );
            })}
        </div>
    );
};