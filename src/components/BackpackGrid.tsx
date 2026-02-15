import React from "react";

interface BackpackGridProps {
    rows: number;
    cols: number;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({rows, cols}) => {
    // 配列を生成してマス目の数だけループする
    const cells = Array.from({length: rows*cols});

    return (
        <div
        className="grid gap-1 bg-slate-800 p-2 rounded-lg border-2 border-slate-600"
        // CSSでGridのサイズに合わせて自動生成
        style={{
            gridTemplateColumns: `repeat(${cols}, 40px)`,
            gridTemplateRows: `repeat(${rows}, 40px)`
        }}
        >
            {cells.map((_, index) => {
                const x = index % cols;
                const y = Math.floor(index/cols);

                return (
                    <div
                    key={`${x}-${y}`} // Reactのレンダリング最適化に必須らしい...
                    className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-sm hover:bg-slate-600 transition-colors"
                    title={`(${x}, ${y})`} // マウスホバーで座標表示
                    />
                )
            })}
        </div>
    );
};