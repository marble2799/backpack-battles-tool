"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDndMonitor } from "@dnd-kit/core";
import { DroppableCell } from "./DroppableCell";
import { PlacedItem, ItemData } from '../types';
import { DraggableGridItem } from "./DraggableGridItem";
import { CELL_SIZE, GAP_SIZE, GRID_PADDING } from "../constants";
import { getBagCells, getStarAbsolutePos } from "../utils/grid";

interface BackpackGridProps {
    rows: number;
    cols: number;
    placedItems: PlacedItem[];  // 配置済みのアイテムの一覧
    itemsData: ItemData[];      // アイコン表示用のマスターデータ
    litStars: Set<string>;      // 点灯している星のIDセット ("placedItemId-starIndex")

    // Method
    onRotate(instanceId: string): void;
}

export const BackpackGrid: React.FC<BackpackGridProps> = ({ rows, cols, placedItems, itemsData, litStars, onRotate }) => {
    const cells = Array.from({ length: rows * cols });

    // ドラッグ中のアイテムID と 移動量を追跡
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useDndMonitor({
        onDragStart: (event) => {
            const id = event.active.id.toString();
            // "grid-item-{placedItemId}" 形式のみ対象
            if (id.startsWith('grid-item-')) {
                setDraggingItemId(id.replace('grid-item-', ''));
            }
            setDragDelta({ x: 0, y: 0 });
        },
        onDragMove: (event) => {
            setDragDelta({ x: event.delta.x, y: event.delta.y });
        },
        onDragEnd: () => { setDraggingItemId(null); setDragDelta({ x: 0, y: 0 }); },
        onDragCancel: () => { setDraggingItemId(null); setDragDelta({ x: 0, y: 0 }); },
    });

    // refs: stale closure を避けるためネイティブリスナー内から最新値を参照する
    const draggingItemIdRef = useRef<string | null>(null);
    const onRotateRef = useRef(onRotate);
    useEffect(() => { draggingItemIdRef.current = draggingItemId; }, [draggingItemId]);
    useEffect(() => { onRotateRef.current = onRotate; });

    // 右クリック回転: DragOverlay 導入後は React 合成イベントに届かないため
    // document の capture フェーズでネイティブリスナーとして処理する
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 2 || !draggingItemIdRef.current) return;
            e.preventDefault();
            onRotateRef.current(draggingItemIdRef.current);
        };
        const onContextMenu = (e: MouseEvent) => {
            // ドラッグ中はブラウザのコンテキストメニューを常に抑制
            if (draggingItemIdRef.current) e.preventDefault();
        };
        document.addEventListener('mousedown', onMouseDown, { capture: true });
        document.addEventListener('contextmenu', onContextMenu, { capture: true });
        return () => {
            document.removeEventListener('mousedown', onMouseDown, { capture: true });
            document.removeEventListener('contextmenu', onContextMenu, { capture: true });
        };
    }, []);

    // バッグアイテムが覆っているセルの集合を計算
    const bagCells = getBagCells(placedItems, itemsData);

    // セル座標 → ピクセル座標 (セル左上)
    const cellToPixel = (gx: number, gy: number) => ({
        left: gx * (CELL_SIZE + GAP_SIZE) + GRID_PADDING,
        top:  gy * (CELL_SIZE + GAP_SIZE) + GRID_PADDING,
    });

    return (
        <div
            className="relative bg-slate-800 rounded-lg border-2 border-slate-600"
            style={{
                width: cols * CELL_SIZE + (cols - 1) * GAP_SIZE + GRID_PADDING * 2,
                height: rows * CELL_SIZE + (rows - 1) * GAP_SIZE + GRID_PADDING * 2,
                padding: GRID_PADDING,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
                gap: `${GAP_SIZE}px`,
            }}
        >
            {/* マス目の描画 */}
            {cells.map((_, index) => {
                const x = index % cols;
                const y = Math.floor(index / cols);
                const isBagCell = bagCells.has(`${x},${y}`);
                return <DroppableCell key={`${x}-${y}`} x={x} y={y} isBagCell={isBagCell} />;
            })}

            {/* 配置済みアイテムの描画 */}
            {placedItems.map((placed) => {
                const itemData = itemsData.find(d => d.id === placed.itemId);
                if (!itemData) return null;
                return (
                    <DraggableGridItem
                        key={placed.id}
                        placedItem={placed}
                        itemData={itemData}
                        isBag={itemData.tags.includes('bag')}
                    />
                );
            })}

            {/* 星マークの描画 (アイテム外側のグリッドセルに絶対配置) */}
            {placedItems.flatMap((placed) => {
                const itemData = itemsData.find(d => d.id === placed.itemId);
                if (!itemData?.stars) return [];

                const isDraggingThis = placed.id === draggingItemId;
                const offsetX = isDraggingThis ? dragDelta.x : 0;
                const offsetY = isDraggingThis ? dragDelta.y : 0;

                return itemData.stars.map((star, starIndex) => {
                    const absPos = getStarAbsolutePos(
                        star, itemData.shape,
                        placed.position.x, placed.position.y,
                        placed.rotation,
                    );

                    // ドラッグ中でない場合、グリッド範囲外の星は描画しない
                    if (!isDraggingThis && (absPos.x < 0 || absPos.x >= cols || absPos.y < 0 || absPos.y >= rows)) {
                        return null;
                    }

                    const isLit = litStars.has(`${placed.id}-${starIndex}`);
                    const { left, top } = cellToPixel(absPos.x, absPos.y);

                    return (
                        <div
                            key={`star-${placed.id}-${starIndex}`}
                            style={{
                                position: 'absolute',
                                left: `${left + offsetX}px`,
                                top: `${top + offsetY}px`,
                                width: `${CELL_SIZE}px`,
                                height: `${CELL_SIZE}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                lineHeight: 1,
                                zIndex: isDraggingThis ? 110 : 20,
                                pointerEvents: 'none',
                                filter: isLit ? 'none' : 'brightness(0.35) saturate(0.4) opacity(80%)',
                            }}
                        >
                            ⭐
                        </div>
                    );
                });
            })}
        </div>
    );
};
