import { describe, it, expect } from 'vitest';
import {
    getOccupiedCells,
    isOutOfBounds,
    getOverlappingItems,
    getBagCells,
    isOnBagCells,
    computeLitStars,
} from '../grid';
import { ItemData, PlacedItem } from '../../types';

// ===== テスト用データ =====

const SWORD: ItemData = {
    id: 'sword',
    name: '剣',
    icon: 'sword',
    shape: [[1], [1], [1]], // 縦1x3
    color: '#fff',
    tags: ['weapon', 'sword'],
    stars: [
        { relativePos: { x: 0, y: 1 }, condition: { type: 'adjacent_tag', tag: 'armor' } },
    ],
};

const SHIELD: ItemData = {
    id: 'shield',
    name: '盾',
    icon: 'shield',
    shape: [[1, 1], [1, 1]], // 2x2
    color: '#fff',
    tags: ['armor', 'shield'],
    stars: [
        { relativePos: { x: 0, y: 0 }, condition: { type: 'adjacent_tag', tag: 'weapon' } },
    ],
};

const BAG: ItemData = {
    id: 'bag',
    name: 'バッグ',
    icon: 'bag',
    shape: [[1, 1, 1], [1, 1, 1]], // 3x2
    color: '#fff',
    tags: ['bag'],
};

const POTION: ItemData = {
    id: 'potion',
    name: 'ポーション',
    icon: 'potion',
    shape: [[1]],
    color: '#f00',
    tags: ['consumable', 'potion'],
    stars: [
        { relativePos: { x: 0, y: 0 }, condition: { type: 'adjacent_tag', tag: 'potion' } },
    ],
};

const ALL_ITEMS = [SWORD, SHIELD, BAG, POTION];

// ===== getOccupiedCells テスト =====

describe('getOccupiedCells', () => {
    it('rotation=0 で縦アイテムの座標を正しく返す', () => {
        const cells = getOccupiedCells(SWORD.shape, 2, 3, 0);
        expect(cells).toEqual([
            { x: 2, y: 3 },
            { x: 2, y: 4 },
            { x: 2, y: 5 },
        ]);
    });

    it('rotation=90 で縦アイテムが横向きになる', () => {
        // shape=[[1],[1],[1]], rows=3, cols=1
        // rotation=90: rotX = rows-1-r = 2-r, rotY = c
        // (r=0,c=0) -> rotX=2, rotY=0
        // (r=1,c=0) -> rotX=1, rotY=0
        // (r=2,c=0) -> rotX=0, rotY=0
        const cells = getOccupiedCells(SWORD.shape, 0, 0, 90);
        expect(cells).toHaveLength(3);
        expect(cells).toContainEqual({ x: 2, y: 0 });
        expect(cells).toContainEqual({ x: 1, y: 0 });
        expect(cells).toContainEqual({ x: 0, y: 0 });
    });

    it('rotation=180 で縦アイテムが逆順になる', () => {
        const cells = getOccupiedCells(SWORD.shape, 0, 0, 180);
        // (r=0,c=0) -> rotX=cols-1-0=0, rotY=rows-1-0=2 -> (0,2)
        // (r=1,c=0) -> rotX=0, rotY=1 -> (0,1)
        // (r=2,c=0) -> rotX=0, rotY=0 -> (0,0)
        expect(cells).toContainEqual({ x: 0, y: 0 });
        expect(cells).toContainEqual({ x: 0, y: 1 });
        expect(cells).toContainEqual({ x: 0, y: 2 });
    });

    it('2x2 アイテムの座標を正しく返す', () => {
        const cells = getOccupiedCells(SHIELD.shape, 1, 1, 0);
        expect(cells).toEqual([
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ]);
    });
});

// ===== isOutOfBounds テスト =====

