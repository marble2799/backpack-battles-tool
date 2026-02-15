import React from "react";
import { ITEMS } from "../data";
import { BackpackGrid } from "../components/BackpackGrid";
import { SwordItem } from "../components/SwordItem";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
                <h1 className="text-3xl font-bold">Backpack Battles Tool</h1>

                <div className="flex flex-row gap-12 items-start">
                    {/* 左側にバックパックエリアを設定*/}
                    <div className="flex flex-col items-center gap-4">
                        <h2 className="text-xl font-semibold">BackPack Area</h2>
                        {/* (縦)8*(横)9のGridを表示*/}
                        <BackpackGrid rows={8} cols={9}/>
                    </div>

                    {/*右側にはアイテムリストを表示*/}
                    <div className="flex flex-col items-center gap-4">
                        <h2 className="text-xl font-semibold">Item List</h2>
                        <div className="flex flex-wrap gap-4 max-w-md">
                            {/* 定義したデータ(Item)を表示 */}
                            {ITEMS.map((item) => (
                                <div
                                key={item.id}
                                className="flex flex-col items-center p-2 bg-slate-800 rounded border border-slate-600 cursor-grab hover:bg-slate-700"
                                >
                                    {/* 簡易的なアイコン表示 */}
                                    <div
                                    className="w-12 h-12 flex items-center justify-center text-2xl"
                                    style={{color: item.color}}
                                    >
                                        {item.shape.length}x{item.shape[0].length}
                                    </div>
                                    <span className="text-sm mt-1">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
        </main>
    );
}
