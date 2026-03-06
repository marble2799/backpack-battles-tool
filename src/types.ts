// 座標を表す型
export type Point = {
    x: number;
    y: number;
};

export type Rotation = 0 | 90 | 180 | 270;

export type StarConditionType = 'adjacent_tag';

export interface StarCondition {
    type: StarConditionType;
    tag: string;
}

// アイテム上の星マーク定義
export interface StarDefinition {
    // rotation=0 のときの、アイテム左上を(0,0)とした視覚セル座標 (x=col, y=row)
    relativePos: Point;
    // 他の回転での視覚セル座標（省略すると relativePos を数学的回転変換で自動計算）
    relativePosOverrides?: Partial<Record<90 | 180 | 270, Point>>;
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