describe('isOutOfBounds', () => {
    it('グリッド内に収まる場合はfalseを返す', () => {
        const cells = [{ x: 0, y: 0 }, { x: 8, y: 6 }];
        expect(isOutOfBounds(cells, 9, 7)).toBe(false);
    });

    it('x が gridCols 以上の場合はtrueを返す', () => {
        const cells = [{ x: 9, y: 0 }];
        expect(isOutOfBounds(cells, 9, 7)).toBe(true);
    });

    it('y が負の場合はtrueを返す', () => {
        const cells = [{ x: 0, y: -1 }];
        expect(isOutOfBounds(cells, 9, 7)).toBe(true);
    });
});

// ===== getOverlappingItems テスト =====

describe('getOverlappingItems', () => {
    const placed: PlacedItem = {
        id: 'shield-1',
        itemId: 'shield',
        position: { x: 0, y: 0 },
        rotation: 0,
    };

    it('重なりがない場合は空配列を返す', () => {
        const newCells = [{ x: 5, y: 5 }];
        const result = getOverlappingItems(newCells, [placed], ALL_ITEMS);
        expect(result).toEqual([]);
    });

    it('重なりがある場合は対象のIDを返す', () => {
        // shield は (0,0), (1,0), (0,1), (1,1) を占有
        const newCells = [{ x: 1, y: 1 }];
        const result = getOverlappingItems(newCells, [placed], ALL_ITEMS);
        expect(result).toContain('shield-1');
    });

    it('ignoreInstanceId を指定すると自分自身を無視する', () => {
        const newCells = [{ x: 0, y: 0 }];
        const result = getOverlappingItems(newCells, [placed], ALL_ITEMS, 'shield-1');
        expect(result).toEqual([]);
    });
});

// ===== getBagCells テスト =====

describe('getBagCells', () => {
    it('バッグアイテムのセルを正しく返す', () => {
        const placedBag: PlacedItem = {
            id: 'bag-1',
            itemId: 'bag',
            position: { x: 0, y: 0 },
            rotation: 0,
        };
        const bagCells = getBagCells([placedBag], ALL_ITEMS);
        // BAG shape は 3x2: (0,0),(1,0),(2,0),(0,1),(1,1),(2,1)
        expect(bagCells.size).toBe(6);
        expect(bagCells.has('0,0')).toBe(true);
        expect(bagCells.has('2,1')).toBe(true);
    });

    it('バッグ以外のアイテムは無視する', () => {
        const placedSword: PlacedItem = {
            id: 'sword-1',
            itemId: 'sword',
            position: { x: 0, y: 0 },
            rotation: 0,
        };
        const bagCells = getBagCells([placedSword], ALL_ITEMS);
        expect(bagCells.size).toBe(0);
    });
});

// ===== isOnBagCells テスト =====

describe('isOnBagCells', () => {
    const bagCells = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']);

    it('すべてのセルがバッグセル内ならtrueを返す', () => {
        expect(isOnBagCells([{ x: 0, y: 0 }, { x: 1, y: 0 }], bagCells)).toBe(true);
    });

    it('1つでもバッグセル外ならfalseを返す', () => {
        expect(isOnBagCells([{ x: 0, y: 0 }, { x: 3, y: 0 }], bagCells)).toBe(false);
    });
});

// ===== computeLitStars テスト =====

