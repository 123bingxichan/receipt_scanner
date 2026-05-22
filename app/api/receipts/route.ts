import { NextRequest, NextResponse } from "next/server";

interface StoredItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
}

interface StoredReceipt {
  id: string;
  merchant: string | null;
  purchasedAt: string | null;
  rawText: string;
  items: StoredItem[];
  createdAt: string;
}

const store: StoredReceipt[] = [];

export async function GET() {
  return NextResponse.json({ receipts: store });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Omit<StoredReceipt, "id" | "createdAt">;
  const receipt: StoredReceipt = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...body
  };
  store.unshift(receipt);
  return NextResponse.json({ receipt }, { status: 201 });
}
