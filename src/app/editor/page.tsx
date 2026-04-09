"use client";

import { useState, useCallback, useEffect } from "react";
import { ItemData, StarDefinition } from "@/src/types";

// ------------------------------------------------------------------ constants
const EDITOR_ROWS = 7;
const EDITOR_COLS = 9;
const CELL_SIZE = 48;
const PASSWORD = "banpick";
const BASE_PATH = "/back-pack-tools";
const LS_TAGS_KEY = "editor_tags";

const DEFAULT_TAGS = [
  "weapon", "shield", "potion", "food",
  "bag", "no_cooltime", "empty", "scop",
];

type Rotation = 0 | 90 | 180 | 270;
const ROTATIONS: Rotation[] = [0, 90, 180, 270];
type Mode = "item" | "star";
type Tab = "editor" | "tags";
type CellKey = string;
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
    for (let c = minCol; c <= maxCol; c++) row.push(itemCells.has(cellKey(r, c)) ? 1 : 0);
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
  const toRel = (key: CellKey) => { const { row, col } = parseKey(key); return { x: col - minCol, y: row - minRow }; };
  const cond = { type: "at_position" as const, ...(conditionTag ? { tag: conditionTag } : {}) };

  const stars: StarDefinition[] = Array.from(starCellsByRotation[0]).map(key => ({
    relativePos: toRel(key), condition: cond,
  }));

  for (const rot of [90, 180, 270] as (90 | 180 | 270)[]) {
    const cells = starCellsByRotation[rot];
    if (cells.size === 0) continue;
    Array.from(cells).map(toRel).forEach((pos, i) => {
      if (i < stars.length) {
        stars[i].relativePosOverrides = { ...stars[i].relativePosOverrides, [rot]: pos };
      } else {
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

function shapeToItemCells(shape: number[][]): Set<CellKey> {
  const cells = new Set<CellKey>();
  shape.forEach((row, r) => row.forEach((v, c) => { if (v === 1) cells.add(cellKey(r, c)); }));
  return cells;
}

function starsToStarCellsByRotation(stars: StarDefinition[], itemCells: Set<CellKey>): StarCellsByRotation {
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
        <input type="password" value={input} autoFocus
          onChange={e => { setInput(e.target.value); setError(false); }}
          className="bg-slate-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="パスワード" />
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

// ------------------------------------------------------------------ tag manager tab
function TagManager({ availableTags, onUpdate }: { availableTags: string[]; onUpdate: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const t = input.trim();
    if (!t || availableTags.includes(t)) { setInput(""); return; }
    onUpdate([...availableTags, t]);
    setInput("");
  };

  const handleDelete = (tag: string) => {
    onUpdate(availableTags.filter(t => t !== tag));
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-lg font-bold mb-1">タグ管理</h2>
      <p className="text-slate-400 text-sm mb-6">
        アイテムに付与できるタグを管理します。追加・削除したタグはアイテム編集タブに即座に反映されます。
      </p>

      {/* 追加フォーム */}
      <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-3 mb-6">
        <p className="text-sm font-semibold text-slate-300">新しいタグを追加</p>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-slate-700 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="タグ名（例: nature, cursed, ...）" />
          <button onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
            追加
          </button>
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="bg-slate-800 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-300 mb-3">登録済みタグ ({availableTags.length}件)</p>
        {availableTags.length === 0 ? (
          <p className="text-slate-500 text-sm">タグがありません</p>
        ) : (
          <div className="flex flex-col gap-1">
            {availableTags.map(tag => (
              <div key={tag} className="flex items-center justify-between bg-slate-700 rounded px-3 py-2">
                <span className="text-sm font-mono">{tag}</span>
                <button onClick={() => handleDelete(tag)}
                  className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-900/30 transition-colors">
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ editor tab
function Editor() {
  const [activeTab, setActiveTab] = useState<Tab>("editor");

  // タグ（localStorage 永続化）
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_TAGS);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_TAGS_KEY);
      if (stored) setAvailableTags(JSON.parse(stored));
    } catch {}
  }, []);
  const updateTags = (tags: string[]) => {
    setAvailableTags(tags);
    localStorage.setItem(LS_TAGS_KEY, JSON.stringify(tags));
    // 現在の選択タグから削除されたタグを除外
    setSelectedTags(prev => prev.filter(t => tags.includes(t)));
  };

  // フォーム状態
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("item");
  const [conditionTag, setConditionTag] = useState("");

  // グリッド状態
  const [itemCells, setItemCells] = useState<Set<CellKey>>(new Set());
  const [starCellsByRotation, setStarCellsByRotation] = useState<StarCellsByRotation>(emptyStarCells());
  const [starRotation, setStarRotation] = useState<Rotation>(0);

  // アイテム一覧
  const [allItems, setAllItems] = useState<ItemData[]>([]);         // 表示用（全アイテム）
  const [editorItemIds, setEditorItemIds] = useState<Set<string>>(new Set()); // editor-items.json にあるID
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    // 全アイテム（既存＋エディタ）を取得
    fetch(`${BASE_PATH}/api/editor/all-items`)
      .then(r => r.json())
      .then((items: ItemData[]) => setAllItems(items))
      .catch(() => {});
    // エディタ管理アイテムのID集合を取得
    fetch(`${BASE_PATH}/api/editor/items`)
      .then(r => r.json())
      .then((items: ItemData[]) => setEditorItemIds(new Set(items.map((i: ItemData) => i.id))))
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
    setName(item.name); setId(item.id); setColor(item.color);
    setSelectedTags(item.tags ?? []);
    const cells = shapeToItemCells(item.shape);
    setItemCells(cells);
    setStarCellsByRotation(starsToStarCellsByRotation(item.stars ?? [], cells));
    setConditionTag(item.stars?.[0]?.condition?.tag ?? "");
    setEditingId(item.id);
    setMode("item"); setStarRotation(0); setStatus(null);
  };

  // ---- clear
  const handleClear = () => {
    setItemCells(new Set()); setStarCellsByRotation(emptyStarCells());
    setName(""); setId(""); setColor("#6b7280");
    setSelectedTags([]); setConditionTag("");
    setEditingId(null); setStatus(null); setStarRotation(0);
  };

  // ---- register / update
  const handleRegister = async () => {
    if (!id.trim() || !name.trim()) { setStatus({ text: "名前とIDは必須です", ok: false }); return; }
    if (itemCells.size === 0) { setStatus({ text: "アイテムの形を1マス以上選択してください", ok: false }); return; }

    const payload: ItemData = {
      id: id.trim(), name: name.trim(),
      shape: computeShape(itemCells), color, tags: selectedTags,
      stars: computeStarsFromRotations(itemCells, starCellsByRotation, conditionTag),
    };

    // editor-items.json に既存 → PUT、なければ POST（既存アイテムの上書きも POST）
    const isUpdate = editingId !== null && editorItemIds.has(editingId);
    try {
      const res = await fetch(`${BASE_PATH}/api/editor/items`, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved: ItemData = await res.json();
        // editor ID セットを更新
        setEditorItemIds(prev => new Set([...prev, saved.id]));
        // 全アイテム一覧を更新（同IDを置き換え or 追加）
        setAllItems(prev => {
          const exists = prev.some(i => i.id === saved.id);
          return exists ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved];
        });
        setStatus({ text: `「${saved.name}」を${isUpdate ? "更新" : "登録"}しました`, ok: true });
        handleClear();
      } else {
        const err = await res.json();
        setStatus({ text: err.error ?? "失敗しました", ok: false });
      }
    } catch { setStatus({ text: "通信エラーが発生しました", ok: false }); }
  };

  // ---- delete（editor-items.json にあるものだけ削除可能）
  const handleDelete = async (itemId: string) => {
    if (!editorItemIds.has(itemId)) return;
    const res = await fetch(`${BASE_PATH}/api/editor/items?id=${encodeURIComponent(itemId)}`, { method: "DELETE" });
    if (res.ok) {
      setEditorItemIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
      // 削除後、元の hardcoded アイテムが存在するかもしれないので all-items を再取得
      fetch(`${BASE_PATH}/api/editor/all-items`)
        .then(r => r.json())
        .then((items: ItemData[]) => setAllItems(items))
        .catch(() => {});
      if (editingId === itemId) handleClear();
    }
  };

  const currentStarCells = starCellsByRotation[starRotation];

  return (
    <div className="min-h-screen bg-slate-900 text-white text-sm">
      {/* ---- タブナビゲーション ---- */}
      <div className="border-b border-slate-700 px-4 flex gap-0">
        {(["editor", "tags"] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}>
            {tab === "editor" ? "アイテム編集" : "タグ管理"}
          </button>
        ))}
      </div>

      {/* ---- タグ管理タブ ---- */}
      {activeTab === "tags" && (
        <TagManager availableTags={availableTags} onUpdate={updateTags} />
      )}

      {/* ---- アイテム編集タブ ---- */}
      {activeTab === "editor" && (
        <div className="p-4 flex items-start">

          {/* === 左パネル: フォーム === */}
          <div className="flex flex-col gap-3 w-64 flex-shrink-0">
            <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-3">
              <p className="font-semibold text-slate-300 text-xs">
                {editingId
                  ? <span>編集中: <span className="font-mono text-blue-400">{editingId}</span></span>
                  : "新規アイテム"}
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
                  readOnly={editingId !== null} />
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
                {availableTags.length === 0 ? (
                  <p className="text-slate-500 text-xs">タグがありません（タグ管理タブで追加できます）</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map(tag => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <button key={tag}
                          onClick={() => setSelectedTags(prev =>
                            selected ? prev.filter(t => t !== tag) : [...prev, tag]
                          )}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors font-medium ${
                            selected
                              ? "bg-slate-900 border-slate-400 text-white"
                              : "bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500"
                          }`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">選択中: {selectedTags.join(", ")}</p>
                )}
              </div>

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

          {/* === 中央: グリッド === */}
          <div className="flex flex-col gap-3 flex-shrink-0 flex-1 items-center justify-center px-4">
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

            {/* スター専用コントロール */}
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
                          {hasStars && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-20 flex-shrink-0">条件タグ:</span>
                  <input value={conditionTag} onChange={e => setConditionTag(e.target.value)}
                    className="flex-1 bg-slate-700 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="weapon / potion / ..." />
                </label>
                <p className="text-xs text-slate-500">未設定の向きは数学的回転変換を自動適用</p>
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
                      title={`(col=${c}, row=${r})`}>
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

            {/* shape プレビュー */}
            {itemCells.size > 0 && (
              <div className="bg-slate-800 rounded p-2 text-xs font-mono text-slate-300">
                <span className="text-slate-500">shape: </span>
                {JSON.stringify(computeShape(itemCells))}
              </div>
            )}
          </div>

          {/* === 右パネル: アイテム一覧 === */}
          <div className="flex flex-col gap-2 w-72 flex-shrink-0">
            <p className="font-semibold text-slate-300">
              アイテム一覧 ({allItems.length}件)
            </p>
            <p className="text-xs text-slate-500 -mt-1">クリックして編集 / 再クリックでキャンセル</p>
            {allItems.length === 0 ? (
              <p className="text-slate-500 text-xs">読み込み中...</p>
            ) : (
              <div className="flex flex-col max-h-[80vh] overflow-y-auto bg-slate-800 rounded-lg divide-y divide-slate-700">
                {allItems.map(item => {
                  const isEditing = editingId === item.id;
                  const isEditorItem = editorItemIds.has(item.id);
                  return (
                    <div key={item.id}
                      onClick={() => isEditing ? handleClear() : loadItem(item)}
                      className={`p-2.5 flex flex-col gap-1.5 cursor-pointer transition-all first:rounded-t-lg last:rounded-b-lg ${
                        isEditing ? "bg-blue-900/30" : "hover:bg-slate-700"
                      }`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-xs truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs px-1 rounded ${
                            isEditorItem ? "bg-blue-900 text-blue-300" : "bg-slate-700 text-slate-400"
                          }`}>
                            {isEditorItem ? "エディタ" : "既存"}
                          </span>
                          {isEditorItem && (
                            <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                              className="text-red-400 hover:text-red-300 text-xs">✕</button>
                          )}
                        </div>
                      </div>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
