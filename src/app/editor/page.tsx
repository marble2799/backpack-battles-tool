"use client";

import { useState, useCallback, useEffect } from "react";
import { ItemData, StarDefinition } from "@/src/types";

// ------------------------------------------------------------------ constants
const EDITOR_ROWS = 7;
const EDITOR_COLS = 9;
const CELL_SIZE = 48;
const PASSWORD = "banpick";
const BASE_PATH = "/back-pack-tools";

const DEFAULT_TAGS = [
  "weapon", "shield", "potion", "food",
  "bag", "no_cooltime", "empty", "scop",
];

type Rotation = 0 | 90 | 180 | 270;
const ROTATIONS: Rotation[] = [0, 90, 180, 270];
type Mode = "item" | "star";
type CellKey = string; // "row,col"
type StarCellsByRotation = Record<Rotation, Set<CellKey>>;

// ------------------------------------------------------------------ helpers
function cellKey(row: number, col: number): CellKey { return `${row},${col}`; }
function parseKey(key: CellKey) {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

function emptyStarCells(): StarCellsByRotation {
  return { 0: new Set(), 90: new Set(), 180: new Set(), 270: new Set() };
}

function computeShape(itemCells: Set<CellKey>): number[][] {
  if (itemCells.size === 0) return [];
  const coords = Array.from(itemCells).map(parseKey);
  const minRow = Math.min(...coords.map(c => c.row));
  const maxRow = Math.max(...coords.map(c => c.row));
  const minCol = Math.min(...coords.map(c => c.col));
  const maxCol = Math.max(...coords.map(c => c.col));
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

function computeStarsFromRotations(
  itemCells: Set<CellKey>,
  starCellsByRotation: StarCellsByRotation,
  conditionTag: string,
): StarDefinition[] {
  const itemCoords = Array.from(itemCells).map(parseKey);
  const minRow = itemCoords.length > 0 ? Math.min(...itemCoords.map(c => c.row)) : 0;
  const minCol = itemCoords.length > 0 ? Math.min(...itemCoords.map(c => c.col)) : 0;

  const toRel = (key: CellKey) => {
    const { row, col } = parseKey(key);
    return { x: col - minCol, y: row - minRow };
  };

  const cond = { type: "at_position" as const, ...(conditionTag ? { tag: conditionTag } : {}) };

  // Build base stars from rotation=0
  const stars: StarDefinition[] = Array.from(starCellsByRotation[0]).map(key => ({
    relativePos: toRel(key),
    condition: cond,
  }));

  // Attach overrides from other rotations (matched by index)
  for (const rot of [90, 180, 270] as (90 | 180 | 270)[]) {
    const cells = starCellsByRotation[rot];
    if (cells.size === 0) continue;
    const rotStars = Array.from(cells).map(toRel);
    rotStars.forEach((pos, i) => {
      if (i < stars.length) {
        stars[i].relativePosOverrides = { ...stars[i].relativePosOverrides, [rot]: pos };
      } else {
        // More stars in this rotation than in rot=0 — add new entry using this pos as base
        stars.push({
          relativePos: pos,
          relativePosOverrides: { [rot]: pos } as Partial<Record<90 | 180 | 270, { x: number; y: number }>>,
          condition: cond,
        });
      }
    });
  }

  return stars;
}

/** shape → itemCells (placed at grid top-left) */
function shapeToItemCells(shape: number[][]): Set<CellKey> {
  const cells = new Set<CellKey>();
  shape.forEach((row, r) => row.forEach((v, c) => { if (v === 1) cells.add(cellKey(r, c)); }));
  return cells;
}

/** StarDefinition[] → per-rotation star cells */
function starsToStarCellsByRotation(
  stars: StarDefinition[],
  itemCells: Set<CellKey>,
): StarCellsByRotation {
  const coords = Array.from(itemCells).map(parseKey);
  const minRow = coords.length > 0 ? Math.min(...coords.map(c => c.row)) : 0;
  const minCol = coords.length > 0 ? Math.min(...coords.map(c => c.col)) : 0;

  const result = emptyStarCells();
  stars.forEach(star => {
    result[0].add(cellKey(minRow + star.relativePos.y, minCol + star.relativePos.x));
    for (const rot of [90, 180, 270] as (90 | 180 | 270)[]) {
      const ov = star.relativePosOverrides?.[rot];
      if (ov) result[rot].add(cellKey(minRow + ov.y, minCol + ov.x));
    }
  });
  return result;
}

// ------------------------------------------------------------------ password gate
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) { sessionStorage.setItem("editor_auth", "1"); onAuth(); }
    else { setError(true); setInput(""); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg shadow-lg flex flex-col gap-4 w-80">
        <h1 className="text-white text-xl font-bold text-center">アイテムエディタ</h1>
        <p className="text-slate-400 text-sm text-center">パスワードを入力してください</p>
        <input
          type="password" value={input} autoFocus
          onChange={e => { setInput(e.target.value); setError(false); }}
          className="bg-slate-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="パスワード"
        />
        {error && <p className="text-red-400 text-sm text-center">パスワードが違います</p>}
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors">
          ログイン
        </button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ root
export default function EditorPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { if (sessionStorage.getItem("editor_auth") === "1") setAuthed(true); }, []);
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;
  return <Editor />;
}

