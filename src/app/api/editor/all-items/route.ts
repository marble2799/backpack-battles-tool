import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { HARDCODED_ITEMS } from "@/src/data";
import { ItemData } from "@/src/types";

const DATA_FILE = path.join(process.cwd(), "src", "data", "editor-items.json");

function readEditorItems(): ItemData[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ItemData[];
  } catch {
    return [];
  }
}

export async function GET() {
  const editorItems = readEditorItems();
  const editorIds = new Set(editorItems.map((i) => i.id));

  const all: ItemData[] = [
    ...HARDCODED_ITEMS.filter((i) => !editorIds.has(i.id)),
    ...editorItems,
  ];

  return NextResponse.json(all);
}
