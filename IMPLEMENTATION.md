# 実装詳細ドキュメント

## プロジェクト概要

Backpack Battles のバックパック配置シミュレーターです。ドラッグ＆ドロップでアイテムをグリッドに配置し、アイテムの位置関係によって星が点灯する仕組みを再現します。また、管理者向けのビジュアルアイテムエディタも内包しており、ゲーム内アイテムのデータ入力を GUI で行えます。

---

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                      # メインページ（シミュレーター）
│   ├── layout.tsx                    # ルートレイアウト（メタデータ・フォント設定）
│   ├── globals.css                   # Tailwind グローバルスタイル
│   ├── editor/
│   │   └── page.tsx                  # ビジュアルアイテムエディタ（/editor）
│   └── api/
│       └── editor/
│           ├── items/
│           │   └── route.ts          # GET/POST/PUT/DELETE /api/editor/items
│           └── all-items/
│               └── route.ts          # GET /api/editor/all-items
├── components/
│   ├── BackpackGrid.tsx              # グリッド描画・星マーク・右クリック回転検知
│   ├── DraggableGridItem.tsx         # グリッド上に配置済みのアイテム（ドラッグ可能）
│   ├── DraggableShopItem.tsx         # アイテムリストのアイテム（ドラッグ可能）
│   └── DroppableCell.tsx             # グリッドの各マス（ドロップ先）
├── utils/
│   ├── grid.ts                       # グリッド計算・バリデーション・星の点灯計算
│   └── __tests__/
│       └── grid.test.ts              # grid.ts のユニットテスト（Vitest）
├── data/
│   └── editor-items.json             # ビジュアルエディタで登録したアイテムの永続化ストア
├── types.ts                          # 型定義（ItemData, PlacedItem, StarDefinition など）
├── constants.ts                      # 定数（CELL_SIZE, GRID_COLS, GRID_ROWS など）
└── data.ts                           # アイテム定義データ（既存アイテム + エディタアイテム統合）
```

---

## ファイル別 実装詳細

---

### `src/types.ts` — 型定義

アプリ全体で共有する型を定義します。

| 型名 | 説明 |
|------|------|
| `Point` | `{ x: number, y: number }` の座標 |
| `Rotation` | `0 \| 90 \| 180 \| 270` の回転角度 |
| `ItemData` | アイテム定義（id, name, shape, color, tags, attributes?, stars?） |
| `PlacedItem` | グリッド上に配置されたインスタンス（id, itemId, position, rotation） |
| `StarDefinition` | 星マークの定義（relativePos, relativePosOverrides?, condition） |
| `StarConditionType` | `'at_position'` のみ（将来拡張用） |
| `StarCondition` | 星の点灯条件（type, tag?, attribute?）。tag と attribute は OR 条件 |
| `StarDefinitionInput` | data.ts 記述用の短縮形入力型。relativePos に配列を渡すと複数の星に展開される |

#### ItemData の shape フィールド

`shape: number[][]` は二次元配列で、`1` が埋まったマス、`0` または省略が空マスを表します。

```typescript
// 例: ハンマー（T字形）
shape: [
  [1, 1, 1],  // 上段: 3マス埋まっている
  [0, 1, 0],  // 中段: 中央のみ
  [0, 1, 0],  // 下段: 中央のみ
]
```

行の長さが揃っていなくても良く、`baseShape[r]?.[c] ?? 0` で 0 として扱われます。

---

### `src/constants.ts` — 定数

グリッドのレイアウトに関するピクセル定数を定義します。

| 定数名 | 値 | 説明 |
|--------|-----|------|
| `CELL_SIZE` | 40 | 1セルのピクセルサイズ（px） |
| `GAP_SIZE` | 4 | セル間のギャップ（px） |
| `GRID_PADDING` | 8 | グリッド外周のパディング（px） |
| `GRID_COLS` | 9 | グリッドの列数 |
| `GRID_ROWS` | 7 | グリッドの行数 |

---

### `src/data.ts` — アイテムデータ

既存アイテムの定義と、エディタアイテムのマージを行うモジュールです。

#### 構造

```typescript
// 1. ヘルパー関数
function expandStars(inputs: StarDefinitionInput[]): StarDefinition[]

