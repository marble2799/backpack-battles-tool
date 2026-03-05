// 座標を表す型
export type Point = {
    x: number;
    y: number;
};

export type StarConditionType = 'adjacent_tag';

export interface StarCondition {
    type: StarConditionType;
    tag: string;
}

// アイテム上の星マーク定義
export interface StarDefinition {
    relativePos: Point; // shape空間での相対座標 (x=col, y=row)
    condition: StarCondition;
}

// アイテムの構造体
export interface ItemData {
    id: string;
    name: string;
    icon: string;
    shape: number[][];
    color: string;
    tags: string[];       // e.g. ["weapon", "sword"], ["bag"]
    stars?: StarDefinition[];
}

// 置かれたアイテムの構造体
export interface PlacedItem {
    id: string;
    itemId: string;
    position: Point;
    rotation: 0 | 90 | 180 | 270;
}
