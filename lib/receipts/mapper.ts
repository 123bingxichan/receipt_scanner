import type { ReceiptRecord, ItemCategory, NecessityLevel } from "@/lib/types";

export interface DbLineItem {
  id: string;
  description: string;
  totalCents: number | null;
  quantityText: string | null;
  quantityGrams: number | null;
  category: string;
  necessity: string;
}

export interface DbReceipt {
  id: string;
  merchantName: string | null;
  purchasedAt: Date | null;
  totalCents: number | null;
  rawText: string | null;
  createdAt: Date;
  lineItems: DbLineItem[];
}

export function toReceiptRecord(row: DbReceipt): ReceiptRecord {
  const items = row.lineItems.map((li) => ({
    id: li.id,
    name: li.description,
    quantityText: li.quantityText ?? "",
    quantityGrams: li.quantityGrams ?? undefined,
    lineTotalCents: li.totalCents ?? 0,
    category: li.category as ItemCategory,
    necessity: li.necessity as NecessityLevel
  }));
  return {
    id: row.id,
    merchant: row.merchantName ?? "Unknown merchant",
    purchasedAt: (row.purchasedAt ?? row.createdAt).toISOString(),
    totalCents: row.totalCents ?? items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    items,
    rawOcrText: row.rawText ?? "",
    createdAt: row.createdAt.toISOString()
  };
}

/** Category with the most spend; used to categorize the Expense made on approval. */
export function dominantCategory(items: Array<{ category: string; lineTotalCents: number }>): string {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.lineTotalCents);
  }
  let best = "other";
  let bestCents = -1;
  for (const [name, cents] of totals) {
    if (cents > bestCents) {
      best = name;
      bestCents = cents;
    }
  }
  return best;
}
