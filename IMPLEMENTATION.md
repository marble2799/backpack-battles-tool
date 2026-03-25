# 実装詳細ドキュメント

## プロジェクト概要

Backpack Battles のバックパック配置シミュレーターです。ドラッグ＆ドロップでアイテムをグリッドに配置し、アイテムの位置関係によって星が点灯する仕組みを再現します。

---

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx          # メインページ・状態管理・イベントハンドラ
│   ├── layout.tsx        # ルートレイアウト（メタデータ設定）
│   └── globals.css       # グローバルスタイル
├── components/
│   ├── BackpackGrid.tsx       # グリッド描画・星マーク・右クリック回転検知
│   ├── DraggableGridItem.tsx  # グリッド上に配置済みのアイテム（ドラッグ可能）
│   ├── DraggableShopItem.tsx  # アイテムリストのアイテム（ドラッグ可能）
│   └── DroppableCell.tsx      # グリッドの各マス（ドロップ先）
├── utils/
│   ├── grid.ts                # グリッド計算・バリデーション・星の点灯計算
│   └── __tests__/
│       └── grid.test.ts       # grid.ts のユニットテスト
├── types.ts      # 型定義（ItemData, PlacedItem, StarDefinition など）
├── constants.ts  # 定数（CELL_SIZE, GRID_COLS, GRID_ROWS など）
└── data.ts       # アイテム定義データ
```

---

## ファイル別 実装詳細

### `src/app/page.tsx` — メインページ・状態管理

アプリ全体の状態を管理し、ドラッグ＆ドロップのライフサイクル全体を制御するメインコンポーネントです。

#### 状態（State）

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `placedItems` | `PlacedItem[]` | グリッド上に配置済みのアイテム一覧 |
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

**矢印キー移動 (`useEffect`)**
- `document` の `keydown` イベントを監視
- `ArrowLeft/Right/Up/Down` キー入力時に全 `placedItems` を 1 マス移動
- 移動後に 1 つでもグリッド範囲外（`isOutOfBounds`）になる場合は何も変化しない
- `setPlacedItems` の functional update 形式を使用し、全アイテムの `position` を一括更新

**`cleanupItemsOutsideBags`**
- バッグを移動・削除した後、バッグ領域外に出た非バッグアイテムを削除

#### DragOverlay（ショップアイテムのドラッグプレビュー）

- `shopDragRotation` に基づいてプレビューを描画
- 90°/270° 回転時は縦横サイズを入れ替え
- `getOccupiedCells(shape, 0, 0, shopDragRotation)` で占有セルを計算し描画

---

### `src/components/BackpackGrid.tsx` — グリッド描画・回転検知

グリッド全体の描画と、ドラッグ中の右クリック回転イベントの検知を担当します。

#### Props

| 名前 | 型 | 説明 |
|------|-----|------|
| `rows` / `cols` | `number` | グリッドのサイズ |
| `placedItems` | `PlacedItem[]` | 描画するアイテム一覧 |
| `itemsData` | `ItemData[]` | アイテムマスターデータ |
| `litStars` | `Set<string>` | 点灯中の星 ID セット |
| `onRotate` | `(id: string) => void` | グリッドアイテム回転コールバック |
| `onShopRotate` | `() => void \| undefined` | ショップアイテム回転コールバック（新規追加） |

#### 状態と Ref

| 変数名 | 説明 |
|--------|------|
| `draggingItemId` | ドラッグ中のグリッドアイテム ID（`grid-item-{id}` 形式を解析） |
| `isShopDragging` | ショップアイテムのドラッグ中かどうか（`shop-` プレフィックスで判定） |
| `dragDelta` | ドラッグ中の移動量（星マークの追従表示に使用） |
| `draggingItemIdRef` | native イベントリスナー内で `draggingItemId` を参照するための ref |
| `isShopDraggingRef` | native イベントリスナー内で `isShopDragging` を参照するための ref |
| `onRotateRef` / `onShopRotateRef` | stale closure 対策の ref |

#### 右クリック回転の仕組み

DragOverlay を使用すると React 合成イベントがコンポーネントに届かないため、`document` の capture フェーズでネイティブイベントリスナーとして処理します。

```
右クリック (mousedown, button=2)
  ├── draggingItemId が存在 → onRotate(draggingItemId) を呼ぶ（グリッドアイテム回転）
  └── isShopDragging が true → onShopRotate() を呼ぶ（ショップアイテム回転）
