import { ItemData } from "./types";

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
        stars: [
            // 中央セルの右隣 (rotation=0: 右, 90: 下, 180: 左, 270: 上 — 数学的回転で自動計算)
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
            // 上端セルの上 (rotation=0: 上, 90: 右, 180: 下, 270: 左 — 数学的回転で自動計算)
            {
                relativePos: { x: 0, y: -1 },
                condition: { type: "at_position", tag: "weapon" },
            },
            // 下端セルの下 (rotation=0: 下, 90: 左, 180: 上, 270: 右)
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
            // 左上セルの左隣 (rotation=0: 左, 90: 上, 180: 右, 270: 下 — 数学的回転で自動計算)
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
            // 左端セルの左隣 (rotation=0: 左, 90: 上, 180: 右, 270: 下 — 数学的回転で自動計算)
            { relativePos: { x: -1, y: 0 }, condition: { type: "at_position", tag: "potion" } },
        ],
    },
];
