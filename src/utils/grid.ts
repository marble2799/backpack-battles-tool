import { ItemData, PlacedItem, Point, StarDefinition } from '../types';

// 回転と relativePosOverrides を考慮して、星の絶対グリッド座標を返す
export function getStarAbsolutePos(
    star: StarDefinition,
    shape: number[][],
    startX: number,
    startY: number,
    rotation: 0 | 90 | 180 | 270,
): Point {
    // オーバーライドが定義されていればそれを使う（視覚座標 → 絶対座標は単純加算）
    if (rotation !== 0 && star.relativePosOverrides?.[rotation] !== undefined) {
        const ov = star.relativePosOverrides[rotation]!;
        return { x: startX + ov.x, y: startY + ov.y };
    }
    // フォールバック: relativePos を数学的に回転変換して絶対座標を求める
    const rows = shape.length;
    const cols = shape[0].length;
    const r = star.relativePos.y;
    const c = star.relativePos.x;
    let rotX = c;
    let rotY = r;
    if (rotation === 90) { rotX = rows - 1 - r; rotY = c; }
    else if (rotation === 180) { rotX = cols - 1 - c; rotY = rows - 1 - r; }
    else if (rotation === 270) { rotX = r; rotY = cols - 1 - c; }
    return { x: startX + rotX, y: startY + rotY };
}

// 星の描画位置（アイテム左上を原点とした視覚セル座標）を返す
export function getStarVisualPos(
    star: StarDefinition,
    shape: number[][],
    rotation: 0 | 90 | 180 | 270,
): Point {
    if (rotation !== 0 && star.relativePosOverrides?.[rotation] !== undefined) {
        return star.relativePosOverrides[rotation]!;
    }
    const rows = shape.length;
    const cols = shape[0].length;
    const r = star.relativePos.y;
    const c = star.relativePos.x;
    let vx = c;
    let vy = r;
    if (rotation === 90) { vx = rows - 1 - r; vy = c; }
    else if (rotation === 180) { vx = cols - 1 - c; vy = rows - 1 - r; }
    else if (rotation === 270) { vx = r; vy = cols - 1 - c; }
    return { x: vx, y: vy };
}

// アイテムが置かれる座標(x, y)を計算する
export function getOccupiedCells(
    baseShape: number[][],
    // startX, startYはアイテム(の代表点)を置く位置
    startX: number,
    startY: number,
    rotation: number,
): Point[] {
    const cells: Point[] = [];
    // アイテムの縦,横の長さ
    const rows = baseShape.length;
    const cols = baseShape[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (baseShape[r][c] === 1) {
                let rotX = c;
                let rotY = r;

                // 行列の回転演算
                if (rotation === 90) {
                    rotX = rows - 1 - r;
                    rotY = c;
                } else if (rotation === 180) {
                    rotX = cols - 1 - c;
                    rotY = rows - 1 - r;
                } else if (rotation === 270) {
                    rotX = r;
                    rotY = cols - 1 - c;
                }

                cells.push({ x: startX + rotX, y: startY + rotY });
            }
        }
    }

    return cells;
}

export function isOutOfBounds(cells: Point[], gridCols: number, gridRows: number) {
    return cells.some(cell => cell.x < 0 || cell.x >= gridCols || cell.y < 0 || cell.y >= gridRows);
}

// 当たり判定 (重なっているアイテムのIDリストを返す)
export function getOverlappingItems(
    newCells: Point[],
    placedItems: PlacedItem[],
    itemsData: ItemData[],
    ignoreInstanceId?: string
): string[] {
    const overlappingIds = new Set<string>();
    const newCellsSet = new Set(newCells.map(c => `${c.x},${c.y}`));

    for (const placed of placedItems) {
        if (placed.id === ignoreInstanceId) continue; // 自分自身は無視

        const placedData = itemsData.find(d => d.id === placed.itemId);
        if (!placedData) continue;

        const placedCells = getOccupiedCells(
            placedData.shape, placed.position.x, placed.position.y, placed.rotation
        );

        // 新しい座標と1マスでも被っていたら、削除対象としてリストアップ
        for (const pc of placedCells) {
            if (newCellsSet.has(`${pc.x},${pc.y}`)) {
                overlappingIds.add(placed.id);
                break; // 1つ被りがわかれば十分なので次のアイテムの判定へ
            }
        }
    }
    return Array.from(overlappingIds);
}

