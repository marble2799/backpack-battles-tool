"use client"; // Next.jsでHookを使うためのおまじない

import React, { useState } from "react";
import { ITEMS } from "../data";
import { BackpackGrid } from "../components/BackpackGrid";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { DraggableShopItem } from "../components/DraggableShopItem";
import { PlacedItem, ItemData } from '../types';
import { getOccupiedCells, isOutOfBounds, getOverlappingItems, canPlaceItem } from "../utils/grid";
import { GRID_COLS, GRID_ROWS } from "../constants";

export default function Home() {
    // 配置されたアイテムの状態を保存
    const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
    
    // アイテムを90度回転させる
    const handleRotate = (instanceId: string) => {
        setPlacedItems((prev) => prev.map((item) => {
            if (item.id === instanceId) {
                // 90度足して、360度になったら0に戻す
                const newRotation = (item.rotation + 90) % 360 as 0 | 90 | 180 | 270;
                return {...item, rotation: newRotation};
            }
            return item;
        }));
    }
    
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
            // グリッド上のアイテムを外にドロップした場合は削除する
            if (activeData.type === 'grid') {
                setPlacedItems((prev) => prev.filter(p => p.id !== activeData.id));
            }
            return;
        }

        // active.data.currentとover.data.currentに仕込んだデータを取り出す
        const x = over.data.current?.x;
        const y = over.data.current?.y;
        if (x === undefined || y === undefined) return;

        // 配置しようとしているアイテムの情報を取得
        const item = activeData.type === 'shop' ? activeData.item : ITEMS.find(d => d.id === activeData.item.id);
        if (!item) return;

        // グリッド状のアイテムなら現在の回転角度を、ショップなら0度を取得
        let currentRotation: 0 | 90 | 180 | 270 = 0;
        if (activeData.type === 'grid') {
            const existingItem = placedItems.find(p => p.id === activeData.id);
            if (existingItem) currentRotation = existingItem.rotation;
        }

        const newCells = getOccupiedCells(item.shape, x, y, currentRotation);

        // 境界判定
        if (isOutOfBounds(newCells, GRID_COLS, GRID_ROWS)) {
            if (activeData.type === 'grid') { // gridからはみ出たら削除
                setPlacedItems((prev) => prev.filter(p => p.id !== activeData.id));
            }
            return;
        }

        // 衝突判定(重なったアイテムのIDを取得)
        const ignoreId = activeData.type === 'grid' ? activeData.id : undefined;
        const overlappingIds = getOverlappingItems(newCells, placedItems, ITEMS, ignoreId);

        // 実際に状態の更新
        setPlacedItems((prev) => {
            // 重なっているアイテムを除外
            const filtered = prev.filter(p => !overlappingIds.includes(p.id));

            if (activeData.type === 'shop') {
                // ショップからの追加
                const newItem: PlacedItem = {
                    id: `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    itemId: item.id,
                    position: {x, y},
                    rotation: 0,
                };
                return [...filtered, newItem];
            }else { // grid上の場合
                return filtered.map(p => p.id === activeData.id ? {...p, position: {x, y}}:p);
            }
        });
    }


    return (
        <DndContext onDragEnd={handleDragEnd}>
            <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
                    <h1 className="text-3xl font-bold">Backpack Battles Simulator</h1>

                    <div className="flex flex-row gap-12 items-start">
                        {/* 左側にバックパックエリアを設定*/}
                        <div className="flex flex-col items-center gap-4">
                            <h2 className="text-xl font-semibold">BackPack Area</h2>
                            {/* 現在の状態(=placedItems)を渡す */}
                            <BackpackGrid rows={GRID_ROWS} cols={GRID_COLS} placedItems={placedItems} itemsData={ITEMS} onRotate={handleRotate}/>
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