// 2. タグ名・属性名の定数
const weapon = "weapon";
const shield = "shield";
// ...

// 3. 既存アイテムの配列（ソースコードに直接記述）
export const HARDCODED_ITEMS: ItemData[] = [ ... ];

// 4. editor-items.json を読み込んでマージ
//    エディタアイテムが同IDの既存アイテムを上書きする（優先度: エディタ > 既存）
export const ITEMS: ItemData[] = [
  ...HARDCODED_ITEMS.filter(i => !editorIds.has(i.id)),
  ...editorItems,
];
```

#### `expandStars` ヘルパー

`StarDefinitionInput` の短縮記法を `StarDefinition[]` に展開します。`relativePos` に `{ x: number[], y: number[] }` を渡すと、各インデックスが1つの `StarDefinition` に変換されます。

```typescript
// 入力例（短縮形）
expandStars([{
  relativePos: { x: [0, 0], y: [-1, 3] },
  condition: { type: "at_position", tag: "weapon" },
}])
// 展開結果
// → { relativePos: { x: 0, y: -1 }, condition: ... }
// → { relativePos: { x: 0, y:  3 }, condition: ... }
```

#### ITEMS のマージルール

- `HARDCODED_ITEMS` と `editor-items.json` の両方に同じ `id` が存在する場合、エディタ側が優先されます。
- これにより、既存アイテムをエディタで上書き編集した内容が本番に反映されます。
- `HARDCODED_ITEMS` は `all-items` API でも使用するため個別にエクスポートしています。

---

### `src/data/editor-items.json` — エディタアイテムストア

ビジュアルエディタで登録・更新されたアイテムを永続化する JSON ファイルです。`data.ts` がインポートして `ITEMS` にマージします。

- 形式: `ItemData[]` の JSON 配列
- API ルート（`/api/editor/items`）によってファイルシステムへの読み書きが行われます。
- 初期値は空配列 `[]` です。

---

### `src/app/page.tsx` — メインページ（シミュレーター）

アプリ全体の状態を管理し、ドラッグ＆ドロップのライフサイクル全体を制御するメインコンポーネントです。`DndContext` でアプリ全体を包みます。

#### 状態（State）

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `placedItems` | `PlacedItem[]` | グリッド上に配置済みのアイテム一覧。初期値はスターターバッグ1個 |
| `dragOverlayItem` | `ItemData \| null` | ショップからドラッグ中のアイテム（DragOverlay 表示用） |
| `shopDragRotation` | `0 \| 90 \| 180 \| 270` | ショップアイテムのドラッグ中に適用される回転角度 |

#### Ref

| 変数名 | 説明 |
|--------|------|
| `preDragRotationRef` | ドラッグ開始時の回転角度を保存。バッグ外ドロップ失敗時に元の回転に戻すため |

#### 主要ハンドラ

**`handleDragStart`**
- ショップアイテムのドラッグ開始時: `dragOverlayItem` をセット、`shopDragRotation` を 0 にリセット
- グリッドアイテムのドラッグ開始時: 現在の回転を `preDragRotationRef` に保存

**`handleShopRotate`**
- ショップアイテムのドラッグ中に右クリックが押されたとき呼ばれる
- `shopDragRotation` を 90° ずつ増加（0→90→180→270→0）

**`handleRotate`**
- グリッド上のアイテムのドラッグ中に右クリックが押されたとき呼ばれる
- 指定された `instanceId` の `PlacedItem.rotation` を 90° 増加

**`handleDragEnd`**
- ドロップ先なし: グリッドアイテムなら削除 + バッグ外アイテムのクリーンアップ
- ドロップ先あり:
  1. `currentRotation` を取得（グリッドアイテムは既存の rotation、ショップアイテムは `shopDragRotation`）
  2. 境界判定（`isOutOfBounds`）
  3. バッグセル判定（非バッグアイテムのみ）
  4. 衝突判定（同レイヤー内の重複を削除）
  5. `PlacedItem` を作成・更新（ショップからの場合 `rotation: shopDragRotation` を使用）
  6. バッグを移動した場合は `cleanupItemsOutsideBags` で後始末

**`handleReset`**
- バッグタグを持つアイテム以外をすべて `placedItems` から除去します。

**矢印キー移動 (`useEffect`)**
- `document` の `keydown` イベントを監視
- `ArrowLeft/Right/Up/Down` キー入力時に全 `placedItems` を 1 マス移動
- 移動後に 1 つでもグリッド範囲外（`isOutOfBounds`）になる場合は何も変化しない
- `setPlacedItems` の functional update 形式で全アイテムの `position` を一括更新

**`cleanupItemsOutsideBags`**
- バッグを移動・削除した後、バッグ領域外に出た非バッグアイテムを削除します。
- バッグのセル集合を `getBagCells` で計算し、全セルが `isOnBagCells` を満たさないアイテムを除去します。

#### DragOverlay（ショップアイテムのドラッグプレビュー）

- `dragOverlayItem` と `shopDragRotation` に基づいて実際のグリッドサイズでプレビューを描画
- 90°/270° 回転時は縦横サイズを入れ替え（`rotCols`/`rotRows`）
- `getOccupiedCells(shape, 0, 0, shopDragRotation)` で占有セルを計算し、バウンディングボックス内に絶対配置で描画
- アイテム名を中央に重ねて表示

#### `litStars` の計算

```typescript
const litStars = useMemo(() => computeLitStars(placedItems, ITEMS), [placedItems]);
```

`placedItems` が変化するたびに `computeLitStars` を呼び出して点灯中の星セットを再計算します。

---

### `src/components/BackpackGrid.tsx` — グリッド描画・回転検知

グリッド全体の描画と、ドラッグ中の右クリック回転イベントの検知を担当します。

#### Props

| 名前 | 型 | 説明 |
|------|-----|------|
| `rows` / `cols` | `number` | グリッドのサイズ |
| `placedItems` | `PlacedItem[]` | 描画するアイテム一覧 |
| `itemsData` | `ItemData[]` | アイテムマスターデータ |
| `litStars` | `Set<string>` | 点灯中の星 ID セット（`"placedItemId-starIndex"` 形式） |
| `onRotate` | `(id: string) => void` | グリッドアイテム回転コールバック |
| `onShopRotate` | `() => void \| undefined` | ショップアイテム回転コールバック |

#### 状態と Ref

| 変数名 | 説明 |
|--------|------|
| `draggingItemId` | ドラッグ中のグリッドアイテムの `placedItem.id`（`"grid-item-{id}"` 形式を解析） |
| `isShopDragging` | ショップアイテムのドラッグ中かどうか（`"shop-"` プレフィックスで判定） |
| `dragDelta` | ドラッグ中の移動量（星マークの追従表示に使用） |
| `draggingItemIdRef` | native イベントリスナー内で `draggingItemId` を参照するための ref（stale closure 対策） |
| `isShopDraggingRef` | native イベントリスナー内で `isShopDragging` を参照するための ref |
| `onRotateRef` / `onShopRotateRef` | 最新のコールバックを native リスナーから参照するための ref |

#### ドラッグ状態の追跡

`useDndMonitor` フックで dnd-kit のイベントを購読します：
- `onDragStart`: アイテムIDのプレフィックスで grid/shop を判別し状態をセット
- `onDragMove`: `dragDelta` を更新（星マークの追従計算に使用）
- `onDragEnd` / `onDragCancel`: 全ドラッグ状態をリセット

#### 右クリック回転の仕組み

DragOverlay を使用すると React 合成イベントがコンポーネントに届かないため、`document` の capture フェーズでネイティブイベントリスナーとして処理します。

```
右クリック (mousedown, button=2)
  ├── draggingItemIdRef が存在 → onRotate(draggingItemId) を呼ぶ（グリッドアイテム回転）
  └── isShopDraggingRef が true → onShopRotate() を呼ぶ（ショップアイテム回転）