```

#### 描画内容

1. **グリッドセル**: `DroppableCell` を `rows × cols` 個描画。バッグが占有するセルは明るく表示。
2. **配置済みアイテム**: `DraggableGridItem` を各 `PlacedItem` ごとに描画。
3. **星マーク**: アイテムの `stars` 定義に基づき絶対位置で描画。ドラッグ中は `dragDelta` で追従。`litStars` に含まれるものは明るく点灯。

---

### `src/components/DraggableGridItem.tsx` — グリッド上のアイテム

グリッドに配置済みのアイテムをドラッグ可能な形で描画します。

- dnd-kit の `useDraggable` を使用。ID 形式: `grid-item-{placedItem.id}`
- `data` に `{ type: 'grid', id, item }` を設定
- **バッグアイテム**: 半透明の背景色 + 破線ボーダー（`z-index: 3`）
- **通常アイテム**: シェイプに基づく個別セルの描画（`z-index: 10`）
- 90°/270° 回転時は `itemCols` と `itemRows` を入れ替えて正しい寸法を計算

---

### `src/components/DraggableShopItem.tsx` — ショップのアイテム

アイテムリスト（ショップ）のアイテムをドラッグ可能にします。

- dnd-kit の `useDraggable` を使用。ID 形式: `shop-{item.id}`
- `data` に `{ type: 'shop', item }` を設定
- ドラッグ中はゴースト表示（opacity: 0.3）。実際の移動表示は `DragOverlay` が担当

---

### `src/components/DroppableCell.tsx` — ドロップ先のグリッドセル

グリッドの各マスを dnd-kit のドロップ可能エリアとして定義します。

- `useDroppable` を使用。ID 形式: `cell-{x}-{y}`
- `data` に `{ x, y }` を設定し、`handleDragEnd` でドロップ座標を取得
- バッグセルかどうかで背景色を変える（暗色 = バッグなし、薄灰 = バッグ上）

---

### `src/utils/grid.ts` — グリッド計算・バリデーション

グリッド上の全計算ロジックを集約したユーティリティです。UI に依存しない純粋関数で構成されます。

#### 関数一覧

| 関数名 | 説明 |
|--------|------|
| `getShapeCols(shape)` | シェイプの最大列数を返す（非矩形シェイプ対応） |
| `getOccupiedCells(shape, x, y, rotation)` | 指定位置・回転で占有されるグリッドセルの座標配列を返す |
| `getStarAbsolutePos(star, shape, x, y, rotation)` | 星のグリッド絶対座標を返す（回転・overrides 対応） |
| `getStarVisualPos(star, shape, rotation)` | 星のアイテム左上基準の視覚座標を返す |
| `isOutOfBounds(cells, cols, rows)` | セルがグリッド範囲外かどうかを判定 |
| `getOverlappingItems(newCells, placedItems, itemsData, ignoreId)` | 新しいセルと重なる既存アイテムの ID リストを返す |
| `canPlaceItem(...)` | 境界・衝突を総合的に判定する |
| `getBagCells(placedItems, itemsData)` | バッグが占有するセル座標の Set を返す |
| `isOnBagCells(cells, bagCells)` | 全セルがバッグセル上に収まるかを判定 |
| `computeLitStars(placedItems, itemsData)` | 点灯中の星 ID セットを計算・返す |

#### 回転変換の数学

`getOccupiedCells` 内で各セル `(c, r)` に対して以下の変換を適用します（`rows`/`cols` はシェイプの元の寸法）:

| 回転 | 変換式 |
|------|--------|
| 0°   | `(rotX, rotY) = (c, r)` |
| 90°  | `(rotX, rotY) = (rows-1-r, c)` |
| 180° | `(rotX, rotY) = (cols-1-c, rows-1-r)` |
| 270° | `(rotX, rotY) = (r, cols-1-c)` |

---

### `src/types.ts` — 型定義

| 型名 | 説明 |
|------|------|
| `Point` | `{ x: number, y: number }` の座標 |
| `Rotation` | `0 \| 90 \| 180 \| 270` の回転角度 |
| `ItemData` | アイテム定義（id, name, shape, color, tags, attributes, stars） |
| `PlacedItem` | グリッド上に配置されたインスタンス（id, itemId, position, rotation） |
| `StarDefinition` | 星マークの定義（relativePos, relativePosOverrides, condition） |
| `StarCondition` | 星の点灯条件（type, tag, attribute） |
| `StarDefinitionInput` | data.ts 記述用の短縮形入力型 |

---

### `src/constants.ts` — 定数

| 定数名 | 値 | 説明 |
|--------|-----|------|
| `CELL_SIZE` | 40 | 1セルのピクセルサイズ |
| `GAP_SIZE` | 4 | セル間のギャップ（px） |
| `GRID_PADDING` | 8 | グリッド外周のパディング（px） |
| `GRID_COLS` | 9 | グリッドの列数 |
| `GRID_ROWS` | 7 | グリッドの行数 |

---

### `src/data.ts` — アイテムデータ

全アイテムの定義データを含みます。各アイテムは `ItemData` 型に従い、`expandStars` ヘルパーで `StarDefinitionInput` の短縮形を展開します。

---

## 機能別 実装の流れ

### ショップからのドラッグ・配置

```
1. DraggableShopItem でドラッグ開始
   → handleDragStart: dragOverlayItem セット, shopDragRotation を 0 にリセット