describe('computeLitStars', () => {
    it('条件を満たす隣接アイテムがない場合は空のセットを返す', () => {
        const placedSword: PlacedItem = {
            id: 'sword-1', itemId: 'sword', position: { x: 0, y: 0 }, rotation: 0,
        };
        const lit = computeLitStars([placedSword], ALL_ITEMS);
        expect(lit.size).toBe(0);
    });

    it('剣の隣に盾があれば剣の星が点灯する', () => {
        // sword at (0,0): occupies (0,0),(0,1),(0,2) — star at (0,1) = abs (0,1)
        // shield at (1,1): occupies (1,1),(2,1),(1,2),(2,2)
        // Adjacent to (0,1): right=(1,1) which is part of shield → condition tag 'armor' ✓
        const placedSword: PlacedItem = {
            id: 'sword-1', itemId: 'sword', position: { x: 0, y: 0 }, rotation: 0,
        };
        const placedShield: PlacedItem = {
            id: 'shield-1', itemId: 'shield', position: { x: 1, y: 1 }, rotation: 0,
        };
        const lit = computeLitStars([placedSword, placedShield], ALL_ITEMS);
        expect(lit.has('sword-1-0')).toBe(true);
    });

    it('盾の隣に剣があれば盾の星が点灯する', () => {
        // shield at (2,0): occupies (2,0),(3,0),(2,1),(3,1) — star at (2,0) = abs (2,0)
        // sword at (0,0): occupies (0,0),(0,1),(0,2) — no adjacency to (2,0)
        // sword at (1,0): occupies (1,0),(1,1),(1,2) — adjacent to (2,0) is (1,0) ✓ tag 'weapon'
        const placedShield: PlacedItem = {
            id: 'shield-1', itemId: 'shield', position: { x: 2, y: 0 }, rotation: 0,
        };
        const placedSword: PlacedItem = {
            id: 'sword-1', itemId: 'sword', position: { x: 1, y: 0 }, rotation: 0,
        };
        const lit = computeLitStars([placedShield, placedSword], ALL_ITEMS);
        expect(lit.has('shield-1-0')).toBe(true);
    });

    it('同じアイテム自身のセルは条件判定に使わない', () => {
        // potion の star は "隣接ポーション" が必要 — 自分自身は除外される
        const placedPotion: PlacedItem = {
            id: 'potion-1', itemId: 'potion', position: { x: 0, y: 0 }, rotation: 0,
        };
        const lit = computeLitStars([placedPotion], ALL_ITEMS);
        expect(lit.has('potion-1-0')).toBe(false);
    });

    it('ポーション同士が隣接すれば両方の星が点灯する', () => {
        const potion1: PlacedItem = {
            id: 'potion-1', itemId: 'potion', position: { x: 0, y: 0 }, rotation: 0,
        };
        const potion2: PlacedItem = {
            id: 'potion-2', itemId: 'potion', position: { x: 1, y: 0 }, rotation: 0,
        };
        const lit = computeLitStars([potion1, potion2], ALL_ITEMS);
        expect(lit.has('potion-1-0')).toBe(true);
        expect(lit.has('potion-2-0')).toBe(true);
    });

    it('回転した剣の星も正しく計算される', () => {
        // sword rotation=90: shape[[1],[1],[1]], rows=3, cols=1
        // star at relativePos {x:0,y:1}
        // rotation=90: rotX=rows-1-r=3-1-1=1, rotY=c=0 → star abs pos = (startX+1, startY+0)
        // sword at (0,0) rotated 90: star at abs (1,0)
        // shield at (1,1): occupies (1,1),(2,1),(1,2),(2,2)
        // Adjacent to (1,0): down=(1,1) which has shield tag 'armor' ✓
        const placedSword: PlacedItem = {
            id: 'sword-1', itemId: 'sword', position: { x: 0, y: 0 }, rotation: 90,
        };
        const placedShield: PlacedItem = {
            id: 'shield-1', itemId: 'shield', position: { x: 1, y: 1 }, rotation: 0,
        };
        const lit = computeLitStars([placedSword, placedShield], ALL_ITEMS);
        expect(lit.has('sword-1-0')).toBe(true);
    });

    it('隣接していても条件タグが違えば点灯しない', () => {
        // sword star requires 'armor' — placing another sword next to it should not light it
        const sword1: PlacedItem = {
            id: 'sword-1', itemId: 'sword', position: { x: 0, y: 0 }, rotation: 0,
        };
        const sword2: PlacedItem = {
            id: 'sword-2', itemId: 'sword', position: { x: 1, y: 1 }, rotation: 0,
        };
        const lit = computeLitStars([sword1, sword2], ALL_ITEMS);
        expect(lit.has('sword-1-0')).toBe(false);
    });
});
