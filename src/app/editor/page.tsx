"use client";

import { useState, useCallback, useEffect } from "react";
import { ItemData, StarDefinition } from "@/src/types";

const EDITOR_ROWS = 7;
const EDITOR_COLS = 9;
const CELL_SIZE = 48;
const PASSWORD = "banpick";
const BASE_PATH = "/back-pack-tools";

const AVAILABLE_TAGS = [
  "weapon",
  "shield",
  "potion",
  "food",
  "bag",
  "no_cooltime",
  "empty",
  "scop",
];

type Mode = "item" | "star";
type CellKey = string; // "row,col"

function cellKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

function parseKey(key: CellKey): { row: number; col: number } {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

/** itemCells の左上を (0,0) とした shape 二次元配列を計算する */
function computeShape(itemCells: Set<CellKey>): number[][] {
  if (itemCells.size === 0) return [];

  const coords = Array.from(itemCells).map(parseKey);
  const minRow = Math.min(...coords.map((c) => c.row));
  const maxRow = Math.max(...coords.map((c) => c.row));
  const minCol = Math.min(...coords.map((c) => c.col));
  const maxCol = Math.max(...coords.map((c) => c.col));

  const shape: number[][] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const row: number[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      row.push(itemCells.has(cellKey(r, c)) ? 1 : 0);
    }
    shape.push(row);
  }
  return shape;
}

/** starCells を itemCells の左上を原点とした StarDefinition[] に変換する */
function computeStars(
  itemCells: Set<CellKey>,
  starCells: Set<CellKey>,
  conditionTag: string
): StarDefinition[] {
  if (starCells.size === 0) return [];

  const itemCoords = Array.from(itemCells).map(parseKey);
  const minRow = itemCoords.length > 0 ? Math.min(...itemCoords.map((c) => c.row)) : 0;
  const minCol = itemCoords.length > 0 ? Math.min(...itemCoords.map((c) => c.col)) : 0;

  return Array.from(starCells).map((key) => {
    const { row, col } = parseKey(key);
    return {
      relativePos: { x: col - minCol, y: row - minRow },
      condition: { type: "at_position" as const, tag: conditionTag || undefined },
    };
  });
}

// ---- パスワード認証コンポーネント ----
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem("editor_auth", "1");
      onAuth();
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-lg shadow-lg flex flex-col gap-4 w-80"
      >
        <h1 className="text-white text-xl font-bold text-center">アイテムエディタ</h1>
        <p className="text-slate-400 text-sm text-center">パスワードを入力してください</p>
        <input
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          className="bg-slate-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="パスワード"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center">パスワードが違います</p>}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}

// ---- メインエディタ ----
export default function EditorPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("editor_auth") === "1") {
      setAuthed(true);
    }
  }, []);

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  return <Editor />;
}

