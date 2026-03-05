import { ItemData, PlacedItem, Point } from '../types';

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

        const rows = itemData.shape.length;
        const cols = itemData.shape[0].length;

        itemData.stars.forEach((star, starIndex) => {
            // 星の相対座標を rotation に合わせて変換 (getOccupiedCells と同じ演算)
            const r = star.relativePos.y;
            const c = star.relativePos.x;
            let rotX = c;
            let rotY = r;

            if (placed.rotation === 90) {
                rotX = rows - 1 - r;
                rotY = c;
            } else if (placed.rotation === 180) {
                rotX = cols - 1 - c;
                rotY = rows - 1 - r;
            } else if (placed.rotation === 270) {
                rotX = r;
                rotY = cols - 1 - c;
            }

            const absX = placed.position.x + rotX;
            const absY = placed.position.y + rotY;

            // 4方向の隣接セルを確認
            const adjacentCells = [
                { x: absX + 1, y: absY },
                { x: absX - 1, y: absY },
                { x: absX, y: absY + 1 },
                { x: absX, y: absY - 1 },
            ];

            if (star.condition.type === 'adjacent_tag') {
                for (const adjCell of adjacentCells) {
                    const entry = occupationMap.get(`${adjCell.x},${adjCell.y}`);
                    // 自分自身のセルは除外
                    if (entry && entry.placed.id !== placed.id && entry.itemData.tags.includes(star.condition.tag)) {
                        litStars.add(`${placed.id}-${starIndex}`);
                        break;
                    }
                }
            }
        });
    }

    return litStars;
}
