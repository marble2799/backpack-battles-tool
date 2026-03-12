import { ItemData, StarDefinition, StarDefinitionInput } from "./types";

// 配列記法の StarDefinitionInput を StarDefinition[] に展開するヘルパー
function expandStars(inputs: StarDefinitionInput[]): StarDefinition[] {
    return inputs.flatMap(({ relativePos, ...rest }) => {
        if (Array.isArray((relativePos as { x: number[]; y: number[] }).x)) {
            const { x: xs, y: ys } = relativePos as { x: number[]; y: number[] };
            return xs.map((x, i) => ({ relativePos: { x, y: ys[i] }, ...rest }));
        }
        return [{ relativePos: relativePos as { x: number; y: number }, ...rest }];
    });
}

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
//   カテゴリ: "no_cooltime", "bag"
//   種類:     "weapon", "shield", "potion", "food"
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

// ==== タグ名 ====
const no_cooltime = "no_cooltime";
const weapon = "weapon";
const shield = "shield";
const potion = "potion";
const food = "food";
const bag = "bag";
const empty = "empty";

// ==== 属性名 ====
const nature = "nature";

export const ITEMS: ItemData[] = [
    // ===== バッグ系 =====
    {
        id: "starter_bag",
        name: "ノーマルバッグ",
        icon: "bag",
        shape: [
            [1, 1],
            [1, 1],
        ],
        color: "#92400e",
        tags: [bag],
    },
    {
        id: "small_bag",
        name: "ウェストポーチ",
        icon: "bag",
        shape: [
            [1, 1],
        ],
        color: "#78350f",
        tags: [bag],
    },
    // ===== 武器系 =====
    {
        id: "wooden_sword",
        name: "木の剣",
        icon: "sword",
        shape: [
            [1],
            [1],
        ],
        color: "#fbbf24",
        tags: [weapon],
        // 属性例: attributes: ["fire"],  ← 炎属性を付与する場合
        stars: [],
    },
    {
        id: "pan",
        name: "フライパン",
        icon: "pan",
        shape: [
            [1],
            [1,1],
        ],
        color: "#101010",
        tags: [weapon],
        stars: expandStars([
            {
                relativePos: {x: [0, -1, 1, -1, 2, 0, 1], y: [-1, 0, 0, 1, 1, 2, 2]},
                condition: {type: "at_position", tag: food},
            }
        ])
    },
    {
        id: "broom",
        name: "ほうき",
        icon: "broom",
        shape: [
            [1],
            [1],
            [1],
            [1],
        ],
        color: "#734e30",
        tags: [weapon],
        stars:[],
    },
    {
        id: "hammer",
        name: "ハンマー",
        icon: "hammer",
        shape: [
            [1, 1, 1],
            [1],
            [1],
        ],
        color: "#c9caca",
        tags: [weapon],
        stars:[],
    },
    {
        id: "spear",
        name: "スピア",
        icon: "spear",
        shape: [
            [1],
            [1],
            [1],
            [1],
        ],
        color: "#FF0000",
        tags: [weapon],
        stars:expandStars([
            {
                relativePos: {x: [0,0,0,0,0],y: [-1, -2, -3, -4, -5]},
                condition: {type:"at_position", tag: empty}
            }
        ])
    },
    {
        id: "dagger",
        name: "ダガー",
        icon: "dagger",
        shape: [
            [1],
            [1],
        ],
        color: "#707070",
        tags: [weapon],
        stars:[],
    },
    {
        id: "iron_sword",
        name: "鉄の剣(仮)",
        icon: "sword",
        shape: [
            [1],
            [1],
        ],
        color: "#6b7280",
        tags: [weapon],
        stars: expandStars([
            // 上端セルの上・下端セルの下 (rotation=0 基準)
            // 条件: "weapon" タグのアイテムが星位置に置かれると光る
            {
                relativePos: { x: [0, 0], y: [-1, 3] },
                condition: { type: "at_position", tag: weapon },
            },
        ]),
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
        tags: [shield],
        stars: [],
    },
    // ===== 消耗品系 =====
    {
        id: "healing_potion",
        name: "回復ポーション",
        icon: "potion",
        shape: [[1, 1]],
        color: "#ef4444",
        tags: [no_cooltime, potion],
        stars: [
            // 1×1なので回転しても見た目が変わらない → 常に1マス上
            // 条件: "potion" タグのアイテムが星位置に置かれると光る
            {
                relativePos: { x: 0, y: -1 },
                relativePosOverrides: {
                    90:  { x: 0, y: -1 },
                    180: { x: 1, y: -1 },
                    270: { x: 0, y: -1 },
                },
                condition: { type: "at_position", tag: potion },
            },
        ],
    },
    {
        id: "herb",
        name: "ハーブ",
        icon: "herb",
        shape: [[1]],
        color: "#22c55e",
        tags: [no_cooltime],
        stars: [],
    },
];
