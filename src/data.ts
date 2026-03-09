import { ItemData } from "./types";

// ============================================================
// アイテムデータ定義
//
// 各アイテムの stars フィールドで「星が光る条件」を設定します。
//
// 【条件の書き方】
//   condition: { type: "at_position", tag: "タグ名" }
//     → 星の位置に ItemData.tags に "タグ名" を含むアイテムが置かれると光る
//
//   condition: { type: "at_position", attribute: "属性名" }
//     → 星の位置に ItemData.attributes に "属性名" を含むアイテムが置かれると光る
//
//   tag と attribute を両方指定した場合はどちらかが一致すれば光る（OR条件）
//
// 【使用できるタグ一覧】(tags フィールド)
//   カテゴリ: "weapon", "armor", "consumable", "bag"
//   種類:     "sword", "shield", "potion", "herb"
//
// 【使用できる属性一覧】(attributes フィールド)
//   ゲーム属性: "mana", "fire", "water", "dark", "light"
//   ※ 属性はアイテムの attributes フィールドに追加することで付与できます
//
// 【星の位置の書き方】
//   relativePos: { x, y }
//     アイテム左上を(0,0)とした座標。アイテム外のセルも指定可能。
//     例: アイテム(1×3)の左隣 → x: -1, y: 0
// ============================================================

export const ITEMS: ItemData[] = [
    // ===== バッグ系 =====
    {
        id: "starter_bag",
        name: "スターターバッグ",
        icon: "bag",
        shape: [
            [1, 1, 1, 1],
            [1, 1, 1, 1],
            [1, 1, 1, 1],
        ],
        color: "#92400e",
        tags: ["bag"],
    },
    {
        id: "small_bag",
        name: "小さなバッグ",
        icon: "bag",
        shape: [
            [1, 1],
            [1, 1],
        ],
        color: "#78350f",
        tags: ["bag"],
    },
    // ===== 武器系 =====
    {
        id: "wooden_sword",
        name: "木の剣",
        icon: "sword",
        shape: [
            [1],
            [1],
            [1],
        ],
        color: "#fbbf24",
        tags: ["weapon", "sword"],
        // 属性例: attributes: ["fire"],  ← 炎属性を付与する場合
        stars: [
            // 中央セルの右隣 (rotation=0: 右, 90: 下, 180: 左, 270: 上)
            // 条件: "armor" タグのアイテムが星位置に置かれると光る
            { relativePos: { x: 1, y: 1 }, condition: { type: "at_position", tag: "armor" } },
        ],
    },
    {
        id: "iron_sword",
        name: "鉄の剣",
        icon: "sword",
        shape: [
            [1],
            [1],
            [1],
        ],
        color: "#6b7280",
        tags: ["weapon", "sword"],
        stars: [
            // 上端セルの上 (rotation=0: 上, 90: 右, 180: 下, 270: 左)
            // 条件: "weapon" タグのアイテムが星位置に置かれると光る
            {
                relativePos: { x: 0, y: -1 },
                condition: { type: "at_position", tag: "weapon" },
            },
            // 下端セルの下 (rotation=0: 下, 90: 左, 180: 上, 270: 右)
            // 条件: "weapon" タグのアイテムが星位置に置かれると光る
            {
                relativePos: { x: 0, y: 3 },
                condition: { type: "at_position", tag: "weapon" },
            },
        ],
    },
    // ===== 防具系 =====
    {
        id: "wooden_shield",
        name: "木の盾",
        icon: "shield",
        shape: [
            [1, 1],
            [1, 1],
        ],
        color: "#9ca3af",
        tags: ["armor", "shield"],
        stars: [
            // 左上セルの左隣 (rotation=0: 左, 90: 上, 180: 右, 270: 下)
            // 条件: "weapon" タグのアイテムが星位置に置かれると光る
            { relativePos: { x: -1, y: 0 }, condition: { type: "at_position", tag: "weapon" } },
        ],
    },
    // ===== 消耗品系 =====
    {
        id: "healing_potion",
        name: "回復ポーション",
        icon: "potion",
        shape: [[1]],
        color: "#ef4444",
        tags: ["consumable", "potion"],
        stars: [
            // 1×1なので回転しても見た目が変わらない → 常に1マス上
            // 条件: "potion" タグのアイテムが星位置に置かれると光る
            {
                relativePos: { x: 0, y: -1 },
                relativePosOverrides: {
                    90:  { x: 0, y: -1 },
                    180: { x: 0, y: -1 },
                    270: { x: 0, y: -1 },
                },
                condition: { type: "at_position", tag: "potion" },
            },
        ],
    },
    {
        id: "herb",
        name: "薬草",
        icon: "herb",
        shape: [[1, 1]],
        color: "#22c55e",
        tags: ["consumable", "herb"],
        stars: [
            // 左端セルの左隣 (rotation=0: 左, 90: 上, 180: 右, 270: 下)
            // 条件: "potion" タグのアイテムが星位置に置かれると光る
            { relativePos: { x: -1, y: 0 }, condition: { type: "at_position", tag: "potion" } },
        ],
    },
];