contextmenu イベント（ドラッグ中）
  └── ブラウザのコンテキストメニューを抑制
```

#### 描画内容

1. **グリッドセル**: `DroppableCell` を `rows × cols` 個描画。`getBagCells` でバッグが占有するセルを計算し `isBagCell` として渡す。
2. **配置済みアイテム**: `DraggableGridItem` を各 `PlacedItem` ごとに描画。
3. **星マーク**: アイテムの `stars` 定義を `getStarAbsolutePos` で絶対座標に変換して絶対配置で描画。
   - `isDraggingThis` が true の場合は `dragDelta` でオフセットして追従表示
   - グリッド範囲外の星はドラッグ中でなければ非表示
   - `litStars` に含まれる場合は `filter: none`（明るく）、含まれない場合は `brightness(0.35) saturate(0.4)` で暗く表示

---

### `src/components/DraggableGridItem.tsx` — グリッド上のアイテム

グリッドに配置済みのアイテムをドラッグ可能な形で描画します。

#### Props

| 名前 | 型 | 説明 |
|------|-----|------|
| `placedItem` | `PlacedItem` | 配置インスタンス（位置・回転） |
| `itemData` | `ItemData` | アイテム定義（シェイプ・色・名前） |
| `isBag` | `boolean` | バッグアイテムかどうか（描画スタイルを切り替え） |

#### 動作

- dnd-kit の `useDraggable` を使用。ID 形式: `"grid-item-{placedItem.id}"`
- `data` に `{ type: 'grid', id: placedItem.id, item: itemData }` を設定
- 90°/270° 回転時は `itemCols` と `itemRows` を入れ替えて正しい寸法を計算

#### バッグアイテムの描画

- 半透明の背景色（alpha=0.18）+ 破線ボーダー（`z-index: 3`）で「床」として表示
- ドラッグ中は opacity 0.7
- アイテム名をボーダー内中央に表示

#### 通常アイテムの描画

- `getOccupiedCells(shape, 0, 0, rotation)` で回転後の視覚セル座標セットを計算
- バウンディングボックス内に各セルを絶対配置で描画（`z-index: 10`）
- アイテム名をバウンディングボックス中央に重ねて表示

#### `hexToRgba` ユーティリティ

バッグ描画用に定義されたローカル関数。6桁 HEX カラーを `rgba()` 形式に変換します。

---

### `src/components/DraggableShopItem.tsx` — ショップのアイテム

アイテムリスト（ショップ）のアイテムをドラッグ可能にします。

- dnd-kit の `useDraggable` を使用。ID 形式: `"shop-{item.id}"`
- `data` に `{ type: 'shop', item }` を設定
- ドラッグ中はゴースト表示（`opacity: 0.3`）。実際の移動表示は `DragOverlay` が担当
- ショップでのプレビューは専用定数 `PREVIEW_CELL = 18px`, `PREVIEW_GAP = 2px` で縮小表示
- `rotation = 0` 固定のプレビュー（ショップ内では常に正立で表示）

---

### `src/components/DroppableCell.tsx` — ドロップ先のグリッドセル

グリッドの各マスを dnd-kit のドロップ可能エリアとして定義します。

- `useDroppable` を使用。ID 形式: `"cell-{x}-{y}"`
- `data` に `{ x, y }` を設定し、`handleDragEnd` でドロップ座標を取得

#### 背景色の切り替え

| 状態 | backgroundColor | borderColor |
|------|----------------|-------------|
| バッグセル（通常） | `#334155` | `#475569` |
| バッグセル（ホバー中） | `#64748b` | `#94a3b8` |
| 非バッグセル | `#020617` | `#1e293b` |