// ------------------------------------------------------------------ editor
function Editor() {
  // form
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);
  const [newTagInput, setNewTagInput] = useState("");

  // grid
  const [mode, setMode] = useState<Mode>("item");
  const [itemCells, setItemCells] = useState<Set<CellKey>>(new Set());
  const [starCellsByRotation, setStarCellsByRotation] = useState<StarCellsByRotation>(emptyStarCells());
  const [starRotation, setStarRotation] = useState<Rotation>(0);
  const [conditionTag, setConditionTag] = useState("");

  // item list
  const [registeredItems, setRegisteredItems] = useState<ItemData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/editor/items`)
      .then(r => r.json())
      .then((items: ItemData[]) => setRegisteredItems(items))
      .catch(() => {});
  }, []);

  // ---- cell toggle
  const toggleCell = useCallback((row: number, col: number) => {
    const key = cellKey(row, col);
    if (mode === "item") {
      setItemCells(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    } else {
      setStarCellsByRotation(prev => {
        const next = { ...prev, [starRotation]: new Set(prev[starRotation]) };
        next[starRotation].has(key) ? next[starRotation].delete(key) : next[starRotation].add(key);
        return next;
      });
    }
  }, [mode, starRotation]);

  // ---- load item into editor
  const loadItem = (item: ItemData) => {
    setName(item.name);
    setId(item.id);
    setColor(item.color);
    setSelectedTags(item.tags ?? []);
    const cells = shapeToItemCells(item.shape);
    setItemCells(cells);
    setStarCellsByRotation(starsToStarCellsByRotation(item.stars ?? [], cells));
    setConditionTag(item.stars?.[0]?.condition?.tag ?? "");
    setEditingId(item.id);
    setMode("item");
    setStatus(null);
  };

  // ---- clear
  const handleClear = () => {
    setItemCells(new Set());
    setStarCellsByRotation(emptyStarCells());
    setName(""); setId(""); setColor("#6b7280");
    setSelectedTags([]); setConditionTag("");
    setEditingId(null); setStatus(null);
    setStarRotation(0);
  };

  // ---- register / update
  const handleRegister = async () => {
    if (!id.trim() || !name.trim()) { setStatus({ text: "名前とIDは必須です", ok: false }); return; }
    if (itemCells.size === 0) { setStatus({ text: "アイテムの形を1マス以上選択してください", ok: false }); return; }

    const payload: ItemData = {
      id: id.trim(), name: name.trim(),
      shape: computeShape(itemCells),
      color, tags: selectedTags,
      stars: computeStarsFromRotations(itemCells, starCellsByRotation, conditionTag),
    };

    const isEdit = editingId !== null;
    try {
      const res = await fetch(`${BASE_PATH}/api/editor/items`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved: ItemData = await res.json();
        setRegisteredItems(prev =>
          isEdit ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved]
        );
        setStatus({ text: `「${saved.name}」を${isEdit ? "更新" : "登録"}しました`, ok: true });
        handleClear();
      } else {
        const err = await res.json();
        setStatus({ text: err.error ?? "失敗しました", ok: false });
      }
    } catch { setStatus({ text: "通信エラーが発生しました", ok: false }); }
  };

  // ---- delete
  const handleDelete = async (itemId: string) => {
    const res = await fetch(`${BASE_PATH}/api/editor/items?id=${encodeURIComponent(itemId)}`, { method: "DELETE" });
    if (res.ok) {
      setRegisteredItems(prev => prev.filter(i => i.id !== itemId));
      if (editingId === itemId) handleClear();
    }
  };

  // ---- add tag
  const handleAddTag = () => {
    const t = newTagInput.trim();
    if (!t || availableTags.includes(t)) { setNewTagInput(""); return; }
    setAvailableTags(prev => [...prev, t]);
    setNewTagInput("");
  };

  const currentStarCells = starCellsByRotation[starRotation];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 text-sm">
      <h1 className="text-xl font-bold mb-4">アイテムエディタ</h1>

      <div className="flex gap-4 flex-wrap">
        {/* ========== 左パネル ========== */}
        <div className="flex flex-col gap-3 w-64">

          {/* 基本情報 */}
          <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-3">
            <p className="font-semibold text-slate-300">
              {editingId ? `編集中: ${editingId}` : "新規アイテム"}
            </p>

            <label className="flex flex-col gap-1">
              <span className="text-slate-400 text-xs">名前</span>
              <input value={name} onChange={e => setName(e.target.value)}
                className="bg-slate-700 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="アイテム名" />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-slate-400 text-xs">ID</span>
              <input value={id} onChange={e => setId(e.target.value)}
                className="bg-slate-700 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="item_id"
                readOnly={editingId !== null}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-slate-400 text-xs">色</span>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent" />
                <span className="font-mono text-xs">{color}</span>
              </div>
            </label>

            {/* タグ選択 */}
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-xs">タグ</span>
              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button key={tag} onClick={() =>
                      setSelectedTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])
                    }
                      className={`text-xs px-2 py-0.5 rounded border transition-colors font-medium ${
                        selected
                          ? "bg-slate-900 border-slate-400 text-white"
                          : "bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-slate-500">選択中: {selectedTags.join(", ")}</p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleRegister}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-1.5 font-medium transition-colors">
                {editingId ? "上書き" : "登録"}
              </button>
              <button onClick={handleClear}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white rounded py-1.5 transition-colors">
                クリア
              </button>
            </div>

            {status && (
              <p className={`text-xs text-center rounded px-2 py-1.5 ${status.ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                {status.text}
              </p>
            )}
          </div>

          {/* タグ管理 */}
          <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-2">
            <p className="font-semibold text-slate-300 text-xs">タグ管理</p>
            <div className="flex gap-1">
              <input value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTag()}
                className="flex-1 bg-slate-700 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="新しいタグ名" />
              <button onClick={handleAddTag}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-xs transition-colors">
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {availableTags.map(tag => (
                <span key={tag} className="text-xs bg-slate-700 text-slate-300 rounded px-1.5 py-0.5">{tag}</span>
              ))}
            </div>
          </div>

          {/* 凡例 */}
          <div className="bg-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
            <p className="text-xs text-slate-500">凡例</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />アイテムマス
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-4 h-4 rounded bg-yellow-400 flex items-center justify-center text-slate-900">★</div>スターマス
            </div>
          </div>
        </div>

        {/* ========== グリッドエリア ========== */}
        <div className="flex flex-col gap-3">
          {/* モード切替 */}
          <div className="flex gap-2 items-center">
            <div className="flex rounded overflow-hidden border border-slate-600">
              <button onClick={() => setMode("item")}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === "item" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                アイテム配置
              </button>
              <button onClick={() => setMode("star")}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${mode === "star" ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                スター配置 ★
              </button>
            </div>
            <span className="text-xs text-slate-500">クリックでON/OFF</span>
          </div>

          {/* スターモード専用コントロール */}
          {mode === "star" && (
            <div className="bg-slate-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">回転:</span>
                <div className="flex rounded overflow-hidden border border-slate-600">
                  {ROTATIONS.map(rot => {
                    const hasStars = starCellsByRotation[rot].size > 0;
                    return (
                      <button key={rot} onClick={() => setStarRotation(rot)}
                        className={`px-3 py-1 text-xs font-medium transition-colors relative ${
                          starRotation === rot ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}>
                        {rot}°
                        {hasStars && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20">条件タグ:</span>
                <input value={conditionTag} onChange={e => setConditionTag(e.target.value)}
                  className="flex-1 bg-slate-700 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="weapon / potion / ..." />
              </label>
              <p className="text-xs text-slate-500">
                ★ 設定なし の向きは数学的回転で自動計算されます
              </p>
            </div>
          )}

          {/* グリッド */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${EDITOR_COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${EDITOR_ROWS}, ${CELL_SIZE}px)`,
            gap: "3px",
          }}>
            {Array.from({ length: EDITOR_ROWS }, (_, r) =>
              Array.from({ length: EDITOR_COLS }, (_, c) => {
                const key = cellKey(r, c);
                const isItem = itemCells.has(key);
                const isStar = currentStarCells.has(key);
                return (
                  <button key={key} onClick={() => toggleCell(r, c)}
                    style={{
                      width: CELL_SIZE, height: CELL_SIZE,
                      backgroundColor: isItem ? color : "transparent",
                      border: `2px solid ${isItem ? "rgba(255,255,255,0.3)" : "#334155"}`,
                      borderRadius: "4px", cursor: "pointer", position: "relative",
                      transition: "background-color 0.1s",
                    }}
                    title={`(col=${c}, row=${r})`}
                  >
                    {isStar && (
                      <span style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "20px", color: "#fbbf24",
                        textShadow: "0 0 4px rgba(0,0,0,0.9)", pointerEvents: "none",
                      }}>★</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* shapeプレビュー */}
          {itemCells.size > 0 && (
            <div className="bg-slate-800 rounded p-2 text-xs font-mono text-slate-300">
              <span className="text-slate-500">shape: </span>
              {JSON.stringify(computeShape(itemCells))}
            </div>
          )}
        </div>

        {/* ========== 右パネル: アイテム一覧 ========== */}
        <div className="flex flex-col gap-2 w-52">
          <p className="font-semibold text-slate-300">
            登録済みアイテム ({registeredItems.length}件)
          </p>
          {registeredItems.length === 0 ? (
            <p className="text-slate-500 text-xs">まだありません</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[80vh] overflow-y-auto pr-1">
              {registeredItems.map(item => {
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id}
                    onClick={() => loadItem(item)}
                    className={`bg-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5 cursor-pointer transition-all ${
                      isEditing ? "ring-2 ring-blue-500" : "hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-xs truncate">{item.name}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                        className="text-red-400 hover:text-red-300 text-xs ml-1 flex-shrink-0">✕</button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{item.id}</p>
                    {/* ミニプレビュー */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${item.shape[0]?.length ?? 1}, 12px)`,
                      gap: "1px",
                    }}>
                      {item.shape.map((row, ri) =>
                        row.map((cell, ci) => (
                          <div key={`${ri}-${ci}`} style={{
                            width: 12, height: 12,
                            backgroundColor: cell === 1 ? item.color : "transparent",
                            border: "1px solid #334155", borderRadius: "2px",
                          }} />
                        ))
                      )}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {item.tags.map(t => (
                          <span key={t} className="text-xs bg-slate-700 rounded px-1 text-slate-400">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
