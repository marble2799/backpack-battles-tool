// 座標を表す型
export type Point = {
    x: number;
    y: number;
};

export type Rotation = 0 | 90 | 180 | 270;

// 星が光る条件
// 星のセルに条件を満たすアイテムが置かれているとき点灯
// tags:      ItemData.tags との OR 判定（いずれか1つでも一致すれば点灯）
// attribute: ItemData.attributes との判定（tags と OR）
export interface StarCondition {
    tags?: string[];    // ItemData.tags のいずれかに一致するタグ（OR条件）
    attribute?: string; // ItemData.attributes に含まれる属性で判定
}

// アイテム上の星マーク定義
export interface StarDefinition {
    // rotation=0 のときの、アイテム左上を(0,0)とした視覚セル座標 (x=col, y=row)
    relativePos: Point;
    // 他の回転での視覚セル座標（省略すると relativePos を回転で自動計算）
    relativePosOverrides?: Partial<Record<90 | 180 | 270, Point>>;
    condition: StarCondition;
}

// data.ts での入力用: 同じ condition の星を配列でまとめて指定できる短縮形
// relativePos に { x: number[], y: number[] } を渡すと、各インデックスが1つの星に展開される
// 例: { relativePos: { x: [0, 0], y: [-1, 3] }, condition: ... }
//     → { relativePos: { x: 0, y: -1 }, condition: ... }
//     → { relativePos: { x: 0, y:  3 }, condition: ... }  の2つに展開
export type StarDefinitionInput = {
    relativePos: Point | { x: number[]; y: number[] };
    relativePosOverrides?: Partial<Record<90 | 180 | 270, Point>>;
    condition: StarCondition;
};

// アイテムの構造体
export interface ItemData {
    id: string;
    name: string;
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