---

### `src/utils/grid.ts` — グリッド計算・バリデーション

グリッド上の全計算ロジックを集約したユーティリティです。UI に依存しない純粋関数で構成されます。

#### 関数一覧

| 関数名 | 説明 |
|--------|------|
| `getShapeCols(shape)` | シェイプの最大列数を返す（行ごとに長さが異なる非矩形シェイプに対応） |
| `getOccupiedCells(shape, x, y, rotation)` | 指定位置・回転で占有されるグリッドセルの座標配列を返す |
| `getStarAbsolutePos(star, shape, x, y, rotation)` | 星のグリッド絶対座標を返す（`relativePosOverrides` → 数学的変換 の優先順で解決） |
| `getStarVisualPos(star, shape, rotation)` | 星のアイテム左上基準の視覚座標を返す（描画位置計算用） |
| `isOutOfBounds(cells, cols, rows)` | セルがグリッド範囲外かどうかを判定 |
| `getOverlappingItems(newCells, placedItems, itemsData, ignoreId?)` | 新しいセルと重なる既存アイテムの ID リストを返す |
| `canPlaceItem(itemData, x, y, rotation, cols, rows, placedItems, itemsData, ignoreId?)` | 境界・衝突を総合的に判定する（現在 page.tsx では未使用、将来拡張用） |
| `getBagCells(placedItems, itemsData)` | バッグが占有するセル座標の `Set<"x,y">` を返す |
| `isOnBagCells(cells, bagCells)` | 全セルがバッグセル上に収まるかを判定 |
| `computeLitStars(placedItems, itemsData)` | 点灯中の星 ID セットを計算・返す（`"placedItemId-starIndex"` 形式） |