// 指定した位置と回転でアイテムが配置可能か(Gridに収まるか)判定する
export function canPlaceItem(
    itemData: ItemData,
    startX: number,
    startY: number,
    rotation: number,
    gridCols: number,
    gridRows: number,
    placedItems: PlacedItem[],
    itemsData: ItemData[],
    ignoreInstanceId?: string // 自分自身のId。衝突判定をするときに無視するために必要。
): boolean {
    const newCells = getOccupiedCells(itemData.shape, startX, startY, rotation);

    // 境界判定
    for (const cell of newCells) {
        if (cell.x < 0 || cell.x >= gridCols || cell.y < 0 || cell.y >= gridRows) {
            return false; // グリッドの外にはみ出している
        }
    }

    // 衝突判定
    const occupiedSet = new Set<string>();
    for (const placed of placedItems) {
        if (placed.id === ignoreInstanceId) continue;

        const placedData = itemsData.find((d) => d.id === placed.itemId);
        // grid上にデータとして存在しない種類のアイテムが置かれている場合
        if (!placedData) continue;

        const placedCells = getOccupiedCells(
            placedData.shape,
            placed.position.x,
            placed.position.y,
            placed.rotation
        );

        for (const pc of placedCells) {
            occupiedSet.add(`${pc.x},${pc.y}`); // "x,y" という文字列キーでハッシュ化することで、O(1)で特定のCellの衝突を確認できる
        }
    }
    for (const cell of newCells) {
        if (occupiedSet.has(`${cell.x},${cell.y}`)) {
            return false;
        }
    }

    // すべてが通ったらOK
    return true;
}

// バッグアイテムが占有するセルの集合を返す
export function getBagCells(
    placedItems: PlacedItem[],
    itemsData: ItemData[]
): Set<string> {
    const bagCells = new Set<string>();
    for (const placed of placedItems) {
        const itemData = itemsData.find(d => d.id === placed.itemId);
        if (!itemData || !itemData.tags.includes('bag')) continue;
        const cells = getOccupiedCells(itemData.shape, placed.position.x, placed.position.y, placed.rotation);
        for (const cell of cells) {
            bagCells.add(`${cell.x},${cell.y}`);
        }
    }
    return bagCells;
}

// 非バッグアイテムがバッグセル上に配置されているか確認する
export function isOnBagCells(cells: Point[], bagCells: Set<string>): boolean {
    return cells.every(cell => bagCells.has(`${cell.x},${cell.y}`));
}

// 点灯している星のIDセットを計算する
// 返り値: "placedItemId-starIndex" 形式の文字列セット
export function computeLitStars(
    placedItems: PlacedItem[],
    itemsData: ItemData[]
): Set<string> {
    const litStars = new Set<string>();

    // 占有マップ: "x,y" -> { placed, itemData }
    const occupationMap = new Map<string, { placed: PlacedItem; itemData: ItemData }>();
    for (const placed of placedItems) {
        const itemData = itemsData.find(d => d.id === placed.itemId);
        if (!itemData) continue;
        const cells = getOccupiedCells(itemData.shape, placed.position.x, placed.position.y, placed.rotation);
        for (const cell of cells) {
            occupationMap.set(`${cell.x},${cell.y}`, { placed, itemData });
        }
    }

    for (const placed of placedItems) {
        const itemData = itemsData.find(d => d.id === placed.itemId);
        if (!itemData || !itemData.stars) continue;

        itemData.stars.forEach((star, starIndex) => {
            // オーバーライド対応のヘルパーで絶対座標を取得
            const absPos = getStarAbsolutePos(
                star, itemData.shape,
                placed.position.x, placed.position.y,
                placed.rotation,
            );
            // 星のセル自体を占有しているアイテムを確認 (自分自身は除外)
            if (star.condition.type === 'at_position') {
                const entry = occupationMap.get(`${absPos.x},${absPos.y}`);
                if (entry && entry.placed.id !== placed.id && entry.itemData.tags.includes(star.condition.tag)) {
                    litStars.add(`${placed.id}-${starIndex}`);
                }
            }
        });
    }

    return litStars;
}
