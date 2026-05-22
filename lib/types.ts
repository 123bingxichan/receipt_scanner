export type NecessityLevel = "necessary" | "non_necessary" | "unknown";

export type ItemCategory =
  | "produce"
  | "pantry"
  | "junk_food"
  | "household"
  | "protein"
  | "dairy"
  | "beverage"
  | "other";

export interface ReceiptItem {
  id: string;
  name: string;
  quantityText: string;
  quantityGrams?: number;
  lineTotalCents: number;
  category: ItemCategory;
  necessity: NecessityLevel;
}

export interface ReceiptRecord {
  id: string;
  merchant: string;
  purchasedAt: string;
  totalCents: number;
  items: ReceiptItem[];
  rawOcrText: string;
  createdAt: string;
}