#### 回転変換の数学

`getOccupiedCells` と `getStarAbsolutePos` で共通の変換式を使用します（`rows`/`cols` はシェイプの元の寸法）:

| 回転 | 変換式（c, r → rotX, rotY） |
|------|---------------------------|
| 0°   | `rotX = c`, `rotY = r` |
| 90°  | `rotX = rows-1-r`, `rotY = c` |
| 180° | `rotX = cols-1-c`, `rotY = rows-1-r` |
| 270° | `rotX = r`, `rotY = cols-1-c` |

#### `computeLitStars` の処理フロー

1. 全アイテムの占有セルを `occupationMap: Map<"x,y", {placed, itemData}>` に格納
2. 星を持つ各アイテムについて:
   - `getStarAbsolutePos` で星のグリッド座標を取得
   - `occupationMap` から星座標に置かれたアイテムを取得
   - 自分自身は除外（`entry.placed.id !== placed.id`）
   - `StarCondition` の `tag` / `attribute` のいずれかが一致すれば `litStars` に追加（OR 条件）
3. `"placedItemId-starIndex"` 形式の文字列 Set を返す

---

### `src/utils/__tests__/grid.test.ts` — ユニットテスト

`grid.ts` の全エクスポート関数を Vitest でテストします。33テストケース。

#### テスト用フィクスチャ

| 変数 | 説明 |
|------|------|
| `SWORD` | 3×1 縦アイテム、星=中央セル右隣(1,1)、条件タグ: `"armor"` |
| `SHIELD` | 2×2 アイテム、星=左上セル左隣(-1,0)、条件タグ: `"weapon"` |
| `BAG` | 3×2 バッグ、stars なし |
| `POTION` | 1×1 アイテム、星=常に1マス上（全回転 `relativePosOverrides` で固定） |

#### テストスイート

| スイート | テスト内容 |
|---------|-----------|
| `getOccupiedCells` | 0°/90°/180° での座標変換・2×2 アイテム |
| `isOutOfBounds` | グリッド内/列数超過/負値 |
| `getOverlappingItems` | 重なりなし/あり/自身無視/レイヤー分離 |
| `getBagCells` | バッグのセル集合/非バッグ無視 |
| `isOnBagCells` | 全セル内/1つ外 |
| `computeLitStars` | 未点灯/剣盾隣接/回転考慮/自身除外/条件タグ不一致/overrides |
| `getStarAbsolutePos` | override なし各回転/override あり各回転 |
| `getStarVisualPos` | override なし/あり/不存在の回転は数学的変換 |

---

### `src/app/editor/page.tsx` — ビジュアルアイテムエディタ

`/editor` ページに配置された管理者向けツールです。パスワード認証を経てアクセスします。

#### 認証

- パスワード: `"banpick"`（クライアントサイドで照合）
- 認証成功後、`sessionStorage` に `"editor_auth"` を保存し、ページリロード後も認証状態を維持

#### タブ構成

**アイテム編集タブ（デフォルト）**
- 左パネル（フォーム）・中央（グリッド）・右パネル（アイテム一覧）の3カラムレイアウト

**タグ管理タブ**
- タグの追加（テキスト入力 + 追加ボタン、Enter キー対応）
- タグの削除（各タグ行に削除ボタン）
- 変更は `localStorage`（キー: `"editor_tags"`）に永続化
- 削除されたタグはアイテム編集フォームの選択中タグからも即座に除外

