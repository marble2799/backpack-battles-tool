// 座標を表す型
export type Point = {
    x: number;
    y: number;
};

export type Rotation = 0 | 90 | 180 | 270;

// 星が光る条件タイプ（将来の拡張用: 'adjacent', 'count' なども追加可能）
// 'at_position': 星のセルに条件を満たすアイテムが置かれているとき点灯
export type StarConditionType = 'at_position';

// 星が光る条件
// tag と attribute はどちらか一方、または両方を指定できる（OR条件）
// tag:       ItemData.tags に含まれるカテゴリ/種類（例: "weapon", "armor", "potion"）
// attribute: ItemData.attributes に含まれるゲーム属性（例: "mana", "fire", "water"）
export interface StarCondition {
    type: StarConditionType;
    tag?: string;       // ItemData.tags に含まれるタグで判定
    attribute?: string; // ItemData.attributes に含まれる属性で判定
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
    // カテゴリ/種類: weapon, sword, armor, shield, potion, herb, consumable, bag など
    tags: string[];
    // ゲーム内属性: mana, fire, water, dark, light など（StarCondition.attribute で参照）
    attributes?: string[];
    stars?: StarDefinition[];
}

// 置かれたアイテムの構造体
export interface PlacedItem {
    id: string;
    itemId: string;
    position: Point;
    rotation: 0 | 90 | 180 | 270;
}
