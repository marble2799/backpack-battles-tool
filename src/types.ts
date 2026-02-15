// 座標を表す型
export type Point = {
    x: number;
    y: number;
};

// アイテムの構造体
export interface ItemData {
    id: string;
    name: string;
    icon: string;
    shape: number[][];
    color: string;
}

// 置かれたアイテムの構造体
export interface PlacedItem {
    id: string;
    itemId: string;
    position: Point;
    rotation: 0 | 90 | 180 | 270;
}