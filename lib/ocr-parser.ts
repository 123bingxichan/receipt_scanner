export interface ParsedReceiptItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ParsedReceipt {
  merchant: string | null;
  purchasedAt: string | null;
  items: ParsedReceiptItem[];
}

const PRICE_LINE = /^(?<desc>.+?)\s+(?<price>\d+\.\d{2})$/;
const QTY_PATTERN = /(\d+(?:\.\d+)?)\s?(x|ct|lb|kg|oz)\b/i;
const DATE_PATTERN = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/;
const TIME_PATTERN = /(\d{1,2}:\d{2}(?:\s?[AP]M)?)/i;

export function parseReceiptText(fullText: string): ParsedReceipt {
  const lines = fullText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const merchant = lines[0] ?? null;
  const purchasedAt = parseDateTime(lines.join(" "));

  const items: ParsedReceiptItem[] = lines
    .map((line) => parseLineItem(line))
    .filter((item): item is ParsedReceiptItem => item !== null)
    .filter((item) => !isLikelySummaryLine(item.description));

  return { merchant, purchasedAt, items };
}

function parseLineItem(line: string): ParsedReceiptItem | null {
  const matched = line.match(PRICE_LINE);
  if (!matched?.groups) return null;
  const desc = matched.groups.desc.trim();
  const lineTotal = Number(matched.groups.price);
  if (!Number.isFinite(lineTotal)) return null;

  const qtyMatch = desc.match(QTY_PATTERN);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
  const unitPrice = quantity && quantity > 0 ? round2(lineTotal / quantity) : null;

  return {
    description: desc,
    quantity,
    unitPrice,
    lineTotal: round2(lineTotal)
  };
}

function parseDateTime(text: string): string | null {
  const dateMatch = text.match(DATE_PATTERN);
  if (!dateMatch) return null;
  const timeMatch = text.match(TIME_PATTERN);
  return `${dateMatch[1]}${timeMatch ? ` ${timeMatch[1]}` : ""}`;
}

function isLikelySummaryLine(description: string): boolean {
  const lower = description.toLowerCase();
  return ["subtotal", "tax", "total", "balance", "change", "visa", "mastercard"].some((token) =>
    lower.includes(token)
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
