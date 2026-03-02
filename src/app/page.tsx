"use client"; // Next.jsでHookを使うためのおまじない

import React, { useState } from "react";
import { ITEMS } from "../data";
import { BackpackGrid } from "../components/BackpackGrid";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { DraggableShopItem } from "../components/DraggableShopItem";
import { PlacedItem, ItemData } from '../types';

export default function Home() {
    // 配置されたアイテムの状態を保存
    const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
    
    // ドラッグ終了時の処理を行う
    const handleDragEnd = (event: DragEndEvent) => {
        // active: 今掴んでいるもの, over: マウスカーソルの下にある要素
        const { active, over } = event;

        // どのアイテムを掴んだ？
        const activeData = active.data.current; // {type: 'shop' | 'grid',...}
        console.log(activeData);
        if (!activeData) return;

        // ドロップ先に何もない場合
        if (!over) {
            console.log("there is nothing under cursor");
            // グリッド上のアイテムを外にドロップした場合は削除する
            if (activeData.type === 'grid') {
                setPlacedItems((prev) => prev.filter(p => p.id !== activeData.id));
            }
            return;
        }

        // active.data.currentとover.data.currentに仕込んだデータを取り出す
        const x = over.data.current?.x;
        const y = over.data.current?.y;

        if (x !== undefined && y !== undefined) {
            // ショップから新規で配置する場合
            if (activeData.type === 'shop') {
                const item = activeData.item;
                // 新しいアイテムを作成して配置
                const newItem: PlacedItem = {
                    id: crypto.randomUUID(), // ユニークなidを作成
                    itemId: item.id,
                    position: { x, y },
                    rotation: 0,
                };
                setPlacedItems((prev) => [...prev, newItem]);
            }

            // グリッド内で移動させる場合
            if (activeData.type === 'grid') {
                const instanceId = activeData.id;

                setPlacedItems((prev) => prev.map((p) => {
                    if (p.id === instanceId) { // 座標を更新する
                        return {...p, position: { x, y }};
                    }

                    // なぜか持っているitemとidが違った場合
                    return p;
                }))
            }
        }
    };


    return (
        <DndContext onDragEnd={handleDragEnd}>
            <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
                    <h1 className="text-3xl font-bold">Backpack Battles Simulator</h1>

                    <div className="flex flex-row gap-12 items-start">
                        {/* 左側にバックパックエリアを設定*/}
                        <div className="flex flex-col items-center gap-4">
                            <h2 className="text-xl font-semibold">BackPack Area</h2>
                            {/* 現在の状態(=placedItems)を渡す */}
                            <BackpackGrid rows={7} cols={9} placedItems={placedItems} itemsData={ITEMS}/>
                        </div>

                        {/*右側にはアイテムリストを表示*/}
                        <div className="flex flex-col items-center gap-4">
                            <h2 className="text-xl font-semibold">Item List</h2>
                            <div className="flex flex-wrap gap-4 max-w-md">
                                {/* 定義したデータ(Item)を表示 */}
                                {ITEMS.map((item) => (
                                    // ラッパーコンポーネントを使用
                                    <DraggableShopItem key={item.id} item={item}/>
                                ))}
                            </div>
                        </div>
                    </div>
            </main>
        </DndContext>
    );
}