#### Editor コンポーネントの状態

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `activeTab` | `"editor" \| "tags"` | 現在表示中のタブ |
| `name` / `id` | `string` | 登録フォームの名前・ID |
| `color` | `string` | アイテム色（HEX、デフォルト `"#6b7280"`） |
| `selectedTags` | `string[]` | フォームで選択中のタグ |
| `availableTags` | `string[]` | 選択可能なタグ一覧（localStorage から復元、初期値は DEFAULT_TAGS） |
| `mode` | `"item" \| "star"` | グリッドのクリックモード |
| `itemCells` | `Set<CellKey>` | アイテムの形として選択されたグリッドセル（`"row,col"` 形式） |
| `starCellsByRotation` | `Record<Rotation, Set<CellKey>>` | 回転ごとのスターセル |
| `starRotation` | `Rotation` | スターモードで現在編集中の回転 |
| `conditionTag` | `string` | スターの条件タグ（全スター共通） |
| `allItems` | `ItemData[]` | アイテム一覧表示用（既存＋エディタ全件） |
| `editorItemIds` | `Set<string>` | `editor-items.json` に保存されているアイテムのID集合 |
| `editingId` | `string \| null` | 編集中のアイテムID（null なら新規） |
| `status` | `{ text: string; ok: boolean } \| null` | 操作結果メッセージ |

#### グリッド操作

- **7行 × 9列**のクリッカブルグリッド（CELL_SIZE: 48px、GAP: 3px）
- **アイテムモード**: クリックで `itemCells` をトグル
- **スターモード**: クリックで `starCellsByRotation[starRotation]` をトグル。回転ボタン（0°/90°/180°/270°）で編集対象の向きを切り替え。スターが設定済みの向きには黄色インジケーター（小ドット）を表示

#### データ変換

**グリッド → データ**

```
itemCells → computeShape()  → shape: number[][]
starCellsByRotation + conditionTag → computeStarsFromRotations() → StarDefinition[]
```

`computeShape`: `itemCells` の最小バウンディングボックスを計算し、左上を (0,0) として `number[][]` に変換。

`computeStarsFromRotations`: 0° のスターセルを `relativePos` として `StarDefinition` を生成。他の回転のスターセルはインデックス順に照合して `relativePosOverrides` として付与。0° より多い場合は新規 `StarDefinition` として追加。

**データ → グリッド（既存アイテム読み込み）**

```
shape → shapeToItemCells()  → itemCells（グリッド左上から配置）
stars → starsToStarCellsByRotation() → starCellsByRotation（回転ごとに逆変換）
```

#### アイテムの保存ルール

- `editingId` が `editorItemIds` に含まれる → **PUT**（上書き更新）
- それ以外（新規 or 既存アイテムの初回編集） → **POST**（新規登録）
- POST 成功後、`editorItemIds` に ID を追加（以降は PUT になる）

#### アイテム一覧の区別

- **「既存」バッジ（グレー）**: `HARDCODED_ITEMS` 由来（`editor-items.json` に未登録）
- **「エディタ」バッジ（青）**: `editor-items.json` に登録済み
- 削除ボタンはエディタアイテムにのみ表示。既存アイテムは削除不可

---

### `src/app/api/editor/items/route.ts` — アイテム CRUD API

`editor-items.json` を直接読み書きするサーバーサイド API です。Next.js App Router の Route Handler として実装。

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/editor/items` | editor-items.json の全アイテムを返す |
| POST | `/api/editor/items` | 新規アイテムを追加（id 重複で 409） |
| PUT | `/api/editor/items` | 既存アイテムを上書き更新（id 未存在で 404） |
| DELETE | `/api/editor/items?id=xxx` | 指定 ID のアイテムを削除（id 未存在で 404） |

バリデーション: `id`, `name`, `shape` は必須（不足時は 400）。

ファイルパス: `process.cwd()/src/data/editor-items.json`（開発・本番ともにファイルシステムへ直接読み書き）。

---

### `src/app/api/editor/all-items/route.ts` — 全アイテム取得 API

既存アイテムとエディタアイテムをマージして返します。`editor-items.json` を毎リクエスト時に読み込むため、常に最新のデータを返します。

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/editor/all-items` | 全アイテム（既存＋エディタ）を返す |

