"use client"; // Next.jsでHookを使うためのおまじない

import React, { useState, useMemo, useRef } from "react";
import { ITEMS } from "../data";
import { BackpackGrid } from "../components/BackpackGrid";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { DraggableShopItem } from "../components/DraggableShopItem";
import { PlacedItem, ItemData } from '../types';
import { getOccupiedCells, isOutOfBounds, getOverlappingItems, getBagCells, isOnBagCells, computeLitStars, getShapeCols } from "../utils/grid";
import { GRID_COLS, GRID_ROWS, CELL_SIZE, GAP_SIZE } from "../constants";

// 初期配置: スターターバッグをグリッド中央付近に置く
const INITIAL_PLACED_ITEMS: PlacedItem[] = [
    {
        id: 'starter_bag-initial',
        itemId: 'starter_bag',
        position: { x: 2, y: 2 },
        rotation: 0,
    },
];

export default function Home() {
    const [placedItems, setPlacedItems] = useState<PlacedItem[]>(INITIAL_PLACED_ITEMS);
    // ショップからドラッグ中のアイテム（DragOverlay で展開表示するため）
    const [dragOverlayItem, setDragOverlayItem] = useState<ItemData | null>(null);
    // ドラッグ開始時の回転を保存（バッグ判定失敗時に復元するため）
    const preDragRotationRef = useRef<{ id: string; rotation: 0 | 90 | 180 | 270 } | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.type === 'shop') {
            setDragOverlayItem(data.item as ItemData);
        } else if (data?.type === 'grid') {
            const existing = placedItems.find(p => p.id === data.id);
            if (existing) {
                preDragRotationRef.current = { id: data.id, rotation: existing.rotation };
            }
        }
    };

    // 点灯している星を計算 (placedItemsが変わるたびに再計算)
    const litStars = useMemo(() => computeLitStars(placedItems, ITEMS), [placedItems]);

    // アイテムを90度回転させる
    const handleRotate = (instanceId: string) => {
        setPlacedItems((prev) => prev.map((item) => {
            if (item.id === instanceId) {
                const newRotation = (item.rotation + 90) % 360 as 0 | 90 | 180 | 270;
                return { ...item, rotation: newRotation };
            }
            return item;
        }));
    };

    // バッグ以外のアイテムをすべて削除する
    const handleReset = () => {
        setPlacedItems(prev => prev.filter(p => {
            const itemData = ITEMS.find(d => d.id === p.itemId);
            return itemData?.tags.includes('bag') ?? false;
        }));
    };

    // バッグを動かした/削除したあと、バッグ外に出たアイテムを削除する
    const cleanupItemsOutsideBags = (items: PlacedItem[]): PlacedItem[] => {
        const bagCells = getBagCells(items, ITEMS);
        return items.filter(p => {
            const itemData = ITEMS.find(d => d.id === p.itemId);
            if (!itemData) return false;
            if (itemData.tags.includes('bag')) return true; // バッグ自体は残す
            const cells = getOccupiedCells(itemData.shape, p.position.x, p.position.y, p.rotation);
            return isOnBagCells(cells, bagCells);
        });
    };

    // ドラッグ終了時の処理を行う
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        const activeData = active.data.current; // {type: 'shop' | 'grid',...}
        if (!activeData) return;

        // ドロップ先に何もない場合
        if (!over) {
            // グリッド上のアイテムを外にドロップした場合は削除する
            if (activeData.type === 'grid') {
                setPlacedItems((prev) => {
                    const removed = prev.filter(p => p.id !== activeData.id);
                    // バッグを削除した場合、バッグ外に出たアイテムも削除
                    return cleanupItemsOutsideBags(removed);
                });
            }
            return;
        }

        const x = over.data.current?.x;
        const y = over.data.current?.y;
        if (x === undefined || y === undefined) return;

        // 配置しようとしているアイテムの情報を取得
        const item: ItemData | undefined = activeData.type === 'shop'
            ? activeData.item
            : ITEMS.find(d => d.id === activeData.item.id);
        if (!item) return;

        // グリッド上のアイテムなら現在の回転角度を、ショップなら0度を取得
        let currentRotation: 0 | 90 | 180 | 270 = 0;
        if (activeData.type === 'grid') {
            const existingItem = placedItems.find(p => p.id === activeData.id);
            if (existingItem) currentRotation = existingItem.rotation;
        }

        const newCells = getOccupiedCells(item.shape, x, y, currentRotation);

        // 境界判定
        if (isOutOfBounds(newCells, GRID_COLS, GRID_ROWS)) {
            if (activeData.type === 'grid') {
                setPlacedItems((prev) => {
                    const removed = prev.filter(p => p.id !== activeData.id);
                    return cleanupItemsOutsideBags(removed);
                });
            }
            return;
        }

        // バッグ以外のアイテムはバッグセル上にしか置けない
        const isBagItem = item.tags.includes('bag');
        if (!isBagItem) {
            // 移動中のアイテム自身を除いた placedItems でバッグセルを計算
            const ignoreId = activeData.type === 'grid' ? activeData.id : undefined;
            const itemsForBagCheck = ignoreId
                ? placedItems.filter(p => p.id !== ignoreId)
                : placedItems;
            const bagCells = getBagCells(itemsForBagCheck, ITEMS);

            if (!isOnBagCells(newCells, bagCells)) {
                // バッグ外にはドロップできない: ドラッグ中に回転していた場合は元の回転に戻す
                const saved = preDragRotationRef.current;
                if (activeData.type === 'grid' && saved !== null && saved.id === activeData.id) {
                    const savedRotation = saved.rotation;
                    setPlacedItems(prev => prev.map(p =>
                        p.id === activeData.id ? { ...p, rotation: savedRotation } : p
                    ));
                }
                preDragRotationRef.current = null;
                return;
            }
        }

        // 衝突判定(重なったアイテムのIDを取得)
        // バッグは「床レイヤー」、通常アイテムは「アイテムレイヤー」として
        // 同じレイヤー内のアイテムのみを対象にする
        const ignoreId = activeData.type === 'grid' ? activeData.id : undefined;
        const sameLayerItems = placedItems.filter(p => {
            const d = ITEMS.find(i => i.id === p.itemId);
            return isBagItem ? d?.tags.includes('bag') : !d?.tags.includes('bag');
        });
        const overlappingIds = getOverlappingItems(newCells, sameLayerItems, ITEMS, ignoreId);

        // 実際に状態の更新
        setPlacedItems((prev) => {
            const filtered = prev.filter(p => !overlappingIds.includes(p.id));

            let newItems: PlacedItem[];
            if (activeData.type === 'shop') {
                const newItem: PlacedItem = {
                    id: `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    itemId: item.id,
                    position: { x, y },
                    rotation: 0,
                };
                newItems = [...filtered, newItem];
            } else {
                newItems = filtered.map(p =>
                    p.id === activeData.id ? { ...p, position: { x, y } } : p
                );
            }

            // バッグを移動した場合、バッグ外に出たアイテムを削除
            return cleanupItemsOutsideBags(newItems);
        });
        preDragRotationRef.current = null;
        setDragOverlayItem(null);
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
                <h1 className="text-3xl font-bold mb-8">Backpack Battles Simulator</h1>

                <div className="flex flex-row gap-12 items-start">
                    {/* 左側にバックパックエリアを設定 */}
                    <div className="flex flex-col items-center gap-4">
                        <h2 className="text-xl font-semibold">BackPack Area</h2>
                        <BackpackGrid
                            rows={GRID_ROWS}
                            cols={GRID_COLS}
                            placedItems={placedItems}
                            itemsData={ITEMS}
                            litStars={litStars}
                            onRotate={handleRotate}
                        />
                        {/* リセットボタン */}
                        <button
                            onClick={handleReset}
                            className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                            リセット（バッグ以外を削除）
                        </button>
                        <p className="text-xs text-slate-400">
                            右クリック: アイテムを回転 | 暗いマス: バッグ未配置（アイテム不可）
                        </p>
                    </div>

                    {/* 右側にはアイテムリストを表示 */}
                    <div className="flex flex-col items-center gap-4">
                        <h2 className="text-xl font-semibold">Item List</h2>
                        <div className="flex flex-wrap gap-4 max-w-md">
                            {ITEMS.map((item) => (
                                <DraggableShopItem key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* ショップからドラッグ中: アイテムを実際のサイズで展開表示 */}
            <DragOverlay dropAnimation={null}>
                {dragOverlayItem && (() => {
                    const cols = getShapeCols(dragOverlayItem.shape);
                    const rows = dragOverlayItem.shape.length;
                    const width  = cols * CELL_SIZE + (cols - 1) * GAP_SIZE;
                    const height = rows * CELL_SIZE + (rows - 1) * GAP_SIZE;
                    const visualCellSet = new Set(
                        getOccupiedCells(dragOverlayItem.shape, 0, 0, 0).map(p => `${p.x},${p.y}`)
                    );
                    return (
                        <div style={{ width, height, position: 'relative', pointerEvents: 'none' }}>
                            {Array.from({ length: rows * cols }, (_, i) => {
                                const vx = i % cols;
                                const vy = Math.floor(i / cols);
                                if (!visualCellSet.has(`${vx},${vy}`)) return null;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: vx * (CELL_SIZE + GAP_SIZE),
                                            top: vy * (CELL_SIZE + GAP_SIZE),
                                            width: CELL_SIZE,
                                            height: CELL_SIZE,
                                            backgroundColor: dragOverlayItem.color,
                                            opacity: 0.85,
                                            borderRadius: 4,
                                        }}
                                    />
                                );
                            })}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            }}>
                                {dragOverlayItem.name}
                            </div>
                        </div>
                    );
                })()}
            </DragOverlay>
        </DndContext>
    );
}
