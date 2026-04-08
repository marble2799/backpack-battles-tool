import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ItemData } from "@/src/types";

const DATA_FILE = path.join(process.cwd(), "src", "data", "editor-items.json");

function readItems(): ItemData[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ItemData[];
  } catch {
    return [];
  }
}

function writeItems(items: ItemData[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2) + "\n", "utf-8");
}

export async function GET() {
  const items = readItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.id || !body.name || !body.shape) {
    return NextResponse.json(
      { error: "id, name, shape は必須です" },
      { status: 400 }
    );
  }

  const items = readItems();

  if (items.some((item) => item.id === body.id)) {
    return NextResponse.json(
      { error: `id "${body.id}" は既に存在します` },
      { status: 409 }
    );
  }

  const newItem: ItemData = {
    id: body.id,
    name: body.name,
    shape: body.shape,
    color: body.color ?? "#6b7280",
    tags: body.tags ?? [],
    attributes: body.attributes,
    stars: body.stars ?? [],
  };

  items.push(newItem);
  writeItems(items);

  return NextResponse.json(newItem, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (!body.id || !body.name || !body.shape) {
    return NextResponse.json(
      { error: "id, name, shape は必須です" },
      { status: 400 }
    );
  }

  const items = readItems();
  const idx = items.findIndex((item) => item.id === body.id);

  if (idx === -1) {
    return NextResponse.json(
      { error: `id "${body.id}" が見つかりません` },
      { status: 404 }
    );
  }

  const updated: ItemData = {
    id: body.id,
    name: body.name,
    shape: body.shape,
    color: body.color ?? "#6b7280",
    tags: body.tags ?? [],
    attributes: body.attributes,
    stars: body.stars ?? [],
  };

  items[idx] = updated;
  writeItems(items);

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  const items = readItems();
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) {
    return NextResponse.json(
      { error: `id "${id}" が見つかりません` },
      { status: 404 }
    );
  }

  writeItems(filtered);
  return NextResponse.json({ success: true });
}
