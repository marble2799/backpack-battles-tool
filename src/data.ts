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
            // 中央マスに隣接する防具があると点灯
            { relativePos: { x: 0, y: 1 }, condition: { type: "adjacent_tag", tag: "armor" } },
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
            // 上マスに隣接する武器があると点灯
            { relativePos: { x: 0, y: 0 }, condition: { type: "adjacent_tag", tag: "weapon" } },
            // 下マスに隣接する武器があると点灯
            { relativePos: { x: 0, y: 2 }, condition: { type: "adjacent_tag", tag: "weapon" } },
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
            // 左上マスに隣接する武器があると点灯
            { relativePos: { x: 0, y: 0 }, condition: { type: "adjacent_tag", tag: "weapon" } },
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
            // 隣接するポーションがあると点灯
            { relativePos: { x: 0, y: 0 }, condition: { type: "adjacent_tag", tag: "potion" } },
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
            // 左マスに隣接するポーションがあると点灯
            { relativePos: { x: 0, y: 0 }, condition: { type: "adjacent_tag", tag: "potion" } },
        ],
    },
];