function Editor() {
  // フォーム状態
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("item");
  const [conditionTag, setConditionTag] = useState("");

  // グリッド状態
  const [itemCells, setItemCells] = useState<Set<CellKey>>(new Set());
  const [starCells, setStarCells] = useState<Set<CellKey>>(new Set());

  // 登録済みアイテム
  const [registeredItems, setRegisteredItems] = useState<ItemData[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // 初期ロード
  useEffect(() => {
    fetch(`${BASE_PATH}/api/editor/items`)
      .then((r) => r.json())
      .then((items: ItemData[]) => setRegisteredItems(items))
      .catch(() => {});
  }, []);

  const toggleCell = useCallback(
    (row: number, col: number) => {
      const key = cellKey(row, col);
      if (mode === "item") {
        setItemCells((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      } else {
        setStarCells((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    },
    [mode]
  );

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClear = () => {
    setItemCells(new Set());
    setStarCells(new Set());
    setName("");
    setId("");
    setColor("#6b7280");
    setSelectedTags([]);
    setConditionTag("");
    setStatusMessage(null);
  };

  const handleRegister = async () => {
    if (!id.trim() || !name.trim()) {
      setStatusMessage({ text: "名前とIDは必須です", ok: false });
      return;
    }
    if (itemCells.size === 0) {
      setStatusMessage({ text: "アイテムの形を1マス以上選択してください", ok: false });
      return;
    }

    const shape = computeShape(itemCells);
    const stars = computeStars(itemCells, starCells, conditionTag);

    const payload: ItemData = {
      id: id.trim(),
      name: name.trim(),
      shape,
      color,
      tags: selectedTags,
      stars,
    };

    try {
      const res = await fetch(`${BASE_PATH}/api/editor/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created: ItemData = await res.json();
        setRegisteredItems((prev) => [...prev, created]);
        setStatusMessage({ text: `「${created.name}」を登録しました`, ok: true });
        handleClear();
      } else {
        const err = await res.json();
        setStatusMessage({ text: err.error ?? "登録に失敗しました", ok: false });
      }
    } catch {
      setStatusMessage({ text: "通信エラーが発生しました", ok: false });
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/editor/items?id=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRegisteredItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch {
      setStatusMessage({ text: "削除に失敗しました", ok: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">アイテムエディタ</h1>

      <div className="flex flex-wrap gap-6">
        {/* ---- コントロールパネル ---- */}
        <div className="bg-slate-800 rounded-lg p-5 flex flex-col gap-4 w-72">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">名前</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-700 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="アイテム名"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">ID</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="bg-slate-700 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="item_id"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-sm font-mono">{color}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">タグ</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-400">配置モード</label>
            <div className="flex rounded overflow-hidden border border-slate-600">
              <button
                onClick={() => setMode("item")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === "item" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                アイテム
              </button>
              <button
                onClick={() => setMode("star")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === "star" ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                スター ★
              </button>
            </div>
          </div>

          {mode === "star" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">スター条件タグ</label>
              <input
                value={conditionTag}
                onChange={(e) => setConditionTag(e.target.value)}
                className="bg-slate-700 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="weapon / potion / ..."
              />
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleRegister}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              登録
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
            >
              クリア
            </button>
          </div>

          {statusMessage && (
            <p
              className={`text-sm text-center rounded px-3 py-2 ${
                statusMessage.ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}
            >
              {statusMessage.text}
            </p>
          )}

          {/* 凡例 */}
          <div className="flex flex-col gap-1 mt-2 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-500 mb-1">凡例</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
              アイテムマス
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 rounded bg-yellow-400 flex items-center justify-center text-slate-900 text-xs">★</div>
              スターマス
            </div>
          </div>
        </div>

        {/* ---- グリッド ---- */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">
            モード: <span className={mode === "item" ? "text-blue-400" : "text-yellow-400"}>
              {mode === "item" ? "アイテム配置" : "スター配置"}
            </span>
            　クリックでマスをON/OFF
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${EDITOR_COLS}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${EDITOR_ROWS}, ${CELL_SIZE}px)`,
              gap: "3px",
            }}
          >
            {Array.from({ length: EDITOR_ROWS }, (_, r) =>
              Array.from({ length: EDITOR_COLS }, (_, c) => {
                const key = cellKey(r, c);
                const isItem = itemCells.has(key);
                const isStar = starCells.has(key);

                return (
                  <button
                    key={key}
                    onClick={() => toggleCell(r, c)}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: isItem ? color : "transparent",
                      border: `2px solid ${isItem ? "rgba(255,255,255,0.3)" : "#334155"}`,
                      borderRadius: "4px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background-color 0.1s",
                    }}
                    title={`(${c}, ${r})`}
                  >
                    {isStar && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "#fbbf24",
                          textShadow: "0 0 4px rgba(0,0,0,0.8)",
                          pointerEvents: "none",
                        }}
                      >
                        ★
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* プレビュー */}
          {itemCells.size > 0 && (
            <div className="bg-slate-800 rounded p-3 text-xs font-mono text-slate-300 max-w-sm">
              <p className="text-slate-500 mb-1">生成される shape:</p>
              <pre>{JSON.stringify(computeShape(itemCells), null, 2)}</pre>
              {starCells.size > 0 && (
                <>
                  <p className="text-slate-500 mt-2 mb-1">stars (relativePos):</p>
                  <pre>
                    {JSON.stringify(
                      computeStars(itemCells, starCells, conditionTag).map((s) => s.relativePos),
                      null,
                      2
                    )}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- 登録済みアイテム一覧 ---- */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">登録済みアイテム ({registeredItems.length}件)</h2>
        {registeredItems.length === 0 ? (
          <p className="text-slate-500 text-sm">まだアイテムが登録されていません</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {registeredItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800 rounded-lg p-3 flex flex-col gap-2 w-48"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-mono">{item.id}</p>
                {/* ミニグリッドプレビュー */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${item.shape[0]?.length ?? 1}, 14px)`,
                    gap: "1px",
                  }}
                >
                  {item.shape.map((row, ri) =>
                    row.map((cell, ci) => (
                      <div
                        key={`${ri}-${ci}`}
                        style={{
                          width: 14,
                          height: 14,
                          backgroundColor: cell === 1 ? item.color : "transparent",
                          border: "1px solid #334155",
                          borderRadius: "2px",
                        }}
                      />
                    ))
                  )}
                </div>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span key={t} className="text-xs bg-slate-700 rounded px-1 text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
