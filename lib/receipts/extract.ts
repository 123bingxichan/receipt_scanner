import { inferCategory, inferNecessity } from "@/lib/categorize";
import { parseReceiptText } from "@/lib/ocr-parser";

export interface ExtractedItem {
  description: string;
  quantityText: string | null;
  quantityGrams: number | null;
  totalCents: number;
  category: string;
  necessity: string;
}

export interface ExtractedReceipt {
  merchantName: string | null;
  purchasedAt: Date | null;
  subtotalCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  items: ExtractedItem[];
}

const GRAMS_PER_UNIT: Record<string, number> = { lb: 453.592, kg: 1000, oz: 28.3495 };

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function findAmount(text: string, label: RegExp): number | null {
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(new RegExp(`^${label.source}\\b.*?(\\d+\\.\\d{2})$`, "i"));
    if (m) return toCents(Number(m[m.length - 1]));
  }
  return null;
}

export function parseDate(text: string | null): Date | null {
  if (!text) return null;
  const m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s?([AP]M)?)?/i);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  let hour = m[4] ? Number(m[4]) : 12;
  const minute = m[5] ? Number(m[5]) : 0;
  const meridiem = m[6]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function extractReceipt(fullText: string): ExtractedReceipt {
  const parsed = parseReceiptText(fullText);
  const items: ExtractedItem[] = parsed.items
    .filter((i) => i.lineTotal !== null)
    .map((i) => {
      const qty = i.description.match(/(\d+(?:\.\d+)?)\s?(x|ct|lb|kg|oz)\b/i);
      const unit = qty?.[2].toLowerCase();
      const grams = qty && unit && GRAMS_PER_UNIT[unit] ? Math.round(Number(qty[1]) * GRAMS_PER_UNIT[unit]) : null;
      const name = i.description.replace(/\s*\d+(?:\.\d+)?\s?(x|ct|lb|kg|oz|gal)\b/i, "").trim() || i.description;
      return {
        description: name,
        quantityText: qty ? qty[0] : null,
        quantityGrams: grams,
        totalCents: toCents(i.lineTotal as number),
        category: inferCategory(name),
        necessity: inferNecessity(name)
      };
    });

  const subtotalCents = findAmount(fullText, /sub\s?total/);
  const taxCents = findAmount(fullText, /tax/);
  const totalCents =
    findAmount(fullText, /(?:grand\s+)?total/) ?? (items.length ? items.reduce((s, i) => s + i.totalCents, 0) : null);

  return {
    merchantName: parsed.merchant,
    purchasedAt: parseDate(parsed.purchasedAt),
    subtotalCents,
    taxCents,
    totalCents,
    items
  };
}