マージロジック: `HARDCODED_ITEMS` のうち、`editor-items.json` に同 ID が存在するものを除外し、エディタアイテムを末尾に追加。`data.ts` の `ITEMS` と同じ優先順位ルール。

---

### `src/app/layout.tsx` — ルートレイアウト

Next.js App Router のルートレイアウトです。

- メタデータ（title: `"Backpack Battles Tool"`, description）を設定
- Google Fonts（Geist Sans / Geist Mono）を `next/font/google` でロード
- `globals.css`（Tailwind）をインポート

---

## 機能別 実装の流れ

### ショップからのドラッグ・配置

```
1. DraggableShopItem でドラッグ開始
   → handleDragStart: dragOverlayItem セット, shopDragRotation を 0 にリセット

2. DragOverlay がドラッグプレビューを表示
   → shopDragRotation に基づいて形状・サイズを描画

3. ドラッグ中に右クリック
   → BackpackGrid の native mousedown (capture) → onShopRotate() 呼び出し
   → shopDragRotation が 90° 増加 → DragOverlay が再レンダー

4. DroppableCell にドロップ
   → handleDragEnd:
      - currentRotation = shopDragRotation
      - 境界判定（isOutOfBounds）→ 失敗で return
      - バッグセル判定（isOnBagCells）→ 失敗で return
      - 衝突判定（同レイヤーのみ対象、重複アイテムは削除）
      - PlacedItem 作成（rotation: shopDragRotation）
      - cleanupItemsOutsideBags で後始末
```

### グリッドアイテムのドラッグ・回転・配置

```
1. DraggableGridItem でドラッグ開始
   → handleDragStart: 現在の rotation を preDragRotationRef に保存

2. ドラッグ中に右クリック
   → BackpackGrid の native mousedown (capture) → onRotate(draggingItemId) 呼び出し
   → placedItems 内の該当アイテムの rotation を 90° 増加

3. DroppableCell にドロップ
   → handleDragEnd:
      - currentRotation = placedItems 内の現在の rotation
      - 境界・バッグ判定（失敗時は preDragRotationRef で回転を復元してから終了）
      - 衝突判定
      - PlacedItem の position を更新
      - cleanupItemsOutsideBags で後始末
```

### 矢印キーによる全アイテム移動

```
1. document の keydown イベントを監視（useEffect でマウント時に登録）

2. ArrowLeft/Right/Up/Down キー入力
   → (dx, dy) を決定

3. 全アイテムのチェック（functional update 内で実行）
   → 各 PlacedItem について getOccupiedCells(shape, x+dx, y+dy, rotation) を計算
   → isOutOfBounds で範囲外チェック
   → 1つでも範囲外 → prev をそのまま return（移動しない）

4. 全アイテム合格
   → 全 PlacedItem の position を (x+dx, y+dy) に更新
```

### 星の点灯

```
1. placedItems が変化するたびに computeLitStars を useMemo で再計算

2. computeLitStars:
   - 全アイテムの占有セルを occupationMap（Map<"x,y", {...}>）に格納
   - 星を持つ各アイテムについて:
     - getStarAbsolutePos で星のグリッド座標を取得
       （relativePosOverrides がある回転はそれを優先、なければ数学的回転変換）
     - occupationMap から星座標に置かれたアイテムを取得（自身は除外）
     - StarCondition の tag / attribute のいずれかが一致すれば litStars に追加

3. BackpackGrid が litStars を受け取り、星マークの filter スタイルを切り替え
   - 点灯中: filter: none（明るく表示）
   - 未点灯: brightness(0.35) saturate(0.4) opacity(80%)（暗く表示）
```

### エディタでのアイテム登録フロー

```
1. グリッドをクリックしてアイテムのセルを選択（アイテムモード）

2. スターモードに切り替え、回転を選択してスターセルを配置

3. フォームに名前・ID・色・タグを入力

4. 「登録」ボタン
   → computeShape(itemCells) で shape を生成
   → computeStarsFromRotations(...) で StarDefinition[] を生成
   → 新規なら POST /api/editor/items
   → 更新なら PUT /api/editor/items
   → 成功時: allItems・editorItemIds を更新、フォームをクリア

5. editor-items.json に永続化
   → data.ts の ITEMS に自動反映（同IDの既存アイテムを上書き）
```