2. DragOverlay がドラッグプレビューを表示
   → shopDragRotation に基づいて形状・サイズを描画

3. ドラッグ中に右クリック
   → BackpackGrid の native mousedown → onShopRotate() 呼び出し
   → shopDragRotation が 90° 増加 → DragOverlay が再レンダー

4. DroppableCell にドロップ
   → handleDragEnd:
      - currentRotation = shopDragRotation を使用
      - 境界・バッグ判定
      - PlacedItem 作成 (rotation: shopDragRotation)
      - placedItems に追加
```

### グリッドアイテムのドラッグ・回転・配置

```
1. DraggableGridItem でドラッグ開始
   → handleDragStart: 現在の rotation を preDragRotationRef に保存

2. ドラッグ中に右クリック
   → BackpackGrid の native mousedown → onRotate(draggingItemId) 呼び出し
   → placedItems 内の該当アイテムの rotation を 90° 増加

3. DroppableCell にドロップ
   → handleDragEnd:
      - currentRotation = placedItems 内の現在の rotation
      - 境界・バッグ判定（失敗時は preDragRotationRef で回転を復元）
      - PlacedItem の position を更新
```

### 矢印キーによる全アイテム移動

```
1. document の keydown イベントを監視（useEffect でマウント時に登録）

2. ArrowLeft/Right/Up/Down キー入力
   → (dx, dy) を決定

3. 全アイテムのチェック
   → 各 PlacedItem について getOccupiedCells(shape, x+dx, y+dy, rotation) を計算
   → isOutOfBounds で範囲外チェック
   → 1つでも範囲外 → 何もしない (return prev)

4. 全アイテム合格
   → 全 PlacedItem の position を (x+dx, y+dy) に更新
```

### 星の点灯

```
1. placedItems が変化するたびに computeLitStars を useMemo で再計算

2. computeLitStars:
   - 全アイテムの占有セルを occupationMap に格納
   - 星を持つ各アイテムについて:
     - getStarAbsolutePos で星のグリッド座標を取得
     - occupationMap から星座標に置かれたアイテムを取得
     - StarCondition の tag / attribute と一致すれば litStars に追加

3. BackpackGrid が litStars を受け取り、星マークの filter スタイルを切り替え
```
